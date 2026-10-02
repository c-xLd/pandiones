import crypto from 'node:crypto';
import { sha256 } from './crypto';

/** RFC 6238 TOTP (SHA-1, 6 digits, 30 s) — what Google Authenticator, 1Password, Authy etc. use. No dependency. */
const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const STEP_SECONDS = 30;
const DIGITS = 6;

export function generateTotpSecret(): string {
  const bytes = crypto.randomBytes(20);
  let bits = '';
  for (const byte of bytes) bits += byte.toString(2).padStart(8, '0');
  let out = '';
  for (let i = 0; i + 5 <= bits.length; i += 5) out += BASE32[parseInt(bits.slice(i, i + 5), 2)];
  return out;
}

function base32ToBuffer(secret: string): Buffer {
  const clean = secret.replace(/=+$/, '').replace(/\s+/g, '').toUpperCase();
  let bits = '';
  for (const char of clean) {
    const index = BASE32.indexOf(char);
    if (index < 0) throw new Error('invalid base32');
    bits += index.toString(2).padStart(5, '0');
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(bytes);
}

export function totpAt(secret: string, timeMs: number): string {
  const counter = Math.floor(timeMs / 1000 / STEP_SECONDS);
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(counter));
  const hmac = crypto.createHmac('sha1', base32ToBuffer(secret)).update(msg).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code = ((hmac.readUInt32BE(offset) & 0x7fffffff) % 10 ** DIGITS).toString().padStart(DIGITS, '0');
  return code;
}

/**
 * Accepts the current step and one either side (clock drift). Returns the matched step so the caller
 * can refuse to accept the same code twice (replay); null when the code does not match.
 */
export function verifyTotp(secret: string, code: string, now = Date.now(), lastUsedStep?: number | null): number | null {
  const clean = code.replace(/\s+/g, '');
  if (!/^\d{6}$/.test(clean)) return null;
  const current = Math.floor(now / 1000 / STEP_SECONDS);
  for (const delta of [0, -1, 1]) {
    const step = current + delta;
    if (lastUsedStep !== undefined && lastUsedStep !== null && step <= lastUsedStep) continue;
    const expected = totpAt(secret, step * STEP_SECONDS * 1000);
    if (crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(clean))) return step;
  }
  return null;
}

export function otpauthUri(secret: string, accountEmail: string, issuer = 'Pandiones') {
  const label = encodeURIComponent(`${issuer}:${accountEmail}`);
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=${DIGITS}&period=${STEP_SECONDS}`;
}

/** Ten one-time backup codes like `7KQ2-M9XA`; only their hashes are stored. */
export function generateBackupCodes(count = 10) {
  const alphabet = '23456789ABCDEFGHJKMNPQRSTVWXYZ';
  const codes = Array.from({ length: count }, () => {
    let raw = '';
    for (let i = 0; i < 8; i += 1) raw += alphabet[crypto.randomInt(alphabet.length)];
    return `${raw.slice(0, 4)}-${raw.slice(4)}`;
  });
  return { codes, hashes: codes.map(hashBackupCode) };
}

export const hashBackupCode = (code: string) => sha256(`backup:${code.replace(/[\s-]/g, '').toUpperCase()}`);
