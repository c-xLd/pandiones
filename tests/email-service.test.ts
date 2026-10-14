import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateOrderConfirmationEmail,
  generateOrderShippedEmail,
  generateStockAlertEmail,
  generateNewsletterWelcomeEmail,
} from '../src/lib/email/templates';
import {
  InMemoryEmailSender,
  getEmailSender,
  EmailUnavailableError,
  sendTestEmail,
  getInMemoryEmailSender,
} from '../src/lib/email/provider';
import { POST as adminTestEmailHandler } from '../src/app/api/admin/email/test/route';

test('email templates generate valid HTML and text with expected brand and order details', () => {
  // 1. Order Confirmation
  const orderEmail = generateOrderConfirmationEmail({
    orderNumber: 'PND-2026-TEST',
    customerName: 'Selin Demir',
    customerEmail: 'selin@example.com',
    shippingAddress: 'Bağdat Caddesi No: 42',
    shippingCity: 'İstanbul',
    shippingDistrict: 'Kadıköy',
    items: [
      {
        productName: 'İpek Bralet',
        size: 'S',
        quantity: 1,
        price: 1850,
      },
    ],
    totalAmount: 1850,
    discountAmount: 0,
    couponCode: null,
  });

  assert.match(orderEmail.subject, /PND-2026-TEST/);
  assert.match(orderEmail.html, /Selin Demir/);
  assert.match(orderEmail.html, /İpek Bralet/);
  assert.match(orderEmail.html, /₺1.850/);
  assert.match(orderEmail.text, /Bağdat Caddesi No: 42/);

  // 2. Order Shipped
  const shippedEmail = generateOrderShippedEmail({
    orderNumber: 'PND-2026-TEST',
    customerName: 'Selin Demir',
    customerEmail: 'selin@example.com',
    trackingCompany: 'Yurtiçi Kargo',
    trackingCode: 'YK-99887766',
  });

  assert.match(shippedEmail.subject, /PND-2026-TEST/);
  assert.match(shippedEmail.html, /YK-99887766/);
  assert.match(shippedEmail.html, /Yurtiçi Kargo/);
  assert.match(shippedEmail.text, /YK-99887766/);

  // 3. Stock Alert
  const stockAlertEmail = generateStockAlertEmail({
    recipientEmail: 'selin@example.com',
    productName: 'İpek Kimono',
    productSlug: 'ipek-kimono-fildisi',
    size: 'M',
    price: 3200,
  });

  assert.match(stockAlertEmail.subject, /İpek Kimono/);
  assert.match(stockAlertEmail.html, /M beden/);
  assert.match(stockAlertEmail.html, /₺3.200/);
  assert.match(stockAlertEmail.text, /ipek-kimono-fildisi/);

  // 4. Newsletter Welcome
  const newsletterEmail = generateNewsletterWelcomeEmail({
    recipientEmail: 'selin@example.com',
    unsubscribeUrl: 'https://pandiones.com/api/newsletter/unsubscribe?token=abc',
  });

  assert.match(newsletterEmail.subject, /Hoş Geldiniz/);
  assert.match(newsletterEmail.html, /token=abc/);
  assert.match(newsletterEmail.text, /token=abc/);
});

test('InMemoryEmailSender tracks sent emails and can be inspected and cleared', async () => {
  const sender = new InMemoryEmailSender();
  assert.equal(sender.getSentEmails().length, 0);

  const result = await sender.send({
    to: 'test@example.com',
    subject: 'Deneme',
    html: '<p>Deneme içerik</p>',
    text: 'Deneme içerik',
  });

  assert.equal(result.success, true);
  assert.ok(result.messageId);
  assert.equal(sender.getSentEmails().length, 1);
  assert.equal(sender.getSentEmails()[0].to, 'test@example.com');

  sender.clear();
  assert.equal(sender.getSentEmails().length, 0);
});

test('getEmailSender throws EmailUnavailableError in production when RESEND_API_KEY is missing', () => {
  const originalEnv = process.env.NODE_ENV;
  const originalKey = process.env.RESEND_API_KEY;

  try {
    (process.env as any).NODE_ENV = 'production';
    delete process.env.RESEND_API_KEY;

    assert.throws(
      () => {
        getEmailSender();
      },
      (err: any) => err instanceof EmailUnavailableError
    );
  } finally {
    (process.env as any).NODE_ENV = originalEnv;
    if (originalKey) {
      process.env.RESEND_API_KEY = originalKey;
    }
  }
});

test('sendTestEmail sends a valid test email and captures it in the in-memory sender', async () => {
  const inMemory = getInMemoryEmailSender();
  inMemory.clear();

  const res = await sendTestEmail('yonetici@pandiones.test');
  assert.equal(res.success, true);
  assert.ok(res.messageId);

  const sent = inMemory.getSentEmails();
  assert.equal(sent.length, 1);
  assert.equal(sent[0].to, 'yonetici@pandiones.test');
  assert.match(sent[0].subject, /Pandiones — Deneme E-Postası/);
  assert.match(sent[0].html, /E-Posta Bağlantısı Doğrulandı/);
  assert.match(sent[0].text, /Deneme E-Postası/);
});

test('POST /api/admin/email/test blocks anonymous requests with 403', async () => {
  const req = new Request('http://localhost:3000/api/admin/email/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ targetEmail: 'deneme@pandiones.test' }),
  });
  const res = await adminTestEmailHandler(req);
  assert.equal(res.status, 403);
  const data = await res.json();
  assert.match(data.error, /yetkisiz erişim/i);
});

