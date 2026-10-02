/** Order types and pure helpers shared by /siparislerim and /hesabim. Unit-tested in tests/account-lib.test.ts. */

export type OrderItem = {
  id: string;
  productName: string;
  size: string;
  quantity: number;
  price: number;
  product?: { slug?: string | null; image?: string | null; category?: string | null } | null;
};

export type ReturnRequest = {
  id: string;
  reason: string;
  status: 'BEKLIYOR' | 'ONAYLANDI' | 'REDDEDILDI' | string;
  adminNotes?: string | null;
  createdAt: string;
};

export type Order = {
  id: string;
  orderNumber: string;
  status: string;
  createdAt: string;
  paidAt?: string | null;
  totalAmount: number;
  discountAmount?: number | null;
  couponCode?: string | null;
  giftCardAmount?: number | null;
  giftCardCode?: string | null;
  customerName: string;
  customerPhone?: string | null;
  shippingAddress: string;
  shippingDistrict: string;
  shippingCity: string;
  shippingNotes?: string | null;
  adminNotes?: string | null;
  trackingCompany?: string | null;
  trackingCode?: string | null;
  paymentProvider?: string | null;
  items?: OrderItem[];
  returns?: ReturnRequest[];
};

export type OrderFilter = 'ALL' | 'ACTIVE' | 'DELIVERED' | 'RETURNS';

export const ACTIVE_STATUSES = ['ODENDI', 'HAZIRLANIYOR', 'KARGODA'];
const RETURNABLE_STATUSES = ['ODENDI', 'HAZIRLANIYOR', 'KARGODA', 'TESLIM_EDILDI'];

export type StatusTone = 'neutral' | 'progress' | 'success' | 'danger';

const STATUS_META: Record<string, { label: string; tone: StatusTone }> = {
  ODEME_BEKLENIYOR: { label: 'Ödeme bekleniyor', tone: 'neutral' },
  ODENDI: { label: 'Ödeme alındı', tone: 'progress' },
  HAZIRLANIYOR: { label: 'Hazırlanıyor', tone: 'progress' },
  KARGODA: { label: 'Kargoda', tone: 'progress' },
  TESLIM_EDILDI: { label: 'Teslim edildi', tone: 'success' },
  ODEME_BASARISIZ: { label: 'Ödeme başarısız', tone: 'danger' },
};

export const orderStatusMeta = (status: string) => STATUS_META[status] ?? { label: status, tone: 'neutral' as StatusTone };

const STATUS_LEAD: Record<string, string> = {
  ODEME_BEKLENIYOR: 'Ödeme henüz tamamlanmadı. Ödeme onaylanınca sipariş hazırlığa alınır.',
  ODENDI: 'Ödemeniz alındı; siparişiniz hazırlanmak üzere sıraya girdi.',
  HAZIRLANIYOR: 'Parçalarınız hazırlanıyor. Kargoya verildiğinde takip kodu burada görünür.',
  KARGODA: 'Siparişiniz kargoda. Takip kodu ile taşıyıcı sayfasından izleyebilirsiniz.',
  TESLIM_EDILDI: 'Siparişiniz teslim edildi.',
  ODEME_BASARISIZ: 'Ödeme tamamlanamadı; bu sipariş için tahsilat yapılmadı.',
};

/** One-sentence explanation of what the status means for the customer. */
export const orderStatusLead = (status: string) => STATUS_LEAD[status] ?? '';

const RETURN_META: Record<string, { label: string; tone: StatusTone }> = {
  BEKLIYOR: { label: 'İnceleniyor', tone: 'progress' },
  ONAYLANDI: { label: 'Onaylandı', tone: 'success' },
  REDDEDILDI: { label: 'Reddedildi', tone: 'danger' },
};

export const returnStatusMeta = (status: string) => RETURN_META[status] ?? { label: status, tone: 'neutral' as StatusTone };

export const ORDER_STEPS = ['Ödeme alındı', 'Hazırlanıyor', 'Kargoda', 'Teslim edildi'] as const;

