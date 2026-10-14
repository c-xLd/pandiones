/**
 * Which order status the admin panel may set next. Pure, shared by PATCH /api/admin/orders, the tracking
 * import and the order screens; tested in tests/order-transitions.test.ts.
 *
 * Payment states (ODEME_BEKLENIYOR, ODEME_BASARISIZ) belong to the payment callback and IADE_EDILDI to the
 * refund flow, so the panel never sets or leaves them. TESLIM_EDILDI is final. One step back is allowed for a mistaken click.
 */

export const CARRIERS = ['Yurtiçi Kargo', 'MNG Kargo', 'Aras Kargo', 'Kolay Gelsin', 'Sürat Kargo', 'PTT Kargo'] as const;
export type Carrier = (typeof CARRIERS)[number];

export const ORDER_STATUSES = ['ODEME_BEKLENIYOR', 'ODENDI', 'HAZIRLANIYOR', 'KARGODA', 'TESLIM_EDILDI', 'ODEME_BASARISIZ', 'IADE_EDILDI'] as const;
export type OrderStatusValue = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatusValue, string> = {
  ODEME_BEKLENIYOR: 'Ödeme bekleniyor',
  ODENDI: 'Ödendi',
  HAZIRLANIYOR: 'Hazırlanıyor',
  KARGODA: 'Kargoda',
  TESLIM_EDILDI: 'Teslim edildi',
  ODEME_BASARISIZ: 'Ödeme başarısız',
  IADE_EDILDI: 'İade edildi',
};

/** Forward steps first; the last entry of a list is the "undo" step where there is one. */
const NEXT: Record<OrderStatusValue, readonly OrderStatusValue[]> = {
  ODEME_BEKLENIYOR: [],
  ODEME_BASARISIZ: [],
  ODENDI: ['HAZIRLANIYOR', 'KARGODA'],
  HAZIRLANIYOR: ['KARGODA', 'ODENDI'],
  KARGODA: ['TESLIM_EDILDI', 'HAZIRLANIYOR'],
  TESLIM_EDILDI: [],
  // Set only by the refund flow (src/lib/payment/refund-order.ts); nothing follows it.
  IADE_EDILDI: [],
};

/** The step offered as the main button; the others are secondary. */
const PRIMARY: Partial<Record<OrderStatusValue, OrderStatusValue>> = {
  ODENDI: 'HAZIRLANIYOR',
  HAZIRLANIYOR: 'KARGODA',
  KARGODA: 'TESLIM_EDILDI',
};

const BACKWARD = new Set(['HAZIRLANIYOR>ODENDI', 'KARGODA>HAZIRLANIYOR']);

export const isOrderStatus = (value: unknown): value is OrderStatusValue => ORDER_STATUSES.includes(value as OrderStatusValue);
export const allowedNext = (status: string): readonly OrderStatusValue[] => (isOrderStatus(status) ? NEXT[status] : []);
export const primaryNext = (status: string): OrderStatusValue | null => (isOrderStatus(status) ? PRIMARY[status] ?? null : null);
export const isBackward = (from: string, to: string) => BACKWARD.has(`${from}>${to}`);
export const statusLabel = (status: string) => (isOrderStatus(status) ? ORDER_STATUS_LABELS[status] : status);

const TRACKING_CODE = /^[A-Za-z0-9-]{6,40}$/;

export function checkTracking(company: unknown, code: unknown): { ok: true; company: Carrier; code: string } | { ok: false; reason: string } {
  if (typeof company !== 'string' || !CARRIERS.includes(company as Carrier)) return { ok: false, reason: 'Kargo firması listede yok.' };
  const trimmed = typeof code === 'string' ? code.trim() : '';
  if (!TRACKING_CODE.test(trimmed)) return { ok: false, reason: 'Takip numarası 6–40 karakter olmalı; yalnız harf, rakam ve tire.' };
  return { ok: true, company: company as Carrier, code: trimmed };
}

/**
 * Whether `order` may move to `next`. `trackingCode` is the code the order will have after the same
 * request (the new one if sent, otherwise the saved one).
 */
export function checkTransition(
  order: { status: string },
  next: string,
  trackingCode: string | null | undefined,
): { ok: true } | { ok: false; reason: string } {
  if (!isOrderStatus(next)) return { ok: false, reason: 'Geçersiz sipariş durumu.' };
  if (order.status === next) return { ok: true };
  if (order.status === 'ODEME_BEKLENIYOR' || order.status === 'ODEME_BASARISIZ') {
    return { ok: false, reason: 'Ödemesi tamamlanmamış siparişin durumu panelden değiştirilemez.' };
  }
  if (order.status === 'TESLIM_EDILDI') return { ok: false, reason: 'Teslim edilmiş sipariş geri alınamaz.' };
  if (order.status === 'IADE_EDILDI') return { ok: false, reason: 'İade edilmiş siparişin durumu değiştirilemez.' };
  if (!allowedNext(order.status).includes(next)) {
    return { ok: false, reason: `${statusLabel(order.status)} → ${statusLabel(next)} geçişine izin yok.` };
  }
  if (next === 'KARGODA' && !trackingCode?.trim()) return { ok: false, reason: 'Kargoya vermek için önce takip numarası girin.' };
  return { ok: true };
}

export const RETURN_STATUSES = ['BEKLIYOR', 'ONAYLANDI', 'REDDEDILDI'] as const;
export type ReturnStatusValue = (typeof RETURN_STATUSES)[number];

export const isReturnStatus = (value: unknown): value is ReturnStatusValue =>
  RETURN_STATUSES.includes(value as ReturnStatusValue);

export function checkReturnTransition(
  currentStatus: string,
  nextStatus: string,
): { ok: true } | { ok: false; reason: string } {
  if (!isReturnStatus(nextStatus)) return { ok: false, reason: 'Geçersiz iade durumu.' };
  if (currentStatus === nextStatus) return { ok: true };
  if (currentStatus !== 'BEKLIYOR') {
    return { ok: false, reason: 'Sonuçlanmış iade talebinin durumu değiştirilemez.' };
  }
  return { ok: true };
}

