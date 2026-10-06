import assert from 'node:assert/strict';
import test from 'node:test';
import { prisma } from '../src/lib/prisma';
import { cancelShipment, createShipment, handOver, recordManualStatus, setBarcode, trackOpenShipments } from '../src/lib/shipping/service';
import { applyOrderChanges } from '../src/lib/admin/order-updates';
import type { CarrierAdapter, CarrierEvent, ShipmentRequest } from '../src/lib/shipping/carrier';
import { PATCH as patchShipment } from '../src/app/api/admin/shipments/[id]/route';
import { POST as createRoute } from '../src/app/api/admin/shipments/route';
import { GET as cronRoute } from '../src/app/api/cron/shipments/route';

const actor = { userId: 'admin-ship-test', email: 'admin@test.local' };
const stamp = `${Date.now()}`;
const SENDER = { senderName: 'Pandiones Test', senderPhone: '0555 555 55 55', senderAddress: 'Atatürk Blv. No 1', senderDistrict: 'Çankaya', senderCity: 'Ankara' };

async function withSender(t: { after(fn: () => unknown): void }, sender: Partial<typeof SENDER> | null) {
  const before = await prisma.storeSettings.findUnique({ where: { id: 'store' } });
  const data = sender ?? { senderName: null, senderPhone: null, senderAddress: null, senderDistrict: null, senderCity: null };
  await prisma.storeSettings.upsert({
    where: { id: 'store' },
    create: { id: 'store', storeName: 'Pandiones', contactEmail: 'destek@pandiones.com', seoTitle: 'P', seoDescription: 'P', ...data },
    update: data,
  });
  t.after(async () => {
    if (before) await prisma.storeSettings.update({ where: { id: 'store' }, data: { senderName: before.senderName, senderPhone: before.senderPhone, senderAddress: before.senderAddress, senderDistrict: before.senderDistrict, senderCity: before.senderCity } });
    else await prisma.storeSettings.delete({ where: { id: 'store' } }).catch(() => {});
  });
}

async function paidOrder(t: { after(fn: () => unknown): void }, suffix: string) {
  const order = await prisma.order.create({
    data: {
      orderNumber: `PAN-SHIPF-${stamp}-${suffix}`,
      customerName: 'Defne Kaya',
      customerEmail: `defne-${stamp}-${suffix}@example.com`,
      customerPhone: '05553334455',
      shippingAddress: 'Kızılay Mah. 1',
      shippingCity: 'Ankara',
      shippingDistrict: 'Çankaya',
      totalAmount: 900,
      status: 'ODENDI',
    },
  });
  t.after(async () => {
    await prisma.auditLog.deleteMany({ where: { entity: 'order', entityId: order.id } }).catch(() => {});
    await prisma.order.delete({ where: { id: order.id } }).catch(() => {});
  });
  return order;
}

test('manual PTT flow: label → barcode → hand-over → delivery keeps order and shipment in step', async (t) => {
  await withSender(t, SENDER);
  const order = await paidOrder(t, 'A');

  const shipment = await createShipment(prisma, actor, { orderId: order.id, desi: 2, pieces: 1, weightKg: null });
  assert.equal(shipment.status, 'ETIKET_HAZIR');
  assert.equal(shipment.mode, 'MANUAL');
  assert.equal(shipment.reference, `${order.orderNumber}-1`);
  assert.equal((await prisma.order.findUnique({ where: { id: order.id } }))?.status, 'HAZIRLANIYOR');
  await assert.rejects(() => createShipment(prisma, actor, { orderId: order.id, desi: 1, pieces: 1, weightKg: null }), /zaten/);

  await assert.rejects(() => handOver(prisma, actor, shipment.id), /barkod/i);
  await assert.rejects(() => setBarcode(prisma, actor, shipment.id, '12'), /6–40/);
  await setBarcode(prisma, actor, shipment.id, 'KP0123456789');
  const withCode = await prisma.order.findUnique({ where: { id: order.id } });
  assert.equal(withCode?.trackingCode, 'KP0123456789');
  assert.equal(withCode?.trackingCompany, 'PTT Kargo');

  const handed = await handOver(prisma, actor, shipment.id);
  assert.deepEqual(handed.emails.sent, [order.orderNumber]);
  assert.equal((await prisma.shipment.findUnique({ where: { id: shipment.id } }))?.status, 'KABUL');
  assert.equal((await prisma.order.findUnique({ where: { id: order.id } }))?.status, 'KARGODA');

  await assert.rejects(() => recordManualStatus(prisma, actor, shipment.id, 'ETIKET_HAZIR', null));
  await recordManualStatus(prisma, actor, shipment.id, 'DAGITIMDA', null);
  await recordManualStatus(prisma, actor, shipment.id, 'TESLIM_EDILDI', 'Alıcı imzaladı');
  assert.equal((await prisma.order.findUnique({ where: { id: order.id } }))?.status, 'TESLIM_EDILDI');
  const events = await prisma.shipmentEvent.findMany({ where: { shipmentId: shipment.id }, orderBy: { at: 'asc' } });
  assert.ok(events.length >= 5);
  await assert.rejects(() => cancelShipment(prisma, actor, shipment.id), /kargoya verilmemiş/);
});

