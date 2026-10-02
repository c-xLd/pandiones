import { NextResponse } from 'next/server';
import { recordSecurityEvent } from '@/lib/security/events';
import { maskEmail } from '@/lib/security/redact';
import { prisma } from '@/lib/prisma';
import { MFA_COOKIE, createSession, issueMfaPending, sessionCookie } from '@/lib/auth';
import { GENERIC_LOGIN_ERROR, LOCK_MINUTES, authenticate } from '@/lib/auth/login-service';
import { createEmailVerification } from '@/lib/auth/password-reset';
import { sendAccountEmail } from '@/lib/email/provider';
import { enforce } from '@/lib/security/rate-limit';
import { readJson } from '@/lib/security/request';
import { siteOrigin } from '@/lib/security/site';

export const dynamic = 'force-dynamic';

/**
 * E-mail + password. Rate limited per IP and per e-mail. The answer never says whether an address is
 * registered. Admins and accounts with 2FA get a short "second factor pending" cookie instead of a
 * session and finish at /api/auth/2fa/verify (or /setup on first admin sign-in).
 */
export async function POST(request: Request) {
  const parsed = await readJson<{ email?: unknown; password?: unknown }>(request, 4 * 1024);
  if (!parsed.ok) return NextResponse.json({ error: 'Geçersiz istek.' }, { status: parsed.status });
  const { email, password } = parsed.body;
  const limited = await enforce(request, 'login', typeof email === 'string' ? email : null);
  if (limited) return limited;

  try {
    const outcome = await authenticate(prisma, email, password);
    switch (outcome.kind) {
      case 'invalid':
        return NextResponse.json({ error: GENERIC_LOGIN_ERROR }, { status: 401 });
      case 'locked':
        if (outcome.justLocked) {
          await recordSecurityEvent('login.locked', { request, subject: maskEmail(outcome.user.email) });
          await sendAccountEmail({
            kind: 'account-locked',
            recipientEmail: outcome.user.email,
            recipientName: outcome.user.name,
            minutes: LOCK_MINUTES,
            actionUrl: `${siteOrigin(request)}/sifremi-unuttum`,
          }).catch(() => {});
        }
        return NextResponse.json({ error: GENERIC_LOGIN_ERROR }, { status: 401 });
      case 'unverified': {
        // Only someone who knows the password gets here, so this reveals nothing new.
        const token = await createEmailVerification(prisma, outcome.user.id);
        await sendAccountEmail({
          kind: 'verify-email',
          recipientEmail: outcome.user.email,
          recipientName: outcome.user.name,
          actionUrl: `${siteOrigin(request)}/e-posta-dogrula?token=${encodeURIComponent(token)}`,
        }).catch(() => {});
        return NextResponse.json(
          { error: 'E-posta adresinizi henüz doğrulamadınız. Yeni bir doğrulama bağlantısı gönderdik.', code: 'EMAIL_NOT_VERIFIED' },
          { status: 403 },
        );
      }
      case 'mfa': {
        const pending = issueMfaPending(outcome.user.id, outcome.setup ? 'setup' : 'verify');
        const response = NextResponse.json({ success: true, mfaRequired: true, setup: outcome.setup });
        response.cookies.set(sessionCookie(pending.token, pending.maxAgeSeconds, { name: MFA_COOKIE, strict: true }));
        return response;
      }
      case 'ok': {
        const session = await createSession(outcome.user, { mfa: false, request });
        const response = NextResponse.json({ success: true });
        response.cookies.set(sessionCookie(session.token, session.maxAgeSeconds, { strict: session.strict }));
        return response;
      }
    }
  } catch (error) {
    console.error('Login error:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Giriş yapılırken bir hata oluştu.' }, { status: 500 });
  }
}
