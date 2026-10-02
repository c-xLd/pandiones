import assert from 'node:assert/strict';
import test from 'node:test';
import { securityHeaders } from '../src/lib/security/headers.mjs';
import { generateOrderConfirmationEmail, generateOrderShippedEmail } from '../src/lib/email/templates';

const header = (list: { key: string; value: string }[], key: string) => list.find((h) => h.key === key)?.value ?? '';

test('production headers: CSP, no framing, HSTS, nosniff, referrer and permissions policy', () => {
  const h = securityHeaders({ production: true, mediaOrigin: 'https://media.example.com/products' });
  const csp = header(h, 'Content-Security-Policy');
  for (const part of ["default-src 'self'", "frame-ancestors 'none'", "object-src 'none'", "base-uri 'self'", 'form-action', 'upgrade-insecure-requests', 'https://media.example.com']) {
    assert.ok(csp.includes(part), part);
  }
  assert.ok(!csp.includes("'unsafe-eval'"), 'üretimde eval yok');
  assert.equal(header(h, 'X-Frame-Options'), 'DENY');
  assert.equal(header(h, 'X-Content-Type-Options'), 'nosniff');
  assert.match(header(h, 'Strict-Transport-Security'), /max-age=63072000/);
  assert.match(header(h, 'Permissions-Policy'), /camera=\(\)/);
});

test('development headers allow the dev tooling but keep framing blocked, without HSTS', () => {
  const h = securityHeaders({ production: false });
  assert.ok(header(h, 'Content-Security-Policy').includes("'unsafe-eval'"));
  assert.ok(header(h, 'Content-Security-Policy').includes("frame-ancestors 'none'"));
  assert.equal(header(h, 'Strict-Transport-Security'), '');
});

test('order e-mails escape customer-typed text (no HTML injection in branded mail)', () => {
  const evil = '<a href="https://phish.example">Hesabınızı doğrulayın</a><script>x()</script>';
  const confirm = generateOrderConfirmationEmail({
    orderNumber: 'PAN-ABC',
    customerName: evil,
    customerEmail: 'a@b.co',
    shippingAddress: evil,
    shippingCity: 'Ankara',
    shippingDistrict: 'Çankaya',
    items: [{ productName: evil, size: 'M', quantity: 1, price: 100 }],
    totalAmount: 100,
    discountAmount: 0,
    couponCode: null,
    paidAt: new Date(),
  });
  assert.ok(!confirm.html.includes('<script>x()'), 'script etiketi kaçışlanır');
  assert.ok(!confirm.html.includes('href="https://phish.example"'), 'bağlantı enjekte edilemez');
  const shipped = generateOrderShippedEmail({ orderNumber: 'PAN-ABC', customerName: evil, customerEmail: 'a@b.co', trackingCompany: evil, trackingCode: evil });
  assert.ok(!shipped.html.includes('<script>x()'));
});
