import assert from 'node:assert/strict';
import test from 'node:test';
import { prisma } from '../src/lib/prisma';
import { GET as listOrders, PATCH as updateOrders } from '../src/app/api/admin/orders/route';
import { GET as orderDetail } from '../src/app/api/admin/orders/[id]/route';
import { POST as importTracking } from '../src/app/api/admin/orders/tracking-import/route';
import { parseTrackingCsv, normalizeCarrier } from '../src/lib/admin/tracking-csv';
import { parseOrderQuery } from '../src/lib/admin/order-query';
import { CARRIERS } from '../src/lib/orders/transitions';
import { getInMemoryEmailSender } from '../src/lib/email/provider';
import { signSession } from './helpers/session';

const stamp = `${Date.now()}`;
const prefix = `PAN-FLOW-${stamp}`;

async function setup(t: { after(fn: () => unknown): void }) {
  const admin = await prisma.user.create({ data: { email: `admin-flow-${stamp}@pandiones.com`, name: 'Yönetici', passwordHash: 'x', role: 'ADMIN' } });
  const customer = await prisma.user.create({ data: { email: `customer-flow-${stamp}@example.com`, name: 'Müşteri', passwordHash: 'x', role: 'CUSTOMER' } });
  const base = {
    customerName: 'Defne Kaya',
    customerEmail: `defne-${stamp}@example.com`,
    customerPhone: '05553334455',
    shippingAddress: 'Abdi İpekçi Cad. No: 12',
    shippingCity: 'Ankara',
    shippingDistrict: 'Çankaya',
    totalAmount: 1200,
  };
  const make = (suffix: string, status: string, extra: Record<string, unknown> = {}) =>
    prisma.order.create({ data: { ...base, orderNumber: `${prefix}-${suffix}`, status, ...extra } });
  const orders = {
    paid: await make('PAID', 'ODENDI'),
    preparing: await make('PREP', 'HAZIRLANIYOR'),
    shipped: await make('SHIP', 'KARGODA', { trackingCompany: 'Aras Kargo', trackingCode: 'AR-123456' }),
    delivered: await make('DONE', 'TESLIM_EDILDI', { trackingCompany: 'Aras Kargo', trackingCode: 'AR-654321' }),
    pending: await make('WAIT', 'ODEME_BEKLENIYOR'),
  };
  t.after(async () => {
    const ids = Object.values(orders).map((order) => order.id);
    await prisma.auditLog.deleteMany({ where: { entity: 'order', entityId: { in: ids } } }).catch(() => {});
    await prisma.order.deleteMany({ where: { id: { in: ids } } }).catch(() => {});
    await prisma.user.deleteMany({ where: { id: { in: [admin.id, customer.id] } } }).catch(() => {});
  });
  const adminToken = await signSession({ userId: admin.id, role: 'ADMIN' });
  const customerToken = await signSession({ userId: customer.id, role: 'CUSTOMER' });
  return { orders, adminToken, customerToken };
}

const patch = (token: string, body: unknown) =>
  updateOrders(new Request('http://localhost/api/admin/orders', { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) }));

test('list is filtered and paged on the server; customers are refused', async (t) => {
  const { adminToken, customerToken } = await setup(t);
  const get = (token: string, query: string) => listOrders(new Request(`http://localhost/api/admin/orders?${query}`, { headers: { Authorization: `Bearer ${token}` } }));

  assert.equal((await get(customerToken, 'q=x')).status, 403);

  const all = await (await get(adminToken, `q=${prefix}&pageSize=10`)).json();
  assert.equal(all.total, 5);
  assert.equal(all.orders.length, 5);
  assert.ok(all.counts.all >= 5);
  assert.ok(Array.isArray(all.months));

  const pending = await (await get(adminToken, `q=${prefix}&status=PENDING_FULFILLMENT`)).json();
  assert.deepEqual(pending.orders.map((o: { status: string }) => o.status).sort(), ['HAZIRLANIYOR', 'ODENDI']);

  const missing = await (await get(adminToken, `q=${prefix}&status=MISSING_TRACKING`)).json();
  assert.equal(missing.total, 2);

  const paged = await (await get(adminToken, `q=${prefix}&pageSize=10&page=2`)).json();
  assert.equal(paged.orders.length, 0);

  const carrier = await (await get(adminToken, `q=${prefix}&carrier=${encodeURIComponent('Aras Kargo')}`)).json();
  assert.equal(carrier.total, 2);

  const noCounts = await (await get(adminToken, `q=${prefix}&counts=false`)).json();
  assert.equal(noCounts.total, 5);
  assert.equal(noCounts.orders.length, 5);
  assert.deepEqual(noCounts.counts, {});
  assert.deepEqual(noCounts.months, []);
});

test('query parsing falls back to safe defaults', () => {
  const query = parseOrderQuery(new URLSearchParams('status=DROP&pageSize=9999&page=-3&month=2026-13&carrier=X&sort=evil'));
  assert.deepEqual(query, { status: 'ALL', carrier: null, month: null, range: null, q: '', page: 1, pageSize: 15, sort: 'new' });
});

