import { isValidTurkishMobile } from '@/lib/checkout/form-validation';

export type AuthMode = 'login' | 'register';
export type AuthFormValues = { name: string; email: string; password: string; phone: string };
export type AuthFieldErrors = Partial<Record<keyof AuthFormValues, string>>;

/** Same limits as the server (src/lib/auth/password-policy.ts), which also refuses breached passwords. */
export const MIN_PASSWORD_LENGTH = 10;
export const MAX_PASSWORD_LENGTH = 128;
export const MAX_NAME_LENGTH = 80;
export const AUTH_FIELD_ORDER: (keyof AuthFormValues)[] = ['name', 'email', 'password', 'phone'];

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateAuthForm(mode: AuthMode, values: AuthFormValues): AuthFieldErrors {
  const errors: AuthFieldErrors = {};
  const email = values.email.trim();

  if (mode === 'register') {
    const name = values.name.trim();
    if (!name) errors.name = 'Ad ve soyadınızı girin.';
    else if (name.length < 2 || name.length > MAX_NAME_LENGTH) errors.name = `Ad soyad 2–${MAX_NAME_LENGTH} karakter olmalı.`;
  }

  if (!email) errors.email = 'E-posta adresinizi girin.';
  else if (!EMAIL.test(email) || email.length > 254) errors.email = 'Geçerli bir e-posta adresi girin.';

  if (!values.password) errors.password = 'Şifrenizi girin.';
  else if (mode === 'register' && values.password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `Şifre en az ${MIN_PASSWORD_LENGTH} karakter olmalı.`;
  } else if (values.password.length > MAX_PASSWORD_LENGTH) {
    errors.password = `Şifre en fazla ${MAX_PASSWORD_LENGTH} karakter olabilir.`;
  }

  if (mode === 'register' && values.phone.trim() && !isValidTurkishMobile(values.phone)) {
    errors.phone = 'Cep telefonunuzu 05XX XXX XX XX biçiminde girin.';
  }

  return errors;
}
