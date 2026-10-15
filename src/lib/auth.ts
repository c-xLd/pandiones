import { cookies } from 'next/headers';
import type { PrismaClient } from '@prisma/client';
import { prisma } from './prisma';
import { hashIp, randomId, signToken, verifyToken } from './security/crypto';
import { clientIp, userAgent } from './security/request';

/**
 * Sessions live in the database (model Session). The cookie holds only a signed `{ sid, uid, role, mfa,
 * exp }`; every request re-reads the row, so signing out, a password change or "close other sessions"
 * ends a session at once. Admin sessions exist only after the second factor (mfa) and last 8 h with a
 * 30-minute inactivity window. Keys come from AUTH_SECRET via src/lib/security/crypto.ts.
 */

export interface UserSession {
  userId: string;
  email: string;
  name: string;
  role: 'CUSTOMER' | 'ADMIN';
  sessionId: string;
  mfa: boolean;
  /** Absolute end (ms). */
  exp: number;
  /** Admin only: end of the inactivity window (ms). */
  idle?: number;
  /** Last password/2FA confirmation in this session (ms); sensitive admin actions need it recent. */
  reauthAt?: number;
}

type SessionClaims = { sid: string; uid: string; role: 'CUSTOMER' | 'ADMIN'; mfa: boolean; exp: number };

export const CUSTOMER_SESSION_MS = 30 * 24 * 60 * 60 * 1000;
export const ADMIN_SESSION_MS = 8 * 60 * 60 * 1000;
export const ADMIN_IDLE_MS = 30 * 60 * 1000;
const LAST_SEEN_EVERY_MS = 5 * 60 * 1000;

/** `__Host-` cookies are HTTPS-only, bound to this host, path / — used in production. */
export const SESSION_COOKIE = process.env.NODE_ENV === 'production' ? '__Host-pandiones_auth' : 'pandiones_auth';
export const MFA_COOKIE = process.env.NODE_ENV === 'production' ? '__Host-pandiones_mfa' : 'pandiones_mfa';
/** Set on an admin's browser after a 2FA sign-in; see adminDeviceCookie. */
export const ADMIN_DEVICE_COOKIE = process.env.NODE_ENV === 'production' ? '__Host-pandiones_admdev' : 'pandiones_admdev';
export const ADMIN_DEVICE_MS = 90 * 24 * 60 * 60 * 1000;

export function sessionCookie(token: string, maxAgeSeconds: number, options: { strict?: boolean; name?: string } = {}) {
  return {
    name: options.name ?? SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    // Admin sessions are never sent on cross-site navigations; customer sessions survive the iyzico return.
    sameSite: options.strict ? ('strict' as const) : ('lax' as const),
    path: '/',
    maxAge: Math.max(0, Math.floor(maxAgeSeconds)),
  };
}

export function clearedCookie(name = SESSION_COOKIE) {
  return sessionCookie('', 0, { name });
}

/** One cookie from the request's Cookie header (no regex: names contain dashes). */
export function cookieValue(request: Request, name: string): string | null {
  for (const part of (request.headers.get('cookie') || '').split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return rest.join('=') || null;
  }
  return null;
}

/** Signature + expiry only (no database). The middleware uses it for cheap checks. */
export function readSessionClaims(token: string | null | undefined): SessionClaims | null {
  const claims = verifyToken<SessionClaims>('session', token);
  if (!claims || typeof claims.sid !== 'string' || typeof claims.exp !== 'number' || Date.now() > claims.exp) return null;
  return claims;
}

/**
 * "This browser has signed in to the panel": a signed, HttpOnly marker kept for 90 days and left in place on
 * sign-out. It grants nothing. When the session is gone (idle, 8 h, sign-out) the middleware uses it to show
 * the sign-in page on /yonetim instead of the 404 every other visitor gets.
 */
export function adminDeviceCookie(userId: string, now = Date.now()) {
  const token = signToken('admin-device', { uid: userId, exp: now + ADMIN_DEVICE_MS });
  return sessionCookie(token, ADMIN_DEVICE_MS / 1000, { strict: true, name: ADMIN_DEVICE_COOKIE });
}

