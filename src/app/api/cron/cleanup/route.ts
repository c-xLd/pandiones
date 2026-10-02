import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { pruneRateLimits } from '@/lib/security/rate-limit';

export const dynamic = 'force-dynamic';

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 32) return false;
  const given = request.headers.get('authorization') ?? '';
  const expected = `Bearer ${secret}`;
  return given.length === expected.length && crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

const DAY = 24 * 60 * 60 * 1000;

/**
 * Daily housekeeping: expired rate-limit counters, sessions that ended more than 30 days ago, and spent
 * or expired reset/verification links, and personal data past its retention period (KVKK).
 */
export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: 'Yetkisiz.' }, { status: 401 });
  const now = new Date();
  try {
    const rateLimits = await pruneRateLimits(prisma, now);
    const sessions = await prisma.session.deleteMany({
      where: { OR: [{ expiresAt: { lt: new Date(now.getTime() - 30 * DAY) } }, { revokedAt: { lt: new Date(now.getTime() - 30 * DAY) } }] },
    });
    const tokens = await prisma.passwordResetToken.deleteMany({
      where: { OR: [{ expiresAt: { lt: now } }, { usedAt: { not: null } }] },
    });
    // Retention (docs/SECURITY.md → KVKK): support messages 2 years, activity log 1 year.
    const messages = await prisma.contactMessage.deleteMany({ where: { createdAt: { lt: new Date(now.getTime() - 730 * DAY) } } });
    const audit = await prisma.auditLog.deleteMany({ where: { createdAt: { lt: new Date(now.getTime() - 365 * DAY) } } });
    await prisma.securityEvent.deleteMany({ where: { createdAt: { lt: new Date(now.getTime() - 365 * DAY) } } });
    // Never-paid orders keep their row (numbers, amounts) but lose the buyer's personal data after 30 days.
    const anonymised = await prisma.order.updateMany({
      where: { status: 'ODEME_BASARISIZ', createdAt: { lt: new Date(now.getTime() - 30 * DAY) }, NOT: { customerEmail: 'silindi@anonim.invalid' } },
      data: { customerName: 'Silindi', customerEmail: 'silindi@anonim.invalid', customerPhone: '-', shippingAddress: '-', shippingNotes: null },
    });
    return NextResponse.json({ rateLimits, sessions: sessions.count, tokens: tokens.count, messages: messages.count, audit: audit.count, anonymisedOrders: anonymised.count });
  } catch (error) {
    console.error('Cleanup job failed:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'İş tamamlanamadı.' }, { status: 500 });
  }
}
