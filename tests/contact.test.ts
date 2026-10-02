import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeContact, validateContact, CONTACT_SUBJECTS } from '../src/lib/contact/validate';
import { whatsappHref } from '../src/lib/settings/shared';

const valid = {
  name: 'Deniz Kaya',
  email: 'deniz@example.com',
  phone: '',
  orderNumber: '',
  subject: CONTACT_SUBJECTS[0],
  message: 'Siparişimin teslimat adresini değiştirmek istiyorum.',
};

test('a complete message has no errors', () => {
  assert.deepEqual(validateContact(normalizeContact(valid)), {});
});

test('normalizes whitespace, email case and order number case', () => {
  const input = normalizeContact({ ...valid, name: '  Deniz   Kaya ', email: ' DENIZ@Example.com ', orderNumber: 'pan-123456' });
  assert.equal(input.name, 'Deniz Kaya');
  assert.equal(input.email, 'deniz@example.com');
  assert.equal(input.orderNumber, 'PAN-123456');
  assert.deepEqual(validateContact(input), {});
});

test('reports each invalid field', () => {
  const errors = validateContact(
    normalizeContact({ name: 'D', email: 'deniz@', phone: '12', orderNumber: 'X1', subject: 'Bilinmeyen', message: 'kısa' }),
  );
  assert.deepEqual(Object.keys(errors).sort(), ['email', 'message', 'name', 'orderNumber', 'phone', 'subject']);
});

test('non-string input is treated as empty, never crashes', () => {
  const errors = validateContact(normalizeContact({ name: 42, email: null, message: { a: 1 } }));
  assert.ok(errors.name && errors.email && errors.message);
});

test('WhatsApp is shown only for a plausible configured number', () => {
  assert.equal(whatsappHref(''), null);
  assert.equal(whatsappHref('123'), null);
  assert.equal(whatsappHref('+90 (532) 000 00 00'), 'https://wa.me/905320000000');
});