/** 1–4 for fulfilment steps, 0 when the order has not been paid (no progress to show). */
export const orderProgressStep = (status: string) =>
  ({ ODENDI: 1, HAZIRLANIYOR: 2, KARGODA: 3, TESLIM_EDILDI: 4 } as Record<string, number>)[status] ?? 0;

/** Official carrier tracking page; null when the carrier is unknown so no guessed link is shown. */
export function carrierTrackingUrl(company?: string | null, code?: string | null): string | null {
  if (!code?.trim()) return null;
  const clean = encodeURIComponent(code.trim());
  const name = (company || '').toLocaleLowerCase('tr-TR');
  if (name.includes('yurtiçi') || name.includes('yurtici')) {
    return `https://www.yurticikargo.com/tr/online-servisler/gonderi-sorgula?code=${clean}`;
  }
  if (name.includes('mng')) return `https://www.mngkargo.com.tr/gonderitakip?k=${clean}`;
  if (name.includes('aras')) return `https://kargotakip.araskargo.com.tr/?code=${clean}`;
  if (name.includes('kolay gelsin')) return `https://esube.kolaygelsin.com/shipments?trackingId=${clean}`;
  if (name.includes('sürat') || name.includes('surat')) return `https://suratkargo.com.tr/KargoTakip/?kargotakipno=${clean}`;
  if (name.includes('ptt')) return `https://gonderitakip.ptt.gov.tr/Track/Verify?q=${clean}`;
  return null;
}

/** Prepares a polite WhatsApp notification link for the customer with carrier and tracking details. */
export function customerTrackingWhatsAppUrl(order: {
  customerPhone?: string | null;
  customerName: string;
  orderNumber: string;
  trackingCompany?: string | null;
  trackingCode?: string | null;
}): string | null {
  if (!order.customerPhone) return null;
  const digits = order.customerPhone.replace(/\D/g, '');
  if (!digits) return null;
  const phone = digits.startsWith('0') ? `9${digits}` : digits.startsWith('90') ? digits : `90${digits}`;
  const company = order.trackingCompany || 'Kargo';
  const code = order.trackingCode || '';
  const message = `Merhaba Sayın ${order.customerName}, Pandiones üzerinden oluşturduğunuz #${order.orderNumber} numaralı siparişiniz ${company} ile kargoya verilmiştir.${code ? ` Takip kodunuz: ${code}.` : ''} Siparişinizi takip etmek için: https://pandiones.com/siparis-takip`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

export function filterOrders(orders: Order[], filter: OrderFilter, query: string): Order[] {
  const q = query.trim().toLocaleLowerCase('tr-TR');
  return orders.filter((order) => {
    if (filter === 'ACTIVE' && !ACTIVE_STATUSES.includes(order.status)) return false;
    if (filter === 'DELIVERED' && order.status !== 'TESLIM_EDILDI') return false;
    if (filter === 'RETURNS' && !(order.returns && order.returns.length > 0)) return false;
    if (!q) return true;
    return (
      order.orderNumber.toLocaleLowerCase('tr-TR').includes(q) ||
      (order.items ?? []).some((item) => item.productName.toLocaleLowerCase('tr-TR').includes(q))
    );
  });
}

/** Mirrors POST /api/returns: paid orders without an open or decided return request. */
export const canRequestReturn = (order: Order) =>
  RETURNABLE_STATUSES.includes(order.status) && !(order.returns && order.returns.length > 0);

export const orderSubtotal = (order: Order) =>
  (order.items ?? []).reduce((sum, item) => sum + item.price * item.quantity, 0) || order.totalAmount;

/** Public product page for an order line or wishlist item. */
export const productHref = (slug?: string | null) => (slug ? `/urun/${slug}` : null);

export const formatDate = (value: string | Date, style: 'long' | 'short' = 'long') =>
  new Date(value).toLocaleDateString('tr-TR', style === 'long' ? { day: 'numeric', month: 'long', year: 'numeric' } : undefined);
