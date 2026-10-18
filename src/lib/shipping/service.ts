import type { PrismaClient } from '@prisma/client';
import type { UserSession } from '@/lib/auth';
import { recordAudit } from '@/lib/audit';
import { applyOrderChanges } from '@/lib/admin/order-updates';
import { checkTracking } from '@/lib/orders/transitions';
import { readStoreSettings } from '@/lib/settings/server';
import { getCarrier, type CarrierAdapter } from './carrier';
import { senderFromSettings } from './sender';
import { ACTIVE_SHIPMENT_STATUSES, MANUAL_UPDATES, OPEN_SHIPMENT_STATUSES, PTT_CARRIER_NAME, canMoveShipment, shipmentStatusLabel, type ShipmentStatus } from './statuses';
import { kurusToTl } from '@/lib/money';

/**
 * Shipments of orders: create (label ready), barcode from the branch receipt or the PTT range, hand-over,
 * movements, cancel, and the tracking job. Order status changes go through applyOrderChanges so the
 * transition rules, the shipping e-mail and the activity log apply. Tested in tests/shipping.test.ts.
 */

export class ShipmentError extends Error {
  constructor(message: string, readonly status: 400 | 404 | 409 | 502 = 409) {
    super(message);
  }
}

type Actor = Pick<UserSession, 'userId' | 'email'>;
/** Changes made by the tracking job are logged under this name. */
export const TRACKING_ACTOR: Actor = { userId: 'system', email: 'PTT takip (otomatik)' };

const SHIPPABLE_ORDER = ['ODENDI', 'HAZIRLANIYOR'];

async function loadShipment(db: PrismaClient, id: string) {
  const shipment = await db.shipment.findUnique({ where: { id }, include: { order: { include: { items: true } } } });
  if (!shipment) throw new ShipmentError('Gönderi bulunamadı.', 404);
  return shipment;
}

export async function createShipment(
  db: PrismaClient,
  actor: Actor,
  input: { orderId: string; desi: number; pieces: number; weightKg: number | null },
) {
  if (!Number.isFinite(input.desi) || input.desi <= 0 || input.desi > 300) throw new ShipmentError('Desi 0 ile 300 arasında olmalı.', 400);
  if (!Number.isInteger(input.pieces) || input.pieces < 1 || input.pieces > 20) throw new ShipmentError('Parça sayısı 1–20 arasında olmalı.', 400);
  if (input.weightKg !== null && (!Number.isFinite(input.weightKg) || input.weightKg <= 0 || input.weightKg > 100)) throw new ShipmentError('Ağırlık 0 ile 100 kg arasında olmalı.', 400);

  const sender = senderFromSettings(await readStoreSettings());
  if (!sender.complete) throw new ShipmentError(`Önce Ayarlar → Kargo'da gönderici bilgilerini tamamlayın (eksik: ${sender.missing.join(', ')}).`);

  const shipment = await db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: input.orderId }, select: { id: true, orderNumber: true, status: true } });
    if (!order) throw new ShipmentError('Sipariş bulunamadı.', 404);
    if (!SHIPPABLE_ORDER.includes(order.status)) throw new ShipmentError('Gönderi yalnız ödenmiş ya da hazırlanan siparişe oluşturulur.');
    const existing = await tx.shipment.findMany({ where: { orderId: order.id }, select: { status: true } });
    if (existing.some((item) => (ACTIVE_SHIPMENT_STATUSES as readonly string[]).includes(item.status))) throw new ShipmentError('Bu siparişin zaten bir gönderisi var.');
    const created = await tx.shipment.create({
      data: {
        orderId: order.id,
        carrier: 'PTT',
        mode: getCarrier().mode,
        reference: `${order.orderNumber}-${existing.length + 1}`,
        desi: Math.round(input.desi * 10) / 10,
        pieces: input.pieces,
        weightKg: input.weightKg,
      },
    });
    await tx.shipmentEvent.create({ data: { shipmentId: created.id, at: new Date(), description: `Gönderi oluşturuldu (${created.desi} desi, ${created.pieces} parça)`, source: 'PANEL' } });
    await recordAudit(tx, actor, { action: 'order.shipment', entity: 'order', entityId: order.id, summary: `#${order.orderNumber}: PTT gönderisi oluşturuldu` });
    return { created, orderStatus: order.status };
  });

  // Printing a label means the parcel is being prepared.
  if (shipment.orderStatus === 'ODENDI') await applyOrderChanges(db, actor, [{ id: input.orderId, status: 'HAZIRLANIYOR' }]);
  return shipment.created;
}

