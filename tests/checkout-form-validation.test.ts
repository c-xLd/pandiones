import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CHECKOUT_FIELD_ORDER,
  isValidTurkishMobile,
  validateCheckoutForm,
  type CheckoutFormData,
} from '../src/lib/checkout/form-validation';

const valid: CheckoutFormData = {
  customerName: 'Aslı Yılmaz',
  customerEmail: 'asli@example.com',
  customerPhone: '0532 123 45 67',
  shippingCity: 'İstanbul',
  shippingDistrict: 'Beşiktaş',
  shippingAddress: 'Cevdet Paşa Cad. No: 64 D: 3',
  shippingNotes: '',
};

test('a complete form has no errors', () => {
  assert.deepEqual(validateCheckoutForm(valid), {});
});

test('whitespace-only required fields are empty', () => {
  const errors = validateCheckoutForm({ ...valid, customerName: '   ', shippingCity: '\t', shippingDistrict: ' ' });
  assert.equal(errors.customerName, 'Ad ve soyadınızı girin.');
  assert.equal(errors.shippingCity, 'Şehir girin.');
  assert.equal(errors.shippingDistrict, 'İlçe girin.');
});

test('email must look like an address', () => {
  assert.equal(validateCheckoutForm({ ...valid, customerEmail: 'asli@' }).customerEmail, 'Geçerli bir e-posta adresi girin.');
  assert.equal(validateCheckoutForm({ ...valid, customerEmail: '' }).customerEmail, 'E-posta adresinizi girin.');
});

test('Turkish mobile numbers are accepted in common formats', () => {
  for (const phone of ['05321234567', '5321234567', '+90 532 123 45 67', '0 (532) 123-45-67', '905321234567']) {
    assert.equal(isValidTurkishMobile(phone), true, phone);
  }
});

test('short or non-mobile numbers are rejected', () => {
  for (const phone of ['053212345', '04321234567', '2121234567', 'abc']) {
    assert.equal(isValidTurkishMobile(phone), false, phone);
  }
  assert.equal(
    validateCheckoutForm({ ...valid, customerPhone: '053212345' }).customerPhone,
    'Cep telefonunuzu 05XX XXX XX XX biçiminde girin.',
  );
});

test('address needs enough detail and notes stay optional', () => {
  assert.equal(
    validateCheckoutForm({ ...valid, shippingAddress: 'Kadıköy' }).shippingAddress,
    'Mahalle, cadde/sokak ve kapı numarasıyla açık adres girin.',
  );
  assert.equal(validateCheckoutForm({ ...valid, shippingNotes: '' }).shippingNotes, undefined);
});

test('field order follows the form layout', () => {
  assert.deepEqual(CHECKOUT_FIELD_ORDER, [
    'customerName', 'customerEmail', 'customerPhone',
    'shippingCity', 'shippingDistrict', 'shippingAddress', 'shippingNotes',
  ]);
});
