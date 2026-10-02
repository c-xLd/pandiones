export interface ProductVariant {
  id?: string;
  size: string;
  stock: number;
}

export interface ProductMedia {
  id: string;
  kind: 'IMAGE' | 'VIDEO';
  role: 'FLATLAY' | 'MODEL' | 'DETAIL';
  url: string;
  posterUrl?: string | null;
  alt: string;
  position: number;
  isCover: boolean;
}

export interface SiblingColor {
  id: string;
  slug: string;
  category: string;
  color: string;
  image: string;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  price: number;
  color: string;
  category: 'lingerie' | 'sleep' | string;
  subcategory?: string | null;
  categoryId?: string | null;
  image: string;
  status?: 'DRAFT' | 'PUBLISHED';
  createdAt?: string | Date;
  updatedAt?: string | Date;
  media?: ProductMedia[];
  siblingColors?: SiblingColor[];
  images?: string[];
  video?: string;
  description: string;
  details?: string | null;
  material?: string | null;
  care?: string | null;
  featured?: boolean;
  variants?: ProductVariant[];
}

export interface CartItem {
  id: string;
  slug: string;
  name: string;
  price: number;
  color: string;
  category?: string;
  image: string;
  size: string;
  quantity: number;
  giftCardTheme?: string;
  recipientName?: string;
  recipientEmail?: string;
  senderName?: string;
  giftNote?: string;
  deliveryDate?: string;
}

export type PaymentStatus = 'ODEME_BEKLENIYOR' | 'ODENDI' | 'ODEME_BASARISIZ';

export interface PaymentInitResponse {
  success: boolean;
  orderNumber: string;
  orderId: string;
  paymentToken?: string;
  checkoutFormContent?: string;
  paymentPageUrl?: string;
  isMock?: boolean;
  error?: string;
}

export interface PaymentTransactionData {
  id: string;
  orderId: string;
  provider: string;
  conversationId: string;
  token?: string | null;
  paymentId?: string | null;
  status: string;
  amount: number;
  currency: string;
  installment: number;
  cardType?: string | null;
  cardAssociation?: string | null;
  cardFamily?: string | null;
  lastFourDigits?: string | null;
}

export const GIFT_CARD_PRODUCT_ID = 'pandiones-gift-card';
export const GIFT_CARD_PRODUCT_SLUG = 'dijital-hediye-karti';