/** The PTT barcode (= tracking number). In API mode the parcel data is uploaded to PTT for it first. */
export async function setBarcode(db: PrismaClient, actor: Actor, shipmentId: string, rawBarcode: string, carrier: CarrierAdapter = getCarrier()) {
  const shipment = await loadShipment(db, shipmentId);
  if (!['ETIKET_HAZIR', 'KABUL'].includes(shipment.status)) throw new ShipmentError(`${shipmentStatusLabel(shipment.status)} gönderinin barkodu değiştirilemez.`);
  const tracking = checkTracking(PTT_CARRIER_NAME, rawBarcode);
  if (!tracking.ok) throw new ShipmentError(tracking.reason, 400);

  if (carrier.mode === 'API') {
    const sender = senderFromSettings(await readStoreSettings());
    if (!sender.complete) throw new ShipmentError(`Gönderici bilgileri eksik: ${sender.missing.join(', ')}.`);
    const order = shipment.order;
    try {
      await carrier.registerShipment({
        barcode: tracking.code,
        reference: shipment.reference,
        orderNumber: order.orderNumber,
        sender: sender.sender,
        recipient: { name: order.customerName, phone: order.customerPhone, email: order.customerEmail, address: order.shippingAddress, district: order.shippingDistrict, city: order.shippingCity },
        desi: shipment.desi,
        weightKg: shipment.weightKg,
        pieces: shipment.pieces,
        value: kurusToTl(order.totalKurus),
      });
    } catch (error) {
      throw new ShipmentError(error instanceof Error ? error.message : 'PTT gönderi kaydı yapılamadı.', 502);
    }
  }

  await db.$transaction(async (tx) => {
    await tx.shipment.update({ where: { id: shipment.id }, data: { barcode: tracking.code, mode: carrier.mode } });
    await tx.shipmentEvent.create({
      data: { shipmentId: shipment.id, at: new Date(), description: carrier.mode === 'API' ? `Barkod ${tracking.code} PTT'ye kaydedildi` : `PTT barkodu girildi: ${tracking.code}`, source: 'PANEL' },
    });
  });
  const result = await applyOrderChanges(db, actor, [{ id: shipment.orderId, trackingCompany: PTT_CARRIER_NAME, trackingCode: tracking.code }]);
  if (result.skipped.length) throw new ShipmentError(result.skipped[0].reason);
  return result;
}

/** Parcel handed to PTT: shipment KABUL and order Kargoda (with the shipping e-mail). */
export async function handOver(db: PrismaClient, actor: Actor, shipmentId: string) {
  const shipment = await loadShipment(db, shipmentId);
  if (!shipment.barcode) throw new ShipmentError('Önce PTT barkodunu girin.');
  if (shipment.status !== 'ETIKET_HAZIR') throw new ShipmentError(`Gönderi zaten ${shipmentStatusLabel(shipment.status).toLocaleLowerCase('tr-TR')}.`);
  if (shipment.order.status === 'KARGODA') {
    await recordMovement(db, actor, shipmentId, 'KABUL', 'Kargoya verildi');
    return { emails: { sent: [], failed: [] }, skipped: [], updatedIds: [shipment.orderId] };
  }
  const result = await applyOrderChanges(db, actor, [{ id: shipment.orderId, status: 'KARGODA' }]);
  if (result.skipped.length) throw new ShipmentError(result.skipped[0].reason);
  return result;
}

/**
 * A movement typed in the panel or read from PTT. Moves the shipment when the rules allow, otherwise only
 * records the event. Delivery also completes the order.
 */
export async function recordMovement(
  db: PrismaClient,
  actor: Actor,
  shipmentId: string,
  status: ShipmentStatus | null,
  description: string,
  extra: { at?: Date; code?: string | null; location?: string | null; source?: 'PANEL' | 'PTT' } = {},
) {
  const shipment = await loadShipment(db, shipmentId);
  const moves = status !== null && status !== shipment.status && canMoveShipment(shipment.status, status);
  await db.$transaction(async (tx) => {
    if (moves) await tx.shipment.update({ where: { id: shipment.id }, data: { status: status as string } });
    await tx.shipmentEvent.create({
      data: { shipmentId: shipment.id, at: extra.at ?? new Date(), code: extra.code ?? null, description: description.slice(0, 300), location: extra.location ?? null, source: extra.source ?? 'PANEL' },
    });
    if (moves) {
      await recordAudit(tx, actor, {
        action: 'order.shipment',
        entity: 'order',
        entityId: shipment.orderId,
        summary: `#${shipment.order.orderNumber}: kargo ${shipmentStatusLabel(status as string).toLocaleLowerCase('tr-TR')}`,
      });
    }
  });
  if (!moves) return { moved: false };
  if (status === 'TESLIM_EDILDI' && shipment.order.status === 'KARGODA') await applyOrderChanges(db, actor, [{ id: shipment.orderId, status: 'TESLIM_EDILDI' }]);
  // PTT accepted a parcel the panel had not marked as handed over yet.
  if (status === 'KABUL' && ['ODENDI', 'HAZIRLANIYOR'].includes(shipment.order.status)) await applyOrderChanges(db, actor, [{ id: shipment.orderId, status: 'KARGODA' }]);
  return { moved: true };
}