export function isAdminDevice(token: string | null | undefined, now = Date.now()): boolean {
  const claims = verifyToken<{ uid: string; exp: number }>('admin-device', token);
  return Boolean(claims && typeof claims.uid === 'string' && typeof claims.exp === 'number' && now <= claims.exp);
}

/**
 * True when the cookie carries this server's signature for an admin session that passed 2FA, whatever its
 * age. Grants nothing: the middleware only uses it to send an admin whose session ended to the sign-in page
 * instead of the 404 strangers get (only a real admin sign-in can produce such a cookie).
 */
export function hadAdminSession(token: string | null | undefined): boolean {
  const claims = verifyToken<SessionClaims>('session', token);
  return Boolean(claims && claims.role === 'ADMIN' && claims.mfa === true);
}

/**
 * Opens a session. Refuses an ADMIN session without a verified second factor — the only callers that
 * pass `mfa: true` are the 2FA verify/setup routes.
 */
export async function createSession(
  user: { id: string; role: string },
  options: { mfa: boolean; request?: Request; db?: PrismaClient; now?: number },
) {
  const db = options.db ?? prisma;
  const now = options.now ?? Date.now();
  const role = user.role === 'ADMIN' ? 'ADMIN' : 'CUSTOMER';
  if (role === 'ADMIN' && !options.mfa) throw new Error('Admin session requires a verified second factor.');

  const exp = now + (role === 'ADMIN' ? ADMIN_SESSION_MS : CUSTOMER_SESSION_MS);
  const idle = role === 'ADMIN' ? now + ADMIN_IDLE_MS : undefined;
  const sid = randomId(24);
  await db.session.create({
    data: {
      id: sid,
      userId: user.id,
      expiresAt: new Date(exp),
      idleExpiresAt: idle ? new Date(idle) : null,
      mfa: options.mfa,
      reauthAt: new Date(now),
      userAgent: options.request ? userAgent(options.request) : null,
      ipHash: options.request ? hashIp(clientIp(options.request)) : null,
    },
  });
  const token = signToken('session', { sid, uid: user.id, role, mfa: options.mfa, exp } satisfies SessionClaims);
  return { token, sessionId: sid, exp, idle, maxAgeSeconds: (exp - now) / 1000, strict: role === 'ADMIN' };
}

async function tokenFrom(request?: Request): Promise<string | undefined> {
  if (request) {
    const auth = request.headers.get('authorization');
    if (auth?.startsWith('Bearer ')) return auth.slice(7).trim();
    const match = cookieValue(request, SESSION_COOKIE) || cookieValue(request, 'pandiones_auth');
    if (match) return match;
  }
  try {
    const jar = await cookies();
    return jar.get(SESSION_COOKIE)?.value || jar.get('pandiones_auth')?.value;
  } catch {
    return undefined; // outside a Next request
  }
}

/** The signed-in user, or null. Checks signature, expiry, revocation, inactivity and the admin 2FA rule. */
export async function getCurrentUser(request?: Request): Promise<UserSession | null> {
  try {
    const claims = readSessionClaims(await tokenFrom(request));
    if (!claims) return null;

    const session = await prisma.session.findUnique({
      where: { id: claims.sid },
      include: { user: { select: { id: true, email: true, name: true, role: true, passwordChangedAt: true } } },
    });
    const now = new Date();
    if (!session || session.userId !== claims.uid || session.revokedAt || session.expiresAt <= now) return null;
    if (session.idleExpiresAt && session.idleExpiresAt <= now) return null;
    const { user } = session;
    if (user.passwordChangedAt && session.createdAt < user.passwordChangedAt) return null;
    // A customer session is never an admin session, even if the account was promoted meanwhile.
    if (user.role === 'ADMIN' && (!session.mfa || !session.idleExpiresAt)) return null;

    if (now.getTime() - session.lastSeenAt.getTime() > LAST_SEEN_EVERY_MS) {
      await prisma.session.update({ where: { id: session.id }, data: { lastSeenAt: now } }).catch(() => {});
    }
    return {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role === 'ADMIN' ? 'ADMIN' : 'CUSTOMER',
      sessionId: session.id,
      mfa: session.mfa,
      exp: session.expiresAt.getTime(),
      idle: session.idleExpiresAt?.getTime(),
      reauthAt: session.reauthAt?.getTime(),
    };
  } catch {
    return null;
  }
}

