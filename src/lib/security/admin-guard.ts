import { NextResponse } from 'next/server';
import { getCurrentUser, type UserSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { recordAudit } from '@/lib/audit';

/** Sensitive admin actions need a password/2FA confirmation within this window. */
export const REAUTH_WINDOW_MS = 10 * 60 * 1000;

export const forbidden = () => NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 403, headers: { 'Cache-Control': 'no-store' } });

/** The signed-in admin, or a 403 response. */
export async function requireAdmin(request: Request): Promise<{ session: UserSession; response?: undefined } | { session?: undefined; response: NextResponse }> {
  const session = await getCurrentUser(request);
  if (!session || session.role !== 'ADMIN') return { response: forbidden() };
  return { session };
}

/**
 * Step-up for actions that change money or store-wide behaviour (settings, coupons, gift cards):
 * the admin must have confirmed their 2FA code in the last 10 minutes. The panel answers
 * REAUTH_REQUIRED by asking for the code (/api/auth/reauth) and retrying.
 */
export function requireRecentAuth(session: UserSession, now = Date.now()): NextResponse | null {
  if (session.reauthAt && now - session.reauthAt <= REAUTH_WINDOW_MS) return null;
  return NextResponse.json(
    { error: 'Bu işlem için kimliğinizi yeniden doğrulayın.', code: 'REAUTH_REQUIRED' },
    { status: 401, headers: { 'Cache-Control': 'no-store' } },
  );
}

const PII_LOG_EVERY_MS = 30 * 60 * 1000;

/**
 * Records that an admin opened personal data (customer list, subscribers, messages, stock-alert e-mails).
 * At most one line per admin and resource every 30 minutes, so the log stays readable.
 */
export async function logPersonalDataAccess(session: UserSession, resource: string, summary: string) {
  try {
    const since = new Date(Date.now() - PII_LOG_EVERY_MS);
    const recent = await prisma.auditLog.findFirst({
      where: { actorId: session.userId, action: 'pii.read', entityId: resource, createdAt: { gt: since } },
      select: { id: true },
    });
    if (!recent) await recordAudit(prisma, session, { action: 'pii.read', entity: 'pii', entityId: resource, summary });
  } catch (error) {
    console.error('[AUDIT_WRITE_FAILED] pii.read', resource, error instanceof Error ? error.message : error);
  }
}
