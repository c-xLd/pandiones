import assert from 'node:assert/strict';
import test from 'node:test';
import { GET as getOrderHandler } from '../src/app/api/orders/[id]/route';
import { GUEST_ORDER_COOKIE, generateOrderGuestToken } from '../src/lib/auth';
import { signSession } from './helpers/session';
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
      totalKurus: 250000,
      status: 'ODENDI',
    },
  });

  const params = { params: Promise.resolve({ id: order.orderNumber }) };

  // Every refusal looks like a missing order (404), so order numbers cannot be probed.
  const resAnon = await getOrderHandler(new Request(`http://localhost:3000/api/orders/${order.orderNumber}`), params);
  assert.equal(resAnon.status, 404, 'oturumsuz ziyaretçi göremez');

  const forged = new Request(`http://localhost:3000/api/orders/${order.orderNumber}`, { headers: { Cookie: `${GUEST_ORDER_COOKIE}=fake_token_123` } });
  assert.equal((await getOrderHandler(forged, params)).status, 404, 'sahte çerez reddedilir');

  // A token in the URL is no longer accepted (URLs leak through history, logs and Referer).
  const validToken = generateOrderGuestToken(order.orderNumber);
  const viaUrl = new Request(`http://localhost:3000/api/orders/${order.orderNumber}?token=${validToken}`);
  assert.equal((await getOrderHandler(viaUrl, params)).status, 404, 'URL belirteci kabul edilmez');

  // The guest cookie set at checkout opens the order — without internal fields.
  const viaCookie = new Request(`http://localhost:3000/api/orders/${order.orderNumber}`, { headers: { Cookie: `${GUEST_ORDER_COOKIE}=${validToken}` } });
  const resGuest = await getOrderHandler(viaCookie, params);
  assert.equal(resGuest.status, 200);
  const guestData = await resGuest.json();
  assert.equal(guestData.orderNumber, order.orderNumber);
  assert.equal('adminNotes' in guestData, false, 'yönetici notu dönmez');
  assert.equal('userId' in guestData, false);

  const otherToken = generateOrderGuestToken('PAN-ANOTHER-999');
  const otherCookie = new Request(`http://localhost:3000/api/orders/${order.orderNumber}`, { headers: { Cookie: `${GUEST_ORDER_COOKIE}=${otherToken}` } });
  assert.equal((await getOrderHandler(otherCookie, params)).status, 404, 'başka siparişin çerezi açmaz');

  // 5. Non-existent order returns 404
  const notFoundParams = { params: Promise.resolve({ id: 'PAN-DOES-NOT-EXIST' }) };
  const reqNotFound = new Request(`http://localhost:3000/api/orders/PAN-DOES-NOT-EXIST`);
  const resNotFound = await getOrderHandler(reqNotFound, notFoundParams);
  assert.equal(resNotFound.status, 404);

  // Cleanup
  await prisma.order.delete({ where: { id: order.id } });
});
