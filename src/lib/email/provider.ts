import type {
  EmailPayload,
  EmailResult,
  OrderConfirmationEmailData,
  OrderShippedEmailData,
  StockAlertEmailData,
  NewsletterWelcomeEmailData,
  GiftCardDeliveryEmailData,
} from './types';
import {
  generateOrderConfirmationEmail,
  generateOrderShippedEmail,
  generateStockAlertEmail,
  generateNewsletterWelcomeEmail,
  generateGiftCardDeliveryEmail,
} from './templates';

export class EmailUnavailableError extends Error {
  readonly code = 'EMAIL_UNAVAILABLE';
  constructor(message = 'E-posta servisi yapılandırılmamış.') {
    super(message);
  }
}

export interface EmailSender {
  send(payload: EmailPayload): Promise<EmailResult>;
}

/**
 * In-memory provider for unit tests and local development inspection
 */
export class InMemoryEmailSender implements EmailSender {
  private sent: EmailPayload[] = [];

  async send(payload: EmailPayload): Promise<EmailResult> {
    this.sent.push({ ...payload });
    return {
      success: true,
      messageId: `mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    };
  }

  getSentEmails(): EmailPayload[] {
    return [...this.sent];
  }

  clear(): void {
    this.sent = [];
  }
}

/**
 * Production Resend provider using native HTTP fetch (no external npm dependencies required)
 */
export class ResendEmailSender implements EmailSender {
  constructor(
    private apiKey: string,
    private fromAddress: string = 'Pandiones <siparis@pandiones.com>'
  ) {}

  async send(payload: EmailPayload): Promise<EmailResult> {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.fromAddress,
          to: [payload.to],
          subject: payload.subject,
          html: payload.html,
          text: payload.text,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return {
          success: false,
          error: data.message || `Resend API error: ${res.status}`,
        };
      }

      return {
        success: true,
        messageId: data.id,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'E-posta gönderiminde ağ hatası oluştu.',
      };
    }
  }
}

let inMemoryInstance: InMemoryEmailSender | null = null;

export function getInMemoryEmailSender(): InMemoryEmailSender {
  if (!inMemoryInstance) {
    inMemoryInstance = new InMemoryEmailSender();
  }
  return inMemoryInstance;
}

export function getEmailSender(): EmailSender {
  const isProduction = process.env.NODE_ENV === 'production';
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromAddress = process.env.EMAIL_FROM || 'Pandiones <siparis@pandiones.com>';

  if (resendApiKey) {
    return new ResendEmailSender(resendApiKey, fromAddress);
  }

  if (isProduction) {
    // In production without email credentials, throw according to OPERATIONS.md requirements
    throw new EmailUnavailableError('Üretim ortamında RESEND_API_KEY yapılandırılmamış.');
  }

  // Development / Test fallback
  return getInMemoryEmailSender();
}

/**
 * Safe transaction helper: dispatches email without crashing the caller if sending fails
 */
async function safeSend(payload: EmailPayload): Promise<EmailResult> {
  try {
    const sender = getEmailSender();
    const result = await sender.send(payload);
    if (!result.success) {
      console.warn(`[EMAIL_WARNING] Could not deliver email to ${payload.to}:`, result.error);
    }
    return result;
  } catch (err: any) {
    console.error(`[EMAIL_ERROR] Failed sending email to ${payload.to}:`, err.message);
    return {
      success: false,
      error: err.message,
    };
  }
}

export async function sendOrderConfirmationEmail(data: OrderConfirmationEmailData): Promise<EmailResult> {
  const template = generateOrderConfirmationEmail(data);
  return safeSend({
    to: data.customerEmail,
    subject: template.subject,
    html: template.html,
    text: template.text,
  });
}

export async function sendOrderShippedEmail(data: OrderShippedEmailData): Promise<EmailResult> {
  const template = generateOrderShippedEmail(data);
  return safeSend({
    to: data.customerEmail,
    subject: template.subject,
    html: template.html,
    text: template.text,
  });
}

export async function sendStockAlertEmail(data: StockAlertEmailData): Promise<EmailResult> {
  const template = generateStockAlertEmail(data);
  return safeSend({
    to: data.recipientEmail,
    subject: template.subject,
    html: template.html,
    text: template.text,
  });
}

export async function sendNewsletterWelcomeEmail(data: NewsletterWelcomeEmailData): Promise<EmailResult> {
  const template = generateNewsletterWelcomeEmail(data);
  return safeSend({
    to: data.recipientEmail,
    subject: template.subject,
    html: template.html,
    text: template.text,
  });
}

export async function sendGiftCardDeliveryEmail(data: GiftCardDeliveryEmailData): Promise<EmailResult> {
  const template = generateGiftCardDeliveryEmail(data);
  return safeSend({
    to: data.recipientEmail,
    subject: template.subject,
    html: template.html,
    text: template.text,
  });
}

