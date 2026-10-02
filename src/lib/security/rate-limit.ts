import { NextResponse } from 'next/server';
import type { PrismaClient } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { clientIp } from './request';
import { hashIp, sha256 } from './crypto';

/**
 * Fixed-window rate limiting stored in the database (RateLimitBucket), so every server instance shares
 * the same counters. The edge (Cloudflare rate-limit rules) stops floods before they reach the app; this
 * layer enforces per-account and per-route limits the edge cannot see (e-mail, coupon code, order no).
 */
export type LimitRule = { limit: number; windowMs: number };

export const LIMITS = {
  login: { limit: 10, windowMs: 10 * 60 * 1000 }, // per IP
  loginAccount: { limit: 10, windowMs: 15 * 60 * 1000 }, // per e-mail (lockout handled on the account too)
  register: { limit: 5, windowMs: 60 * 60 * 1000 },
  passwordForgot: { limit: 5, windowMs: 60 * 60 * 1000 },
  passwordReset: { limit: 10, windowMs: 60 * 60 * 1000 },
  mfa: { limit: 8, windowMs: 10 * 60 * 1000 },
  orderTrack: { limit: 10, windowMs: 10 * 60 * 1000 },
  codeCheck: { limit: 15, windowMs: 10 * 60 * 1000 }, // coupon / gift-card lookups
  returns: { limit: 5, windowMs: 60 * 60 * 1000 },
  contact: { limit: 5, windowMs: 60 * 60 * 1000 },
  newsletter: { limit: 5, windowMs: 60 * 60 * 1000 },
  stockAlert: { limit: 10, windowMs: 60 * 60 * 1000 },
  checkout: { limit: 10, windowMs: 10 * 60 * 1000 },
  verifyEmail: { limit: 5, windowMs: 60 * 60 * 1000 },
} satisfies Record<string, LimitRule>;

export type LimitResult = { ok: true; remaining: number } | { ok: false; retryAfterSeconds: number; firstOverflow: boolean };

/**
 * Counts one hit for `key`. No interactive transaction: one atomic upsert (+1, or create with 1); if the
 * stored window has already ended, a conditional update starts a new one. Safe under parallel requests.
 */
export async function hit(key: string, rule: LimitRule, db: PrismaClient = prisma, now = new Date()): Promise<LimitResult> {
  const resetAt = new Date(now.getTime() + rule.windowMs);
  let bucket = await db.rateLimitBucket.upsert({
    where: { key },
    create: { key, count: 1, resetAt },
    update: { count: { increment: 1 } },
  });
  if (bucket.resetAt <= now) {
    await db.rateLimitBucket.updateMany({ where: { key, resetAt: { lte: now } }, data: { count: 1, resetAt } });
    bucket = (await db.rateLimitBucket.findUnique({ where: { key } })) ?? { key, count: 1, resetAt };
  }
  if (bucket.count > rule.limit) {
    return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt.getTime() - now.getTime()) / 1000)), firstOverflow: bucket.count === rule.limit + 1 };
  }
  return { ok: true, remaining: rule.limit - bucket.count };
}

/** Clears a key (e.g. the per-account login counter after a successful sign-in). */
export async function resetLimit(key: string, db: PrismaClient = prisma) {
  await db.rateLimitBucket.deleteMany({ where: { key } });
}

export const ipKey = (scope: string, request: Request) => `${scope}:ip:${hashIp(clientIp(request))}`;
export const subjectKey = (scope: string, subject: string) => `${scope}:s:${sha256(subject.trim().toLowerCase()).slice(0, 32)}`;

/** 429, and one security event the first time a window overflows (not for every refused request). */
async function blocked(request: Request, scope: string, by: 'ip' | 'subject', result: Extract<LimitResult, { ok: false }>) {
  if (result.firstOverflow) {
    const { recordSecurityEvent } = await import('./events');
    await recordSecurityEvent('rate.limited', { request, subject: `${scope}:${by}` });
  }
  return tooManyRequests(result.retryAfterSeconds);
}

export function tooManyRequests(retryAfterSeconds: number) {
  const minutes = Math.ceil(retryAfterSeconds / 60);
  return NextResponse.json(
    { error: `Çok fazla deneme yapıldı. Lütfen ${minutes} dakika sonra tekrar deneyin.`, code: 'RATE_LIMITED' },
    { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } },
  );
}

/**
 * Applies the IP limit and, when given, a subject limit (e-mail, code…). Returns a 429 response to send
 * back, or null to carry on. Fails open on a database error: an outage must not lock everyone out, and
 * the edge limits still apply.
 */
export async function enforce(request: Request, scope: keyof typeof LIMITS, subject?: string | null, subjectRule?: LimitRule): Promise<NextResponse | null> {
  // Test suites switch the app-level limits off (they share one fake IP); never honoured in production.
  if (process.env.RATE_LIMIT === 'off' && process.env.NODE_ENV !== 'production') return null;
  try {
    const rule = LIMITS[scope];
    const byIp = await hit(ipKey(scope, request), rule);
    if (!byIp.ok) return blocked(request, scope, 'ip', byIp);
    if (subject) {
      const bySubject = await hit(subjectKey(scope, subject), subjectRule ?? rule);
      if (!bySubject.ok) return blocked(request, scope, 'subject', bySubject);
    }
    return null;
  } catch (error) {
    console.error('[RATE_LIMIT_UNAVAILABLE]', scope, error instanceof Error ? error.message : error);
    return null;
  }
}

/** Removes expired buckets (called by the maintenance cron). */
export async function pruneRateLimits(db: PrismaClient = prisma, now = new Date()) {
  const { count } = await db.rateLimitBucket.deleteMany({ where: { resetAt: { lt: now } } });
  return count;
}
