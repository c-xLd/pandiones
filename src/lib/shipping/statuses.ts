/**
 * Shipment statuses shared by every carrier, the moves between them and their labels. Pure (also used in
 * the panel); tested in tests/shipping.test.ts.
 */

export const SHIPMENT_STATUSES = ['ETIKET_HAZIR', 'KABUL', 'DAGITIMDA', 'TESLIM_EDILDI', 'TESLIM_EDILEMEDI', 'IADE', 'IPTAL'] as const;
export type ShipmentStatus = (typeof SHIPMENT_STATUSES)[number];

export const SHIPMENT_STATUS_LABELS: Record<ShipmentStatus, string> = {
  ETIKET_HAZIR: 'Etiket hazır',
  KABUL: 'Kargoya verildi',
  DAGITIMDA: 'Dağıtımda',
  TESLIM_EDILDI: 'Teslim edildi',
  TESLIM_EDILEMEDI: 'Teslim edilemedi',
  IADE: 'Göndericiye döndü',
  IPTAL: 'İptal edildi',
};

/** Still moving: the tracking job asks the carrier about these. */
export const OPEN_SHIPMENT_STATUSES: readonly ShipmentStatus[] = ['KABUL', 'DAGITIMDA', 'TESLIM_EDILEMEDI'];
/** Not cancelled: an order has at most one of these. */
export const ACTIVE_SHIPMENT_STATUSES: readonly ShipmentStatus[] = ['ETIKET_HAZIR', 'KABUL', 'DAGITIMDA', 'TESLIM_EDILDI', 'TESLIM_EDILEMEDI', 'IADE'];

const NEXT: Record<ShipmentStatus, readonly ShipmentStatus[]> = {
  ETIKET_HAZIR: ['KABUL', 'IPTAL'],
  KABUL: ['DAGITIMDA', 'TESLIM_EDILDI', 'TESLIM_EDILEMEDI', 'IADE', 'ETIKET_HAZIR'],
  DAGITIMDA: ['TESLIM_EDILDI', 'TESLIM_EDILEMEDI', 'IADE'],
  TESLIM_EDILEMEDI: ['DAGITIMDA', 'TESLIM_EDILDI', 'IADE'],
  TESLIM_EDILDI: [],
  IADE: [],
  IPTAL: [],
};

/** Statuses an admin may record by hand after the parcel left (no carrier API yet). */
export const MANUAL_UPDATES: readonly ShipmentStatus[] = ['DAGITIMDA', 'TESLIM_EDILDI', 'TESLIM_EDILEMEDI', 'IADE'];

export const isShipmentStatus = (value: unknown): value is ShipmentStatus => SHIPMENT_STATUSES.includes(value as ShipmentStatus);
export const shipmentStatusLabel = (status: string) => (isShipmentStatus(status) ? SHIPMENT_STATUS_LABELS[status] : status);
export const canMoveShipment = (from: string, to: string) => isShipmentStatus(from) && isShipmentStatus(to) && NEXT[from].includes(to);
export const nextShipmentStatuses = (from: string): readonly ShipmentStatus[] => (isShipmentStatus(from) ? NEXT[from] : []);

export const PTT_CARRIER_NAME = 'PTT Kargo';
