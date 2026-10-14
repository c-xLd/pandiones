import { NextResponse } from 'next/server';
import { recordSecurityEvent } from '@/lib/security/events';
import { prisma } from '@/lib/prisma';
import { MFA_COOKIE, adminDeviceCookie, clearedCookie, createSession, readMfaPending, sessionCookie } from '@/lib/auth';
import { remainingBackupCodes, verifySecondFactor } from '@/lib/auth/mfa-service';
import { enforce } from '@/lib/security/rate-limit';
import { readJson } from '@/lib/security/request';

export const dynamic = 'force-dynamic';

/** Second step of sign-in: a code from the authenticator app, or a backup code. */
export async function POST(request: Request) {
  const pending = await readMfaPending(request);
  if (!pending || pending.purpose !== 'verify') {
    return NextResponse.json({ error: 'Doğrulama süresi doldu. Lütfen yeniden giriş yapın.', code: 'MFA_EXPIRED' }, { status: 401 });
  }
  const limited = await enforce(request, 'mfa', pending.uid);
  if (limited) return limited;
  const parsed = await readJson<{ code?: unknown }>(request, 1024);
  if (!parsed.ok) return NextResponse.json({ error: 'Geçersiz istek.' }, { status: parsed.status });
  const code = typeof parsed.body.code === 'string' ? parsed.body.code.slice(0, 20) : '';

  try {
    const method = await verifySecondFactor(prisma, pending.uid, code);
    if (!method) {
      await recordSecurityEvent('mfa.failed', { request, subject: pending.uid });
      return NextResponse.json({ error: 'Kod hatalı ya da süresi geçmiş. Uygulamadaki güncel kodu girin.', field: 'code' }, { status: 401 });
    }
    const user = await prisma.user.findUniqueOrThrow({ where: { id: pending.uid }, select: { id: true, role: true } });
    const session = await createSession(user, { mfa: true, request });
    if (user.role === 'ADMIN') await recordSecurityEvent('admin.login', { request, subject: user.id, detail: method === 'backup' ? 'Yedek kodla giriş' : undefined });
    const left = method === 'backup' ? await remainingBackupCodes(prisma, user.id) : null;
    const response = NextResponse.json({ success: true, backupCodesLeft: left });
    response.cookies.set(sessionCookie(session.token, session.maxAgeSeconds, { strict: session.strict }));
    response.cookies.set(clearedCookie(MFA_COOKIE));
    if (user.role === 'ADMIN') response.cookies.set(adminDeviceCookie(user.id));
    return response;
  } catch (error) {
    console.error('2FA verify error:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Doğrulama yapılamadı. Tekrar deneyin.' }, { status: 500 });
  }
}