test('transition rules are enforced: single 409, batch skipped', async (t) => {
  const { orders, adminToken } = await setup(t);

  const back = await patch(adminToken, { orderId: orders.delivered.id, status: 'KARGODA' });
  assert.equal(back.status, 409);
  assert.match((await back.json()).error, /geri alınamaz/);

  const noCode = await patch(adminToken, { orderId: orders.preparing.id, status: 'KARGODA' });
  assert.equal(noCode.status, 409);

  const unpaid = await patch(adminToken, { orderId: orders.pending.id, status: 'ODENDI' });
  assert.equal(unpaid.status, 409);

  const badCarrier = await patch(adminToken, { orderId: orders.paid.id, trackingCompany: 'Bilinmeyen', trackingCode: 'XX-123456' });
  assert.equal(badCarrier.status, 409);

  const batch = await patch(adminToken, { orderIds: [orders.paid.id, orders.delivered.id, orders.pending.id], status: 'HAZIRLANIYOR' });
  assert.equal(batch.status, 200);
  const body = await batch.json();
  assert.equal(body.updatedCount, 1);
  assert.equal(body.skipped.length, 2);
  assert.equal((await prisma.order.findUnique({ where: { id: orders.delivered.id } }))?.status, 'TESLIM_EDILDI');

  const undo = await patch(adminToken, { orderId: orders.paid.id, status: 'ODENDI' });
  assert.equal(undo.status, 200);
});

test('shipping e-mail outcome is reported and lands in the order timeline', async (t) => {
  const { orders, adminToken } = await setup(t);
  const sender = getInMemoryEmailSender();
  const original = sender.send.bind(sender);
  sender.send = async () => ({ success: false, error: 'provider down' });
  t.after(() => {
    sender.send = original;
  });

  const res = await patch(adminToken, { orderId: orders.preparing.id, status: 'KARGODA', trackingCompany: 'Yurtiçi Kargo', trackingCode: 'YK-11223344' });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.deepEqual(body.emails.failed, [orders.preparing.orderNumber]);

  const detail = await orderDetail(new Request(`http://localhost/api/admin/orders/${orders.preparing.id}`, { headers: { Authorization: `Bearer ${adminToken}` } }), {
    params: Promise.resolve({ id: orders.preparing.id }),
  });
  const { timeline } = await detail.json();
  const kinds = timeline.map((entry: { kind: string }) => entry.kind);
  assert.equal(kinds[0], 'created');
  assert.ok(kinds.includes('status'));
  const email = timeline.find((entry: { kind: string }) => entry.kind === 'email');
  assert.equal(email.tone, 'danger');
});

test('tracking import checks every row first, then writes only the valid ones', async (t) => {
  const { orders, adminToken } = await setup(t);
  getInMemoryEmailSender().clear();
  const send = (body: unknown) =>
    importTracking(new Request('http://localhost/api/admin/orders/tracking-import', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` }, body: JSON.stringify(body) }));

  const rows = [
    { line: 2, orderNumber: orders.paid.orderNumber, company: 'yurtici', code: 'YK-99887766' },
    { line: 3, orderNumber: orders.pending.orderNumber, company: 'MNG', code: 'MN-12345678' },
    { line: 4, orderNumber: `${prefix}-NONE`, company: 'PTT', code: 'KP123456789' },
    { line: 5, orderNumber: orders.preparing.orderNumber, company: 'Aras', code: '12' },
  ];

  const preview = await (await send({ rows, ship: true, dryRun: true })).json();
  assert.equal(preview.dryRun, true);
  assert.deepEqual(preview.results.map((r: { ok: boolean }) => r.ok), [true, false, false, false]);
  assert.equal((await prisma.order.findUnique({ where: { id: orders.paid.id } }))?.trackingCode, null);

  const applied = await (await send({ rows, ship: true, dryRun: false })).json();
  assert.equal(applied.results[0].ok, true);
  assert.equal(applied.results[0].emailSent, true);
  const saved = await prisma.order.findUnique({ where: { id: orders.paid.id } });
  assert.equal(saved?.status, 'KARGODA');
  assert.equal(saved?.trackingCompany, 'Yurtiçi Kargo');
});

test('tracking sheet parsing', () => {
  const parsed = parseTrackingCsv('﻿Sipariş No;Kargo;Takip No\n#PAN-1;Yurtiçi Kargo;YK-1234567\n\nPAN-2;"MNG; Kargo";MN-7654321\nPAN-3;Aras\n');
  assert.deepEqual(parsed.rows.map((row) => row.orderNumber), ['PAN-1', 'PAN-2']);
  assert.equal(parsed.rows[1].company, 'MNG; Kargo');
  assert.deepEqual(parsed.errors.map((error) => error.line), [5]);
  assert.equal(normalizeCarrier('yurtici', CARRIERS), 'Yurtiçi Kargo');
  assert.equal(normalizeCarrier('SÜRAT KARGO', CARRIERS), 'Sürat Kargo');
  assert.equal(normalizeCarrier('Bilinmeyen', CARRIERS), 'Bilinmeyen');
});
