import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from './form-validation';

/** Browser-safe rules shared by the reset pages and the server (src/lib/auth/password-reset.ts). */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function normalizeResetEmail(value: unknown): string | null {
  const email = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return EMAIL.test(email) && email.length <= 254 ? email : null;
}

export function validateNewPassword(password: unknown, confirm: unknown): string | null {
  if (typeof password !== 'string' || password.length === 0) return 'Yeni şifrenizi girin.';
  if (password.length < MIN_PASSWORD_LENGTH) return `Şifre en az ${MIN_PASSWORD_LENGTH} karakter olmalı.`;
  if (password.length > MAX_PASSWORD_LENGTH) return `Şifre en fazla ${MAX_PASSWORD_LENGTH} karakter olabilir.`;
  if (password !== confirm) return 'Şifreler eşleşmiyor.';
  return null;
}
