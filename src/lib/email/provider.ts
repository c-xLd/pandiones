import { maskEmail } from '@/lib/security/redact';
import type {
  EmailPayload,
  EmailResult,
  OrderConfirmationEmailData,
  OrderShippedEmailData,
  StockAlertEmailData,
  NewsletterWelcomeEmailData,
  GiftCardDeliveryEmailData,
  ContactNotificationEmailData,
  PasswordResetEmailData,
  AccountEmailData,
} from './types';
import {
  DEFAULT_EMAIL_BRAND,
  type EmailBrand,
  generateOrderConfirmationEmail,
  generateOrderShippedEmail,
  generateStockAlertEmail,
  generateNewsletterWelcomeEmail,
  generateGiftCardDeliveryEmail,
  generateContactNotificationEmail,
  generatePasswordResetEmail,
  generateAccountEmail,
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
          ...(payload.replyTo ? { reply_to: payload.replyTo } : {}),
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
/** Live support address for the e-mail footer; falls back to the default if settings cannot be read. */
async function emailBrand(): Promise<EmailBrand> {
  try {
    const { readStoreSettings } = await import('@/lib/settings/server');
    return { supportEmail: (await readStoreSettings()).contactEmail };
  } catch {
    return DEFAULT_EMAIL_BRAND;
  }
}

async function safeSend(payload: EmailPayload): Promise<EmailResult> {
  try {
    const sender = getEmailSender();
    const result = await sender.send(payload);
    if (!result.success) {
      console.warn(`[EMAIL_WARNING] Could not deliver email to ${maskEmail(payload.to)}:`, result.error);
    }
    return result;
  } catch (err: any) {
    console.error(`[EMAIL_ERROR] Failed sending email to ${maskEmail(payload.to)}:`, err.message);
    return {
      success: false,
      error: err.message,
    };
  }
}

export async function sendOrderConfirmationEmail(data: OrderConfirmationEmailData): Promise<EmailResult> {
  const template = generateOrderConfirmationEmail(data, await emailBrand());
  return safeSend({
    to: data.customerEmail,
    subject: template.subject,
    html: template.html,
    text: template.text,
  });
}

export async function sendOrderShippedEmail(data: OrderShippedEmailData): Promise<EmailResult> {
  const template = generateOrderShippedEmail(data, await emailBrand());
  return safeSend({
    to: data.customerEmail,
    subject: template.subject,
    html: template.html,
    text: template.text,
  });
}

export async function sendStockAlertEmail(data: StockAlertEmailData): Promise<EmailResult> {
  const template = generateStockAlertEmail(data, await emailBrand());
  return safeSend({
    to: data.recipientEmail,
    subject: template.subject,
    html: template.html,
    text: template.text,
  });
}

export async function sendNewsletterWelcomeEmail(data: NewsletterWelcomeEmailData): Promise<EmailResult> {
  const template = generateNewsletterWelcomeEmail(data, await emailBrand());
  return safeSend({
    to: data.recipientEmail,
    subject: template.subject,
    html: template.html,
    text: template.text,
  });
}

export async function sendGiftCardDeliveryEmail(data: GiftCardDeliveryEmailData): Promise<EmailResult> {
  const template = generateGiftCardDeliveryEmail(data, await emailBrand());
  return safeSend({
    to: data.recipientEmail,
    subject: template.subject,
    html: template.html,
    text: template.text,
  });
}


/** Forwards a contact-form message to the support inbox; replies go to the customer. */
export async function sendContactNotificationEmail(data: ContactNotificationEmailData): Promise<EmailResult> {
  const template = generateContactNotificationEmail(data, await emailBrand());
  return safeSend({
    to: data.inboxEmail,
    subject: template.subject,
    html: template.html,
    text: template.text,
    replyTo: data.email,
  });
}

/** Reset link e-mail. Without a mail provider outside production (in-memory sender) nobody would
 *  receive it, so the link is printed to the dev server log; in production it is never logged. */
export async function sendPasswordResetEmail(data: PasswordResetEmailData): Promise<EmailResult> {
  const template = generatePasswordResetEmail(data, await emailBrand());
  const result = await safeSend({ to: data.recipientEmail, subject: template.subject, html: template.html, text: template.text });
  if (result.success && process.env.NODE_ENV !== 'production' && !process.env.RESEND_API_KEY && process.env.NODE_ENV !== 'test') {
    console.info(`[DEV] Şifre sıfırlama bağlantısı (${data.recipientEmail}): ${data.resetUrl}`);
  }
  return result;
}

/** False when e-mail cannot be sent at all (production without RESEND_API_KEY). */
export function emailDeliveryConfigured(): boolean {
  try {
    getEmailSender();
    return true;
  } catch {
    return false;
  }
}

/** Account notices (verification link, existing-account notice, lockout, 2FA changes). Like the reset
 *  e-mail, a verification link is printed to the dev log when no provider is configured outside production. */
export async function sendAccountEmail(data: AccountEmailData): Promise<EmailResult> {
  const template = generateAccountEmail(data, await emailBrand());
  const result = await safeSend({ to: data.recipientEmail, subject: template.subject, html: template.html, text: template.text });
  if (result.success && data.actionUrl && process.env.NODE_ENV !== 'production' && !process.env.RESEND_API_KEY && process.env.NODE_ENV !== 'test') {
    console.info(`[DEV] ${data.kind} bağlantısı (${data.recipientEmail}): ${data.actionUrl}`);
  }
  return result;
}

/** Sends a test email to verify transactional delivery. */
export async function sendTestEmail(targetEmail: string): Promise<EmailResult> {
  const brand = await emailBrand();
  const subject = 'Pandiones — Deneme E-Postası';
  const html = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f7f6f2; padding: 40px 16px; margin: 0; color: #111;">
  <div style="max-width: 540px; margin: 0 auto; background: #ffffff; border: 1px solid #e8e6df; padding: 40px;">
    <h1 style="font-family: Georgia, serif; font-size: 20px; font-weight: normal; margin-top: 0; color: #111111;">E-Posta Bağlantısı Doğrulandı</h1>
    <p style="font-size: 14px; line-height: 1.6; color: #444444;">Bu ileti, Pandiones mağaza yönetim panelinden gönderilen bir deneme e-postasıdır. İşlemsel e-posta altyapısı ve sağlayıcı ayarları başarıyla çalışmaktadır.</p>
    <p style="font-size: 12px; color: #888888; margin-top: 32px; border-top: 1px solid #eeece6; padding-top: 16px;">Tarih: ${new Date().toLocaleString('tr-TR')} · Destek: ${brand.supportEmail}</p>
  </div>
</body>
</html>`;
  const text = `PANDIONES\nDeneme E-Postası\n\nBu ileti, Pandiones mağaza yönetim panelinden gönderilen bir deneme e-postasıdır. E-posta altyapısı başarıyla çalışmaktadır.\n\nTarih: ${new Date().toLocaleString('tr-TR')}`;
  return safeSend({ to: targetEmail, subject, html, text });
}

