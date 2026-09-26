import assert from 'node:assert/strict';
import test from 'node:test';
import { GET as getOrderHandler } from '../src/app/api/orders/[id]/route';
import { signSession, generateOrderGuestToken } from '../src/lib/auth';
import { prisma } from '../src/lib/prisma';

test('order route blocks unauthorized anonymous visitors and rejects IDOR', async () => {
  const orderNumber = `PAN-AUTH-${Date.now()}`;
  const order = await prisma.order.create({
    data: {
      orderNumber,
      customerName: 'Gizli Müşteri',
      customerEmail: 'gizli@example.com',
      customerPhone: '05551112233',
      shippingAddress: 'Çok Gizli Adres Mah. No: 1',
      shippingCity: 'İstanbul',
      shippingDistrict: 'Beşiktaş',
      totalAmount: 2500,
      status: 'ODENDI',
    },
  });

  const params = { params: Promise.resolve({ id: order.orderNumber }) };

  // 1. Anonymous visitor without token
  const reqAnon = new Request(`http://localhost:3000/api/orders/${order.orderNumber}`);
  const resAnon = await getOrderHandler(reqAnon, params);
  assert.equal(resAnon.status, 403, 'Anonymous visitor without token must be forbidden (403)');

  // 2. Caller with invalid/forged token
  const reqForged = new Request(`http://localhost:3000/api/orders/${order.orderNumber}?token=fake_token_123`);
  const resForged = await getOrderHandler(reqForged, params);
  assert.equal(resForged.status, 403, 'Visitor with forged token must be forbidden (403)');

  // 3. Caller with valid guest token for this order
  const validToken = generateOrderGuestToken(order.orderNumber);
  const reqValidGuest = new Request(`http://localhost:3000/api/orders/${order.orderNumber}?token=${validToken}`);
  const resValidGuest = await getOrderHandler(reqValidGuest, params);
  assert.equal(resValidGuest.status, 200, 'Guest with valid cryptographic token must be allowed (200)');
  const guestData = await resValidGuest.json();
  assert.equal(guestData.orderNumber, order.orderNumber);

  // 4. Token from a different order cannot access this order
  const otherToken = generateOrderGuestToken('PAN-ANOTHER-999');
  const reqOther = new Request(`http://localhost:3000/api/orders/${order.orderNumber}?token=${otherToken}`);
  const resOther = await getOrderHandler(reqOther, params);
  assert.equal(resOther.status, 403, 'Token from another order must be forbidden (403)');

  // 5. Non-existent order returns 404
  const notFoundParams = { params: Promise.resolve({ id: 'PAN-DOES-NOT-EXIST' }) };
  const reqNotFound = new Request(`http://localhost:3000/api/orders/PAN-DOES-NOT-EXIST`);
  const resNotFound = await getOrderHandler(reqNotFound, notFoundParams);
  assert.equal(resNotFound.status, 404);

  // Cleanup
  await prisma.order.delete({ where: { id: order.id } });
});
