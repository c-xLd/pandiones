import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { MFA_COOKIE, createSession, issueMfaPending, sessionCookie } from '@/lib/auth';
import { consumeEmailVerification } from '@/lib/auth/password-reset';
import { enforce } from '@/lib/security/rate-limit';
import { readJson } from '@/lib/security/request';
import { isPanelRole } from '@/lib/security/roles';

export const dynamic = 'force-dynamic';

/**
 * Opens the account from the e-mailed link. POST only (the page sends it), so link scanners that
 * prefetch URLs cannot spend the token. Signs the user in; an admin still goes through 2FA.
 */
export async function POST(request: Request) {
  const limited = await enforce(request, 'verifyEmail');
  if (limited) return limited;
  const parsed = await readJson<{ token?: unknown }>(request, 1024);
  if (!parsed.ok) return NextResponse.json({ error: 'Geçersiz istek.' }, { status: parsed.status });
  const token = typeof parsed.body.token === 'string' ? parsed.body.token : '';

  try {
    const user = await consumeEmailVerification(prisma, token);
    if (!user) {
      return NextResponse.json(
        { error: 'Bu doğrulama bağlantısı geçersiz ya da süresi dolmuş. Giriş yapmayı deneyin; gerekirse yeni bağlantı göndeririz.', code: 'INVALID_LINK' },
        { status: 410 },
      );
    }
    if (isPanelRole(user.role) || user.totpEnabledAt) {
      const pending = issueMfaPending(user.id, user.totpEnabledAt ? 'verify' : 'setup');
      const response = NextResponse.json({ success: true, mfaRequired: true, setup: !user.totpEnabledAt });
      response.cookies.set(sessionCookie(pending.token, pending.maxAgeSeconds, { name: MFA_COOKIE, strict: true }));
      return response;
    }
    const session = await createSession(user, { mfa: false, request });
    const response = NextResponse.json({ success: true });
    response.cookies.set(sessionCookie(session.token, session.maxAgeSeconds));
    return response;
  } catch (error) {
    console.error('Verify e-mail error:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Doğrulama tamamlanamadı. Lütfen tekrar deneyin.' }, { status: 500 });
  }
}
