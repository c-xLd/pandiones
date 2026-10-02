import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/security/admin-guard';

export const dynamic = 'force-dynamic';

/** Recent security events and 24-hour counts per type, for Yönetim → Güvenlik. */
export async function GET(request: Request) {
  const { session, response } = await requireAdmin(request);
  if (!session) return response;
  const severity = new URL(request.url).searchParams.get('severity');
  const where = severity === 'critical' || severity === 'warning' || severity === 'info' ? { severity } : {};
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [events, counts, openSessions] = await Promise.all([
      prisma.securityEvent.findMany({ where, orderBy: { createdAt: 'desc' }, take: 200 }),
      prisma.securityEvent.groupBy({ by: ['type'], where: { createdAt: { gt: since } }, _count: { _all: true } }),
      prisma.session.count({ where: { revokedAt: null, expiresAt: { gt: new Date() }, mfa: true, user: { role: 'ADMIN' } } }),
    ]);
    return NextResponse.json(
      {
        events: events.map((e) => ({ ...e, createdAt: e.createdAt.toISOString() })),
        last24h: Object.fromEntries(counts.map((c) => [c.type, c._count._all])),
        openAdminSessions: openSessions,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    console.error('Security events read error:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Güvenlik kayıtları okunamadı.' }, { status: 500 });
  }
}
