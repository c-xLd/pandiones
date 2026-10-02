import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, revokeAllSessions, revokeSession } from '@/lib/auth';
import { readJson } from '@/lib/security/request';

export const dynamic = 'force-dynamic';

function deviceLabel(ua: string | null) {
  if (!ua) return 'Bilinmeyen cihaz';
  const os = /iPhone|iPad/.test(ua) ? 'iOS' : /Android/.test(ua) ? 'Android' : /Windows/.test(ua) ? 'Windows' : /Mac OS/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : 'Cihaz';
  const browser = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Tarayıcı';
  return `${browser} · ${os}`;
}

/** The account's open sessions (device, last activity); the current one is marked. */
export async function GET(request: Request) {
  const session = await getCurrentUser(request);
  if (!session) return NextResponse.json({ error: 'Oturum açmanız gerekiyor.' }, { status: 401 });
  const rows = await prisma.session.findMany({
    where: { userId: session.userId, revokedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { lastSeenAt: 'desc' },
    select: { id: true, createdAt: true, lastSeenAt: true, userAgent: true },
    take: 50,
  });
  return NextResponse.json({
    sessions: rows.map((row) => ({
      id: row.id,
      device: deviceLabel(row.userAgent),
      createdAt: row.createdAt,
      lastSeenAt: row.lastSeenAt,
      current: row.id === session.sessionId,
    })),
  });
}

/** `{ id }` ends one session of this account; `{ others: true }` ends every session except this one. */
export async function DELETE(request: Request) {
  const session = await getCurrentUser(request);
  if (!session) return NextResponse.json({ error: 'Oturum açmanız gerekiyor.' }, { status: 401 });
  const parsed = await readJson<{ id?: unknown; others?: unknown }>(request, 1024);
  if (!parsed.ok) return NextResponse.json({ error: 'Geçersiz istek.' }, { status: parsed.status });
  if (parsed.body.others === true) {
    const count = await revokeAllSessions(session.userId, session.sessionId);
    return NextResponse.json({ success: true, revoked: count });
  }
  const id = typeof parsed.body.id === 'string' ? parsed.body.id : '';
  const owned = await prisma.session.findFirst({ where: { id, userId: session.userId }, select: { id: true } });
  if (!owned) return NextResponse.json({ error: 'Oturum bulunamadı.' }, { status: 404 });
  await revokeSession(owned.id);
  return NextResponse.json({ success: true, revoked: 1 });
}
