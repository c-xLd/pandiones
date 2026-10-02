import assert from 'node:assert/strict';
import test from 'node:test';
import { isValidAlertEmail, validateStockAlertInput } from '../src/lib/products/stock-alert';

test('stock alert input: trims and lower-cases email, requires product, size and a real-looking email', () => {
  const ok = validateStockAlertInput({ productId: ' p1 ', size: ' L ', email: ' Ayse@Ornek.COM ' });
  assert.deepEqual(ok, { ok: true, value: { productId: 'p1', size: 'L', email: 'ayse@ornek.com' } });

  assert.equal(validateStockAlertInput(null).ok, false);
  assert.equal(validateStockAlertInput({ productId: 'p1', size: '', email: 'a@b.co' }).ok, false);
  assert.equal(validateStockAlertInput({ productId: '', size: 'L', email: 'a@b.co' }).ok, false);
  assert.equal(validateStockAlertInput({ productId: 'p1', size: 'L', email: 'a@b' }).ok, false);
  assert.equal(validateStockAlertInput({ productId: 'p1', size: 'L', email: 42 }).ok, false);
});

test('alert email check rejects spaces, missing parts and over-long addresses', () => {
  assert.equal(isValidAlertEmail('ayse@ornek.com'), true);
  assert.equal(isValidAlertEmail('ayse ornek@ornek.com'), false);
  assert.equal(isValidAlertEmail('@ornek.com'), false);
  assert.equal(isValidAlertEmail(`${'a'.repeat(250)}@b.co`), false);
});
