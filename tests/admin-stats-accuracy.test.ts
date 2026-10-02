import test from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../src/lib/prisma';
import { signSession } from './helpers/session';
import { GET as getStats } from '../src/app/api/admin/stats/route';

test('admin stats route calculates revenue strictly from paid orders and returns operational counts', async (t) => {
  // 1. Create an admin user
  const adminUser = await prisma.user.create({
    data: {
      email: `admin-stats-${Date.now()}@pandiones.com`,
      name: 'Yönetici Stats Test',
      passwordHash: 'hashed',
      role: 'ADMIN',
    },
  });
  // Remove the test admin even if an assertion below fails.
  t.after(() => prisma.user.delete({ where: { id: adminUser.id } }).catch(() => {}));
  const adminToken = await signSession({
    userId: adminUser.id,
    email: adminUser.email,
    name: adminUser.name,
    role: 'ADMIN',
  });
  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${adminToken}`,
  };

  // 2. Fetch baseline stats
  const baseRes = await getStats(new Request('http://localhost/api/admin/stats', { headers: authHeaders }));
  assert.equal(baseRes.status, 200);
  const baseStats = await baseRes.json();

  // 3. Create an unpaid order (ODEME_BEKLENIYOR) with 99999 TL
  const unpaidOrder = await prisma.order.create({
    data: {
      orderNumber: `PAN-UNPAID-${Date.now()}`,
      customerName: 'Unpaid Customer',
      customerEmail: 'unpaid@example.com',
      customerPhone: '05550001122',
      shippingAddress: 'Deneme',
      shippingCity: 'Ankara',
      shippingDistrict: 'Çankaya',
      totalAmount: 99999,
      status: 'ODEME_BEKLENIYOR',
    },
  });

  // 4. Create a paid order (ODENDI) with 5000 TL
  const paidOrder = await prisma.order.create({
    data: {
      orderNumber: `PAN-PAID-${Date.now()}`,
      customerName: 'Paid Customer',
      customerEmail: 'paid@example.com',
      customerPhone: '05550001133',
      shippingAddress: 'Deneme',
      shippingCity: 'İzmir',
      shippingDistrict: 'Konak',
      totalAmount: 5000,
      status: 'ODENDI',
    },
  });

  // 5. Fetch updated stats
  const afterRes = await getStats(new Request('http://localhost/api/admin/stats', { headers: authHeaders }));
  assert.equal(afterRes.status, 200);
  const afterStats = await afterRes.json();

  // Revenue must have increased ONLY by the paid order amount (5000), NOT by the unpaid order (99999)
  assert.equal(afterStats.totalRevenue, baseStats.totalRevenue + 5000);
  assert.equal(afterStats.totalOrders, baseStats.totalOrders + 2);
  assert.equal(afterStats.paidOrdersCount, baseStats.paidOrdersCount + 1);
  assert.ok(afterStats.aov > 0);

  // Clean up
  await prisma.order.deleteMany({ where: { id: { in: [unpaidOrder.id, paidOrder.id] } } });
});
