import { isValidTurkishMobile } from '@/lib/checkout/form-validation';

export type AuthMode = 'login' | 'register';
export type AuthFormValues = { name: string; email: string; password: string; phone: string };
export type AuthFieldErrors = Partial<Record<keyof AuthFormValues, string>>;

/** Mirrors src/app/api/auth/register/route.ts. */
export const MIN_PASSWORD_LENGTH = 6;
export const AUTH_FIELD_ORDER: (keyof AuthFormValues)[] = ['name', 'email', 'password', 'phone'];

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateAuthForm(mode: AuthMode, values: AuthFormValues): AuthFieldErrors {
  const errors: AuthFieldErrors = {};
  const email = values.email.trim();

  if (mode === 'register' && !values.name.trim()) errors.name = 'Ad ve soyadınızı girin.';

  if (!email) errors.email = 'E-posta adresinizi girin.';
  else if (!EMAIL.test(email)) errors.email = 'Geçerli bir e-posta adresi girin.';

  if (!values.password) errors.password = 'Şifrenizi girin.';
  else if (mode === 'register' && values.password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `Şifre en az ${MIN_PASSWORD_LENGTH} karakter olmalı.`;
  }

  if (mode === 'register' && values.phone.trim() && !isValidTurkishMobile(values.phone)) {
    errors.phone = 'Cep telefonunuzu 05XX XXX XX XX biçiminde girin.';
  }

  return errors;
}
