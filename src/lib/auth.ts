import crypto from 'crypto';
import { cookies } from 'next/headers';
import { prisma } from './prisma';

const DEFAULT_SECRET = 'pandiones_luxury_secret_session_key_2026';

export function getSecret(): string {
  if (process.env.NODE_ENV === 'production' && !process.env.AUTH_SECRET) {
    throw new Error('AUTH_SECRET environment variable is mandatory in production.');
  }
  return process.env.AUTH_SECRET || DEFAULT_SECRET;
}

export interface UserSession {
  userId: string;
  email: string;
  name: string;
  role: 'CUSTOMER' | 'ADMIN';
  exp?: number;
}

const DEFAULT_SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export function signSession(data: UserSession): string {
  const secret = getSecret();
  const sessionWithExp: UserSession = {
    ...data,
    exp: data.exp || Date.now() + DEFAULT_SESSION_DURATION_MS,
  };

  const payload = Buffer.from(JSON.stringify(sessionWithExp)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('base64url');
  return `${payload}.${signature}`;
}

export function verifySession(token: string): UserSession | null {
  try {
    const secret = getSecret();
    const [payload, signature] = token.split('.');
    if (!payload || !signature) return null;

    const expectedSig = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('base64url');

    if (signature.length !== expectedSig.length) return null;

    if (crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
      const data: UserSession = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'));
      if (data.exp && Date.now() > data.exp) {
        return null; // Expired session
      }
      return data;
    }
    return null;
  } catch {
    return null;
  }
}

export async function getCurrentUser(request?: Request): Promise<UserSession | null> {
  try {
    let token: string | undefined;

    if (request) {
      const authHeader = request.headers.get('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.slice(7).trim();
      }
      if (!token) {
        const cookieHeader = request.headers.get('cookie') || '';
        const match = cookieHeader.match(/pandiones_auth=([^;]+)/);
        if (match) {
          token = match[1];
        }
      }
    }

    if (!token) {
      try {
        const cookieStore = await cookies();
        token = cookieStore.get('pandiones_auth')?.value;
      } catch {
        // cookies() is unavailable outside Next.js request context
      }
    }

    if (!token) return null;
    const session = verifySession(token);
    if (!session) return null;

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, email: true, name: true, role: true },
    });

    if (!user) return null;

    return {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role as 'CUSTOMER' | 'ADMIN',
      exp: session.exp,
    };
  } catch {
    return null;
  }
}

/**
 * Generate a cryptographically signed, time-limited token for guest order viewing
 */
export function generateOrderGuestToken(orderNumber: string): string {
  const secret = getSecret();
  const payload = Buffer.from(
    JSON.stringify({ orderNumber, createdAt: Date.now() })
  ).toString('base64url');
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`guest_order_${payload}`)
    .digest('base64url');
  return `${payload}.${signature}`;
}

/**
 * Verify a guest order token against an order number and expiration window (7 days)
 */
export function verifyOrderGuestToken(orderNumber: string, token: string): boolean {
  try {
    const secret = getSecret();
    const [payloadStr, signature] = token.split('.');
    if (!payloadStr || !signature) return false;

    const expectedSig = crypto
      .createHmac('sha256', secret)
      .update(`guest_order_${payloadStr}`)
      .digest('base64url');

    if (signature.length !== expectedSig.length) return false;
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) return false;

    const data = JSON.parse(Buffer.from(payloadStr, 'base64url').toString('utf-8'));
    if (data.orderNumber !== orderNumber) return false;

    const GUEST_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
    if (Date.now() - data.createdAt > GUEST_TOKEN_TTL_MS) return false;

    return true;
  } catch {
    return false;
  }
}

/**
 * Generate a cryptographically signed token for newsletter unsubscription (KVKK / GDPR compliant)
 */
export function generateNewsletterUnsubscribeToken(email: string): string {
  const secret = getSecret();
  const normalizedEmail = email.trim().toLowerCase();
  const payload = Buffer.from(
    JSON.stringify({ email: normalizedEmail, createdAt: Date.now() })
  ).toString('base64url');
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`newsletter_unsub_${payload}`)
    .digest('base64url');
  return `${payload}.${signature}`;
}

/**
 * Verify newsletter unsubscription token
 */
export function verifyNewsletterUnsubscribeToken(email: string, token: string): boolean {
  try {
    const secret = getSecret();
    const [payloadStr, signature] = token.split('.');
    if (!payloadStr || !signature) return false;

    const expectedSig = crypto
      .createHmac('sha256', secret)
      .update(`newsletter_unsub_${payloadStr}`)
      .digest('base64url');

    if (signature.length !== expectedSig.length) return false;
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) return false;

    const data = JSON.parse(Buffer.from(payloadStr, 'base64url').toString('utf-8'));
    if (data.email !== email.trim().toLowerCase()) return false;

    // Optional 1 year TTL (365 days)
    const UNSUBSCRIBE_TOKEN_TTL_MS = 365 * 24 * 60 * 60 * 1000;
    if (Date.now() - data.createdAt > UNSUBSCRIBE_TOKEN_TTL_MS) return false;

    return true;
  } catch {
    return false;
  }
}

