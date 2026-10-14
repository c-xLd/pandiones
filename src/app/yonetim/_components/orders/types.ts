export { CARRIERS, allowedNext, isBackward, primaryNext, statusLabel } from '@/lib/orders/transitions';

/** The order's current (not cancelled) shipment, as the list returns it. */
export type ShipmentSummary = {
  id: string;
  status: string;
  barcode: string | null;
  reference: string;
  desi: number;
  pieces: number;
  weightKg: number | null;
  mode: 'MANUAL' | 'API';
  labelPrintedAt: string | null;
};

export type ShipmentEvent = { id: string; at: string; description: string; location: string | null; source: 'PANEL' | 'PTT' };
export type ShipmentDetail = ShipmentSummary & { createdAt: string; events: ShipmentEvent[] };

/** GET /api/admin/shipments/config */
export type ShippingConfig = {
  ptt: { mode: 'MANUAL' | 'API'; env: 'test' | 'prod' | null; problem: string | null };
  sender: { complete: true; name: string; phone: string; address: string; district: string; city: string } | { complete: false; missing: string[] };
  defaultDesi: number;
  storeName: string;
};

export type OrderItem = {
  id: string;
  productId: string;
  productName: string;
  size: string;
  quantity: number;
  price: number;
  /** VAT rate (%) included in `price` when the order was placed; null for gift cards and older orders. */
  vatRate?: number | null;
  product?: { id: string; image: string; slug: string; category: string } | null;
};

export type PaymentTransaction = {
  id: string;
  provider: string;
  conversationId: string;
  paymentId?: string | null;
  status: string;
  amount: number;
  installment: number;
  cardAssociation?: string | null;
  cardFamily?: string | null;
  lastFourDigits?: string | null;
  errorMessage?: string | null;
  createdAt: string;
};

/** A row of GET /api/admin/orders (no payment records; the detail endpoint adds them). */
export type AdminOrder = {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
  shippingCity: string;
  shippingDistrict: string;
  shippingNotes?: string | null;
  adminNotes?: string | null;
  couponCode?: string | null;
  discountAmount?: number | null;
  giftCardCode?: string | null;
  giftCardAmount?: number | null;
  totalAmount: number;
  status: string;
  paymentStatus?: string;
  paidAt?: string | null;
  trackingCompany?: string | null;
  trackingCode?: string | null;
  createdAt: string;
  items?: OrderItem[];
  transactions?: PaymentTransaction[];
  shipments?: (ShipmentSummary | ShipmentDetail)[];
};

export type TimelineEntry = {
  at: string;
  kind: 'created' | 'payment' | 'paid' | 'status' | 'tracking' | 'note' | 'email' | 'shipping';
  title: string;
  detail?: string;
  actor?: string;
  tone?: 'success' | 'danger';
};

export type OrderList = {
  orders: AdminOrder[];
  total: number;
  page: number;
  pageSize: number;
  counts: Record<string, number>;
  months: { key: string; count: number }[];
};

export type OrderPatch = {
  orderId?: string;
  orderIds?: string[];
  status?: string;
  trackingCompany?: string;
  trackingCode?: string;
  adminNotes?: string;
};

export type PatchResult = {
  orders: AdminOrder[];
  skipped: { id: string; orderNumber: string; reason: string }[];
  emails: { sent: string[]; failed: string[] };
};

/** Sends a PATCH to /api/admin/orders. Throws with the server's reason (409 for a refused single change). */
export type UpdateOrders = (patch: OrderPatch, fallback: string) => Promise<PatchResult>;

/** Button text for moving an order from one status to another. */
export function stepLabel(from: string, to: string): string {
  if (to === 'HAZIRLANIYOR') return from === 'KARGODA' ? 'Hazırlanıyor’a geri al' : 'Hazırlamaya al';
  if (to === 'KARGODA') return from === 'ODENDI' ? 'Doğrudan kargoya ver' : 'Kargoya ver';
  if (to === 'ODENDI') return 'Ödendi’ye geri al';
  if (to === 'TESLIM_EDILDI') return 'Teslim edildi';
  return to;
}
