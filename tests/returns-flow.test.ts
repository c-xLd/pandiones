import assert from 'node:assert/strict';
import test from 'node:test';
import { POST as createReturn, GET as listReturns } from '../src/app/api/returns/route';
import { prisma } from '../src/lib/prisma';

test('returns route rejects unauthenticated GET with 401', async () => {
  const res = await listReturns();
  assert.equal(res.status, 401);
});

test('returns route handles orderNumber resolution, unpaid status rejection, and duplicate prevention', async () => {
  const orderNumber = `PAN-RET-${Date.now()}`;
  const order = await prisma.order.create({
    data: {
      orderNumber,
      customerName: 'İade Müşterisi',
      customerEmail: 'iade@example.com',
      customerPhone: '05559998877',
      shippingAddress: 'İade Adresi',
      shippingCity: 'Ankara',
      shippingDistrict: 'Çankaya',
      totalAmount: 1500,
      status: 'ODEME_BEKLENIYOR', // Unpaid initially
    },
  });

  const jsonReq = (body: Record<string, unknown>) =>
    new Request('http://localhost:3000/api/returns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

  // 1. Try to create return for unpaid order
  const resUnpaid = await createReturn(
    jsonReq({
      orderId: order.orderNumber, // using orderNumber
      customerEmail: 'iade@example.com',
      reason: 'Beden uymadı',
    })
  );
  assert.equal(resUnpaid.status, 400);
  const dataUnpaid = await resUnpaid.json();
  assert.match(dataUnpaid.error, /ödemesi tamamlanmamış/i);

  // 2. Update order to ODENDI
  await prisma.order.update({
    where: { id: order.id },
    data: { status: 'ODENDI' },
  });

  // 3. Email mismatch
  const resMismatch = await createReturn(
    jsonReq({
      orderId: order.orderNumber,
      customerEmail: 'baskasi@example.com',
      reason: 'Beden uymadı',
    })
  );
  assert.equal(resMismatch.status, 404, 'eşleşmeyen e-posta, olmayan siparişle aynı yanıtı alır');

  // 4. Successful return creation using orderNumber
  const resSuccess = await createReturn(
    jsonReq({
      orderId: order.orderNumber,
      customerEmail: 'iade@example.com',
      reason: 'Beden uymadı, bir beden büyüğü ile değiştirmek istiyorum',
    })
  );
  assert.equal(resSuccess.status, 200);
  const dataSuccess = await resSuccess.json();
  assert.ok(dataSuccess.returnRequest);
  assert.equal(dataSuccess.returnRequest.status, 'BEKLIYOR');

  // 5. Try creating a second return request while first is BEKLIYOR (Duplicate prevention)
  const resDuplicate = await createReturn(
    jsonReq({
      orderId: order.orderNumber,
      customerEmail: 'iade@example.com',
      reason: 'İkinci kez başvuru',
    })
  );
  assert.equal(resDuplicate.status, 409);
  const dataDuplicate = await resDuplicate.json();
  assert.match(dataDuplicate.error, /aktif bir iade talebiniz bulunmaktadır/i);

  // Cleanup
  await prisma.returnRequest.deleteMany({ where: { orderId: order.id } });
  await prisma.order.delete({ where: { id: order.id } });
});
