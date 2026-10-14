import { NextResponse } from 'next/server';
import { recordSecurityEvent } from '@/lib/security/events';
import { prisma } from '@/lib/prisma';
import { MFA_COOKIE, adminDeviceCookie, clearedCookie, createSession, getCurrentUser, readMfaPending, sessionCookie } from '@/lib/auth';
import { beginTotpSetup, confirmTotpSetup } from '@/lib/auth/mfa-service';
import { sendAccountEmail } from '@/lib/email/provider';
import { enforce } from '@/lib/security/rate-limit';
import { readJson } from '@/lib/security/request';

export const dynamic = 'force-dynamic';

/**
 * Turning on 2FA. Two callers: an admin on first sign-in (holding the "setup" pending cookie and no
 * session yet — 2FA is mandatory for admins) and a signed-in customer from the account page (optional).
 */
async function caller(request: Request) {
  const pending = await readMfaPending(request);
  if (pending?.purpose === 'setup') return { userId: pending.uid, viaPending: true as const };
  const session = await getCurrentUser(request);
  if (session) return { userId: session.userId, viaPending: false as const, sessionId: session.sessionId };
  return null;
}

export async function GET(request: Request) {
  const who = await caller(request);
  if (!who) return NextResponse.json({ error: 'Oturum bulunamadı. Lütfen yeniden giriş yapın.' }, { status: 401 });
  const setup = await beginTotpSetup(prisma, who.userId);
  if (setup.alreadyEnabled) return NextResponse.json({ error: 'İki adımlı doğrulama zaten açık.' }, { status: 409 });
  return NextResponse.json({ secret: setup.secret, uri: setup.uri, qrSvg: setup.qrSvg }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  const who = await caller(request);
  if (!who) return NextResponse.json({ error: 'Oturum bulunamadı. Lütfen yeniden giriş yapın.' }, { status: 401 });
  const limited = await enforce(request, 'mfa', who.userId);
  if (limited) return limited;
  const parsed = await readJson<{ code?: unknown }>(request, 1024);
  if (!parsed.ok) return NextResponse.json({ error: 'Geçersiz istek.' }, { status: parsed.status });
  const code = typeof parsed.body.code === 'string' ? parsed.body.code : '';

  const backupCodes = await confirmTotpSetup(prisma, who.userId, code);
  if (!backupCodes) return NextResponse.json({ error: 'Kod hatalı. Uygulamada görünen 6 haneli kodu girin.', field: 'code' }, { status: 400 });

  const user = await prisma.user.findUniqueOrThrow({ where: { id: who.userId }, select: { id: true, role: true, email: true, name: true } });
  await sendAccountEmail({ kind: 'mfa-enabled', recipientEmail: user.email, recipientName: user.name }).catch(() => {});
  const response = NextResponse.json({ success: true, backupCodes }, { headers: { 'Cache-Control': 'no-store' } });
  if (who.viaPending) {
    const session = await createSession(user, { mfa: true, request });
    if (user.role === 'ADMIN') await recordSecurityEvent('admin.login', { request, subject: user.id, detail: '2FA ilk kurulum' });
    response.cookies.set(sessionCookie(session.token, session.maxAgeSeconds, { strict: session.strict }));
    response.cookies.set(clearedCookie(MFA_COOKIE));
    if (user.role === 'ADMIN') response.cookies.set(adminDeviceCookie(user.id));
  } else {
    // The current customer session has just proved the second factor.
    await prisma.session.update({ where: { id: who.sessionId }, data: { mfa: true } });
  }
  return response;
}
