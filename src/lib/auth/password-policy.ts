import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { MIN_PASSWORD_LENGTH, MAX_PASSWORD_LENGTH } from './form-validation';

/** Cost for new hashes (≈250 ms on a server core). Existing cost-10 hashes keep working. */
export const BCRYPT_COST = 12;

export const hashPassword = (password: string) => bcrypt.hash(password, BCRYPT_COST);

/** Fixed hash compared against when the e-mail is unknown, so a miss takes as long as a wrong password. */
let dummyHash: Promise<string> | null = null;
export async function compareWithDummy(password: string) {
  dummyHash ??= bcrypt.hash('pandiones-timing-equaliser', BCRYPT_COST);
  await bcrypt.compare(password, await dummyHash);
  return false;
}

/**
 * Have I Been Pwned "range" API (k-anonymity: only the first 5 hex characters of the SHA-1 leave the
 * server). True when the password appears in known breaches. Fails open after 1.5 s or on any error —
 * the length rule and rate limits still apply — and is skipped when PWNED_CHECK=off (tests, offline dev).
 */
export async function isPwnedPassword(password: string): Promise<boolean> {
  if (process.env.PWNED_CHECK === 'off') return false;
  const sha1 = crypto.createHash('sha1').update(password).digest('hex').toUpperCase();
  const prefix = sha1.slice(0, 5);
  const suffix = sha1.slice(5);
  try {
    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { 'Add-Padding': 'true', 'User-Agent': 'Pandiones-Password-Check' },
      signal: AbortSignal.timeout(1500),
    });
    if (!response.ok) return false;
    const body = await response.text();
    return body.split('\n').some((line) => {
      const [hashSuffix, count] = line.trim().split(':');
      return hashSuffix === suffix && Number(count) > 0;
    });
  } catch {
    return false;
  }
}

/** Server-side rule for every new password (register, change, reset). Turkish message or null. */
export async function checkNewPassword(password: unknown, context: { email?: string; name?: string } = {}): Promise<string | null> {
  if (typeof password !== 'string' || password.length === 0) return 'Şifrenizi girin.';
  if (password.length < MIN_PASSWORD_LENGTH) return `Şifre en az ${MIN_PASSWORD_LENGTH} karakter olmalı.`;
  if (password.length > MAX_PASSWORD_LENGTH) return `Şifre en fazla ${MAX_PASSWORD_LENGTH} karakter olabilir.`;
  const lower = password.toLocaleLowerCase('tr-TR');
  const emailName = context.email?.split('@')[0]?.toLocaleLowerCase('tr-TR');
  if (emailName && emailName.length >= 4 && lower.includes(emailName)) return 'Şifre e-posta adresinizi içermemeli.';
  if (/^(.)\1+$/.test(password)) return 'Şifre tek bir karakterin tekrarı olamaz.';
  if (await isPwnedPassword(password)) {
    return 'Bu şifre bilinen veri sızıntılarında geçiyor. Lütfen başka bir şifre seçin.';
  }
  return null;
}