/** Panel entry for movements while there is no PTT web service. */
export async function recordManualStatus(db: PrismaClient, actor: Actor, shipmentId: string, status: string, note: string | null) {
  if (!(MANUAL_UPDATES as readonly string[]).includes(status)) throw new ShipmentError('Bu durum elle girilemez.', 400);
  const shipment = await loadShipment(db, shipmentId);
  if (!canMoveShipment(shipment.status, status)) throw new ShipmentError(`${shipmentStatusLabel(shipment.status)} → ${shipmentStatusLabel(status)} geçişine izin yok.`);
  const text = note?.trim() ? `${shipmentStatusLabel(status)}: ${note.trim()}` : shipmentStatusLabel(status);
  return recordMovement(db, actor, shipmentId, status as ShipmentStatus, text);
}

/** Only before hand-over. In API mode the uploaded data is removed from PTT too. */
export async function cancelShipment(db: PrismaClient, actor: Actor, shipmentId: string, carrier: CarrierAdapter = getCarrier()) {
  const shipment = await loadShipment(db, shipmentId);
  if (shipment.status !== 'ETIKET_HAZIR') throw new ShipmentError('Yalnız kargoya verilmemiş gönderi iptal edilebilir.');
  if (shipment.mode === 'API' && shipment.barcode) {
    try {
      await carrier.cancelShipment({ barcode: shipment.barcode, reference: shipment.reference });
    } catch (error) {
      throw new ShipmentError(error instanceof Error ? error.message : 'PTT kaydı silinemedi.', 502);
    }
  }
  await db.$transaction(async (tx) => {
    await tx.shipment.update({ where: { id: shipment.id }, data: { status: 'IPTAL' } });
    await tx.shipmentEvent.create({ data: { shipmentId: shipment.id, at: new Date(), description: 'Gönderi iptal edildi', source: 'PANEL' } });
    // The barcode belonged to this parcel; the order no longer has a tracking number.
    if (shipment.barcode && shipment.order.trackingCode === shipment.barcode) {
      await tx.order.update({ where: { id: shipment.orderId }, data: { trackingCode: null, trackingCompany: null } });
    }
    await recordAudit(tx, actor, { action: 'order.shipment', entity: 'order', entityId: shipment.orderId, summary: `#${shipment.order.orderNumber}: PTT gönderisi iptal edildi` });
  });
}

export async function markLabelsPrinted(db: PrismaClient, ids: string[]) {
  const { count } = await db.shipment.updateMany({ where: { id: { in: ids }, labelPrintedAt: null }, data: { labelPrintedAt: new Date() } });
  return count;
}

/**
 * Tracking job: asks PTT about shipments still on the way, stores new movements and applies the statuses
 * they mean. Does nothing in MANUAL mode. Returns counts for the cron answer.
 */
export async function trackOpenShipments(db: PrismaClient, carrier: CarrierAdapter = getCarrier(), limit = 100) {
  const summary = { mode: carrier.mode, checked: 0, events: 0, moved: 0, failed: [] as string[] };
  if (carrier.mode !== 'API') return summary;
  const shipments = await db.shipment.findMany({
    where: { status: { in: [...OPEN_SHIPMENT_STATUSES] }, barcode: { not: null } },
    orderBy: [{ lastCheckedAt: { sort: 'asc', nulls: 'first' } }],
    take: limit,
    include: { events: { where: { source: 'PTT' }, select: { at: true, description: true } } },
  });
  for (const shipment of shipments) {
    summary.checked += 1;
    try {
      const events = (await carrier.track({ barcode: shipment.barcode as string })) ?? [];
      const known = new Set(shipment.events.map((event) => `${event.at.getTime()}|${event.description}`));
      for (const event of events) {
        if (known.has(`${event.at.getTime()}|${event.description}`)) continue;
        const result = await recordMovement(db, TRACKING_ACTOR, shipment.id, event.status, event.description, { at: event.at, code: event.code, location: event.location, source: 'PTT' });
        summary.events += 1;
        if (result.moved) summary.moved += 1;
      }
    } catch (error) {
      summary.failed.push(`${shipment.barcode}: ${error instanceof Error ? error.message : 'sorgulanamadı'}`);
    } finally {
      await db.shipment.update({ where: { id: shipment.id }, data: { lastCheckedAt: new Date() } });
    }
  }
  return summary;
}
