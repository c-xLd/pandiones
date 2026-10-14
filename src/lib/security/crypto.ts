import crypto from 'node:crypto';

/**
 * One root secret (AUTH_SECRET, ≥32 characters) and a separate HKDF-derived key per purpose, so a token
 * signed for one job (guest order link) can never be replayed as another (session). There is no built-in
 * fallback: without AUTH_SECRET the server refuses to sign or verify anything.
 */
export type KeyPurpose = 'session' | 'mfa-pending' | 'guest-order' | 'newsletter-unsub' | 'totp-encryption' | 'ip-hash' | 'admin-device';

const MIN_SECRET_LENGTH = 32;
const keyCache = new Map<string, Buffer>();

export function rootSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < MIN_SECRET_LENGTH) {
    throw new Error(`AUTH_SECRET tanımlı değil ya da ${MIN_SECRET_LENGTH} karakterden kısa. Oturum ve imzalı bağlantılar çalışmaz.`);
  }
  return secret;
}

export function deriveKey(purpose: KeyPurpose): Buffer {
  const root = rootSecret();
  const cacheKey = `${purpose}:${root.length}:${crypto.createHash('sha256').update(root).digest('hex').slice(0, 16)}`;
  const cached = keyCache.get(cacheKey);
  if (cached) return cached;
  const key = Buffer.from(crypto.hkdfSync('sha256', root, 'pandiones', `pandiones:${purpose}`, 32));
  keyCache.set(cacheKey, key);
  return key;
}

const b64 = (value: Buffer | string) => Buffer.from(value).toString('base64url');

/** `<base64url(json)>.<hmac>` signed with the purpose key. */
export function signToken(purpose: KeyPurpose, payload: object): string {
  const body = b64(JSON.stringify(payload));
  const mac = crypto.createHmac('sha256', deriveKey(purpose)).update(body).digest('base64url');
  return `${body}.${mac}`;
}

/** Verified payload, or null for a malformed, forged or other-purpose token. Does not check expiry. */
export function verifyToken<T>(purpose: KeyPurpose, token: string | null | undefined): T | null {
  if (!token || token.length > 2048) return null;
  const [body, mac] = token.split('.');
  if (!body || !mac) return null;
  try {
    const expected = crypto.createHmac('sha256', deriveKey(purpose)).update(body).digest('base64url');
    if (mac.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return null;
    return JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as T;
  } catch {
    return null;
  }
}

/** AES-256-GCM with a random 12-byte IV: `v1.<iv>.<tag>.<ciphertext>` (base64url parts). */
export function encryptSecret(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', deriveKey('totp-encryption'), iv);
  const data = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return ['v1', b64(iv), b64(cipher.getAuthTag()), b64(data)].join('.');
}

export function decryptSecret(sealed: string): string | null {
  const [version, iv, tag, data] = sealed.split('.');
  if (version !== 'v1' || !iv || !tag || !data) return null;
  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', deriveKey('totp-encryption'), Buffer.from(iv, 'base64url'));
    decipher.setAuthTag(Buffer.from(tag, 'base64url'));
    return Buffer.concat([decipher.update(Buffer.from(data, 'base64url')), decipher.final()]).toString('utf8');
  } catch {
    return null;
  }
}

export const sha256 = (value: string) => crypto.createHash('sha256').update(value).digest('hex');

/** Keyed hash of an IP so it can be compared and rate-limited without storing the address itself. */
export const hashIp = (ip: string) => crypto.createHmac('sha256', deriveKey('ip-hash')).update(ip).digest('hex').slice(0, 32);

export const randomId = (bytes = 24) => crypto.randomBytes(bytes).toString('base64url');

/** Constant-time string comparison (different lengths are simply unequal). */
export function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}
