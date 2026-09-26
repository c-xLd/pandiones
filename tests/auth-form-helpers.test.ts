import assert from 'node:assert/strict';
import test from 'node:test';
import { defaultPathForRole, safeRedirectPath } from '../src/lib/auth/safe-redirect';
import { AUTH_FIELD_ORDER, MIN_PASSWORD_LENGTH, validateAuthForm } from '../src/lib/auth/form-validation';

test('same-site paths are allowed, including query strings', () => {
  assert.equal(safeRedirectPath('/hesabim#siparisler'), '/hesabim#siparisler');
  assert.equal(safeRedirectPath('/siparis-onay/PND-1?token=abc'), '/siparis-onay/PND-1?token=abc');
});

test('anything that could leave the site is rejected', () => {
  for (const raw of ['https://evil.test', '//evil.test', '/\\evil.test', '/\t/evil.test', ' /hesabim', 'javascript:alert(1)', 'hesabim', '', null, undefined]) {
    assert.equal(safeRedirectPath(raw), null, String(raw));
  }
});

test('default destination depends on role', () => {
  assert.equal(defaultPathForRole('ADMIN'), '/yonetim');
  assert.equal(defaultPathForRole('CUSTOMER'), '/hesabim');
  assert.equal(defaultPathForRole(undefined), '/hesabim');
});

const empty = { name: '', email: '', password: '', phone: '' };

test('login needs a valid email and a password', () => {
  assert.deepEqual(validateAuthForm('login', empty), {
    email: 'E-posta adresinizi girin.',
    password: 'Şifrenizi girin.',
  });
  assert.equal(validateAuthForm('login', { ...empty, email: 'asli@', password: 'x' }).email, 'Geçerli bir e-posta adresi girin.');
  assert.deepEqual(validateAuthForm('login', { ...empty, email: 'asli@example.com', password: 'x' }), {}, 'login does not enforce length');
});

test('register enforces the server password rule and optional valid phone', () => {
  const base = { name: 'Aslı Yılmaz', email: 'asli@example.com', password: '123456', phone: '' };
  assert.deepEqual(validateAuthForm('register', base), {});
  assert.equal(MIN_PASSWORD_LENGTH, 6);
  assert.equal(validateAuthForm('register', { ...base, password: '12345' }).password, 'Şifre en az 6 karakter olmalı.');
  assert.equal(validateAuthForm('register', { ...base, name: '  ' }).name, 'Ad ve soyadınızı girin.');
  assert.equal(validateAuthForm('register', { ...base, phone: '0532' }).phone, 'Cep telefonunuzu 05XX XXX XX XX biçiminde girin.');
  assert.deepEqual(validateAuthForm('register', { ...base, phone: '0532 123 45 67' }), {});
});

test('field order follows the form', () => {
  assert.deepEqual(AUTH_FIELD_ORDER, ['name', 'email', 'password', 'phone']);
});