/** Moves an admin session's inactivity deadline forward (never past its absolute end). */
export async function renewAdminSession(session: UserSession, now = Date.now()) {
  if (session.role !== 'ADMIN') return null;
  const idle = Math.min(now + ADMIN_IDLE_MS, session.exp);
  await prisma.session.update({ where: { id: session.sessionId }, data: { idleExpiresAt: new Date(idle), lastSeenAt: new Date(now) } });
  return { exp: session.exp, idle };
}

export async function revokeSession(sessionId: string, db: PrismaClient = prisma) {
  await db.session.updateMany({ where: { id: sessionId, revokedAt: null }, data: { revokedAt: new Date() } });
}

/** Ends every session of the user, optionally keeping one (the device that made the change). */
export async function revokeAllSessions(userId: string, exceptSessionId?: string, db: PrismaClient = prisma) {
  const { count } = await db.session.updateMany({
    where: { userId, revokedAt: null, ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}) },
    data: { revokedAt: new Date() },
  });
  return count;
}

/* ---------- Pending second factor (between password and code) ---------- */

export const MFA_PENDING_MS = 10 * 60 * 1000;
type MfaPending = { uid: string; purpose: 'verify' | 'setup'; exp: number; n: string };

export function issueMfaPending(userId: string, purpose: MfaPending['purpose'], now = Date.now()) {
  return { token: signToken('mfa-pending', { uid: userId, purpose, exp: now + MFA_PENDING_MS, n: randomId(9) } satisfies MfaPending), maxAgeSeconds: MFA_PENDING_MS / 1000 };
}

export async function readMfaPending(request: Request): Promise<MfaPending | null> {
  const match = cookieValue(request, MFA_COOKIE);
  let token = match ?? undefined;
  if (!token) {
    try {
      token = (await cookies()).get(MFA_COOKIE)?.value;
    } catch {
      token = undefined;
    }
  }
  const pending = verifyToken<MfaPending>('mfa-pending', token);
  return pending && Date.now() < pending.exp ? pending : null;
}

/* ---------- Signed links ---------- */

/** Guest access to a just-placed order: a signed, 24-hour, HttpOnly cookie — never a token in the URL
 *  (URLs end up in history, logs and Referer headers). Registered buyers use their account instead. */
const GUEST_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
export const GUEST_ORDER_COOKIE = process.env.NODE_ENV === 'production' ? '__Host-pandiones_order' : 'pandiones_order';

export function guestOrderCookie(orderNumber: string) {
  return sessionCookie(generateOrderGuestToken(orderNumber), GUEST_TOKEN_TTL_MS / 1000, { name: GUEST_ORDER_COOKIE });
}

/** True when the request carries a valid guest cookie (or legacy header token) for this order. */
export async function hasGuestOrderAccess(orderNumber: string, request?: Request): Promise<boolean> {
  let token = request?.headers.get('x-order-token') ?? undefined;
  if (!token && request) {
    token = cookieValue(request, GUEST_ORDER_COOKIE) ?? undefined;
  }
  if (!token) {
    try {
      token = (await cookies()).get(GUEST_ORDER_COOKIE)?.value;
    } catch {
      token = undefined;
    }
  }
  return Boolean(token && verifyOrderGuestToken(orderNumber, token));
}

export function generateOrderGuestToken(orderNumber: string): string {
  return signToken('guest-order', { o: orderNumber, t: Date.now() });
}

export function verifyOrderGuestToken(orderNumber: string, token: string): boolean {
  const data = verifyToken<{ o: string; t: number }>('guest-order', token);
  return Boolean(data && data.o === orderNumber && Date.now() - data.t <= GUEST_TOKEN_TTL_MS);
}

const UNSUBSCRIBE_TOKEN_TTL_MS = 365 * 24 * 60 * 60 * 1000;

export function generateNewsletterUnsubscribeToken(email: string): string {
  return signToken('newsletter-unsub', { e: email.trim().toLowerCase(), t: Date.now() });
}

export function verifyNewsletterUnsubscribeToken(email: string, token: string): boolean {
  const data = verifyToken<{ e: string; t: number }>('newsletter-unsub', token);
  return Boolean(data && data.e === email.trim().toLowerCase() && Date.now() - data.t <= UNSUBSCRIBE_TOKEN_TTL_MS);
}