test('no label without a complete sender; the order screens move the shipment too', async (t) => {
  await withSender(t, null);
  const order = await paidOrder(t, 'B');
  await assert.rejects(() => createShipment(prisma, actor, { orderId: order.id, desi: 1, pieces: 1, weightKg: null }), /gönderici/);

  await prisma.storeSettings.update({ where: { id: 'store' }, data: SENDER });
  const shipment = await createShipment(prisma, actor, { orderId: order.id, desi: 1, pieces: 1, weightKg: 0.4 });
  // Tracking number and Kargoda from the order list / tracking import.
  await applyOrderChanges(prisma, actor, [{ id: order.id, trackingCompany: 'PTT Kargo', trackingCode: 'KP9988776655', status: 'KARGODA' }]);
  const synced = await prisma.shipment.findUnique({ where: { id: shipment.id } });
  assert.equal(synced?.barcode, 'KP9988776655');
  assert.equal(synced?.status, 'KABUL');
});

test('cancel before hand-over clears the tracking number', async (t) => {
  await withSender(t, SENDER);
  const order = await paidOrder(t, 'C');
  const shipment = await createShipment(prisma, actor, { orderId: order.id, desi: 1, pieces: 1, weightKg: null });
  await setBarcode(prisma, actor, shipment.id, 'KP1111222233');
  await cancelShipment(prisma, actor, shipment.id);
  assert.equal((await prisma.shipment.findUnique({ where: { id: shipment.id } }))?.status, 'IPTAL');
  assert.equal((await prisma.order.findUnique({ where: { id: order.id } }))?.trackingCode, null);
  // A new shipment can be created after a cancel.
  const again = await createShipment(prisma, actor, { orderId: order.id, desi: 1, pieces: 1, weightKg: null });
  assert.equal(again.reference, `${order.orderNumber}-2`);
});

test('API mode: barcode upload goes to the carrier; tracking applies new movements once', async (t) => {
  await withSender(t, SENDER);
  const order = await paidOrder(t, 'D');
  const uploaded: ShipmentRequest[] = [];
  let movements: CarrierEvent[] = [];
  const fake: CarrierAdapter = {
    name: 'PTT',
    mode: 'API',
    async registerShipment(request) {
      uploaded.push(request);
    },
    async cancelShipment() {},
    async track() {
      return movements;
    },
  };
  const shipment = await createShipment(prisma, actor, { orderId: order.id, desi: 3, pieces: 2, weightKg: 1.2 });
  await setBarcode(prisma, actor, shipment.id, 'KP5555666677', fake);
  assert.equal(uploaded.length, 1);
  assert.equal(uploaded[0].recipient.city, 'Ankara');
  assert.equal(uploaded[0].sender.name, 'Pandiones Test');
  assert.equal((await prisma.shipment.findUnique({ where: { id: shipment.id } }))?.mode, 'API');

  await prisma.shipment.update({ where: { id: shipment.id }, data: { status: 'KABUL' } });
  movements = [
    { at: new Date('2026-10-11T06:05:00Z'), code: null, description: 'Kabul edildi', location: 'Kızılay', status: 'KABUL' },
    { at: new Date('2026-10-12T07:00:00Z'), code: null, description: 'Dağıtıma çıkarıldı', location: 'Çankaya', status: 'DAGITIMDA' },
  ];
  const first = await trackOpenShipments(prisma, fake);
  assert.equal(first.events, 2);
  assert.equal((await prisma.shipment.findUnique({ where: { id: shipment.id } }))?.status, 'DAGITIMDA');

  movements = [...movements, { at: new Date('2026-10-12T13:40:00Z'), code: null, description: 'Alıcıya teslim edildi', location: 'Çankaya', status: 'TESLIM_EDILDI' }];
  await prisma.order.update({ where: { id: order.id }, data: { status: 'KARGODA' } });
  const second = await trackOpenShipments(prisma, fake);
  assert.equal(second.events, 1, 'already stored movements are skipped');
  assert.equal((await prisma.order.findUnique({ where: { id: order.id } }))?.status, 'TESLIM_EDILDI');

  const manual = await trackOpenShipments(prisma, { ...fake, mode: 'MANUAL' });
  assert.equal(manual.checked, 0);
});

test('shipment routes refuse anonymous callers; cron needs its secret', async () => {
  const params = { params: Promise.resolve({ id: 'x' }) };
  const json = (url: string, method = 'POST') => new Request(url, { method, body: '{}', headers: { 'Content-Type': 'application/json' } });
  assert.equal((await createRoute(json('http://localhost/api/admin/shipments'))).status, 403);
  assert.equal((await patchShipment(json('http://localhost/api/admin/shipments/x', 'PATCH'), params)).status, 403);
  assert.equal((await cronRoute(new Request('http://localhost/api/cron/shipments'))).status, 401);
});
