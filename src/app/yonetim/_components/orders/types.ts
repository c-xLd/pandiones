export type OrderItem = {
  id: string;
  productId: string;
  productName: string;
  size: string;
  quantity: number;
  price: number;
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
  trackingCompany?: string | null;
  trackingCode?: string | null;
  createdAt: string;
  items?: OrderItem[];
  transactions?: PaymentTransaction[];
};

export type OrderPatch = {
  orderId?: string;
  orderIds?: string[];
  status?: string;
  trackingCompany?: string;
  trackingCode?: string;
  adminNotes?: string;
};

/** Sends a PATCH to /api/admin/orders and returns the orders as saved. Throws with a readable message. */
export type UpdateOrders = (patch: OrderPatch, fallback: string) => Promise<AdminOrder[]>;

export const CARRIERS = ['Yurtiçi Kargo', 'MNG Kargo', 'Aras Kargo', 'Kolay Gelsin', 'Sürat Kargo', 'PTT Kargo'] as const;

export const STATUS_OPTIONS = [
  { value: 'ODEME_BEKLENIYOR', label: 'Ödeme bekleniyor' },
  { value: 'ODENDI', label: 'Ödendi' },
  { value: 'HAZIRLANIYOR', label: 'Hazırlanıyor' },
  { value: 'KARGODA', label: 'Kargoda' },
  { value: 'TESLIM_EDILDI', label: 'Teslim edildi' },
  { value: 'ODEME_BASARISIZ', label: 'Ödeme başarısız' },
] as const;

export const statusLabel = (status: string) => STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status;
