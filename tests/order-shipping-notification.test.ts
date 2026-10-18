import test from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../src/lib/prisma';
import { PATCH as updateOrderAdmin } from '../src/app/api/admin/orders/route';
import { signSession } from './helpers/session';
import { getInMemoryEmailSender } from '../src/lib/email/provider';

test('admin shipping update notifies customer with tracking code and company', async (t) => {
  const sender = getInMemoryEmailSender();
  sender.clear();

  // 1. Create admin user
  const adminUser = await prisma.user.create({
    data: {
      email: `admin-ship-${Date.now()}@pandiones.com`,
      name: 'Yönetici Test',
      passwordHash: 'hashed_password',
      role: 'ADMIN',
    },
  });
  // Remove the test admin even if an assertion below fails.
  t.after(() => prisma.user.deleteMany({ where: { id: adminUser.id } }));
  const adminToken = await signSession({
    userId: adminUser.id,
    email: adminUser.email,
    name: adminUser.name,
    role: 'ADMIN',
  });

  // 2. Create customer order
  const customerEmail = `customer-ship-${Date.now()}@example.com`;
  const order = await prisma.order.create({
    data: {
      orderNumber: `PAN-SHIP-${Date.now()}`,
      customerName: 'Defne Kaya',
      customerEmail,
      customerPhone: '05553334455',
      shippingAddress: 'Nişantaşı Abdi İpekçi Cad. No: 12',
      shippingCity: 'İstanbul',
      shippingDistrict: 'Şişli',
      totalKurus: 340000,
      status: 'ODENDI',
    },
  });
  t.after(() => prisma.order.deleteMany({ where: { id: order.id } }));

  // 3. Anonymous PATCH is blocked
  const anonReq = new Request('http://localhost:3000/api/admin/orders', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      orderId: order.id,
      status: 'KARGODA',
      trackingCompany: 'Yurtiçi Kargo',
      trackingCode: 'YK-11223344',
    }),
  });
  const anonRes = await updateOrderAdmin(anonReq);
  assert.equal(anonRes.status, 403);

  // 4. Authenticated ADMIN PATCH updates order and triggers shipping email
  const authReq = new Request('http://localhost:3000/api/admin/orders', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      orderId: order.id,
      status: 'KARGODA',
      trackingCompany: 'Yurtiçi Kargo',
      trackingCode: 'YK-11223344',
    }),
  });
  const authRes = await updateOrderAdmin(authReq);
  assert.equal(authRes.status, 200);

  // Check DB status
  const updatedOrder = await prisma.order.findUnique({ where: { id: order.id } });
  assert.equal(updatedOrder?.status, 'KARGODA');
  assert.equal(updatedOrder?.trackingCode, 'YK-11223344');
  assert.equal(updatedOrder?.trackingCompany, 'Yurtiçi Kargo');

  // Check email sent
  const sentEmails = sender.getSentEmails();
  const shippingEmail = sentEmails.find((e) => e.to === customerEmail);
  assert.ok(shippingEmail, 'Expected shipping email to be sent');
  assert.match(shippingEmail!.subject, /Yola Çıktı/);
  assert.match(shippingEmail!.html, /YK-11223344/);
  assert.match(shippingEmail!.html, /Yurtiçi Kargo/);

  // Cleanup
  await prisma.order.deleteMany({ where: { id: order.id } });
  await prisma.user.deleteMany({ where: { id: adminUser.id } });
});
