export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface OrderItemEmailData {
  productName: string;
  size: string;
  quantity: number;
  price: number;
}

export interface OrderConfirmationEmailData {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  shippingAddress: string;
  shippingCity: string;
  shippingDistrict: string;
  items: OrderItemEmailData[];
  totalAmount: number;
  discountAmount?: number | null;
  couponCode?: string | null;
  paidAt?: Date | string | null;
}

export interface OrderShippedEmailData {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  trackingCompany: string;
  trackingCode: string;
}

export interface StockAlertEmailData {
  recipientEmail: string;
  productName: string;
  productSlug: string;
  size: string;
  price: number;
}

export interface NewsletterWelcomeEmailData {
  recipientEmail: string;
  unsubscribeUrl: string;
}

export interface GiftCardDeliveryEmailData {
  recipientEmail: string;
  recipientName: string;
  senderName?: string | null;
  code: string;
  initialBalance: number;
  theme: string;
  giftNote?: string | null;
  expiresAt: Date | string;
}

