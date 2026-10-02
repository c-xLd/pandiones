/** Pure helpers for the account page — no React, so they are unit-tested directly. */

export const TAB_KEYS = ['favoriler', 'cuzdan', 'iadeler', 'adresler', 'profil', 'tercihler'] as const;
export type TabKey = (typeof TAB_KEYS)[number];

export const isTabKey = (value: string): value is TabKey => (TAB_KEYS as readonly string[]).includes(value);

export * from '@/lib/orders';

export const categoryLabel = (category?: string | null) =>
  ({ 'ic-giyim': 'İç giyim', 'ev-giyim': 'Ev giyim' } as Record<string, string>)[category ?? ''] ?? null;

export function monogram(name?: string | null) {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'P';
  if (parts.length === 1) return parts[0].slice(0, 2).toLocaleUpperCase('tr-TR');
  return (parts[0][0] + parts[parts.length - 1][0]).toLocaleUpperCase('tr-TR');
}

/** Same minimum as the server's password policy (src/lib/auth/password-policy.ts). */
import { MIN_PASSWORD_LENGTH } from '@/lib/auth/form-validation';

export const PASSWORD_MIN_LENGTH = MIN_PASSWORD_LENGTH;

export function passwordStrength(password: string): { level: 0 | 1 | 2 | 3; label: string } {
  if (!password) return { level: 0, label: '' };
  let score = 0;
  if (password.length >= PASSWORD_MIN_LENGTH) score += 1;
  if (password.length >= 14) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  if (score <= 2) return { level: 1, label: 'Zayıf' };
  if (score <= 3) return { level: 2, label: 'Orta' };
  return { level: 3, label: 'Güçlü' };
}
