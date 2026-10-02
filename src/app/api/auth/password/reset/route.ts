import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkPasswordReset, completePasswordReset } from '@/lib/auth/password-reset';
import { enforce } from '@/lib/security/rate-limit';

export const dynamic = 'force-dynamic';

/** Whether a reset link can still be used, so the page can say "expired" before the form is filled. */
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get('token') ?? '';
  try {
    return NextResponse.json({ valid: await checkPasswordReset(prisma, token) });
  } catch (error) {
    console.error('Password reset check error:', error);
    return NextResponse.json({ error: 'Bağlantı kontrol edilemedi. Tekrar deneyin.' }, { status: 500 });
  }
}

/** Sets the new password with a valid link; the link is spent and every existing session ends. */
export async function POST(request: Request) {
  const limited = await enforce(request, 'passwordReset');
  if (limited) return limited;
  let body: { token?: unknown; password?: unknown; passwordConfirm?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Geçersiz istek.' }, { status: 400 });
  }

  try {
    const result = await completePasswordReset(prisma, typeof body.token === 'string' ? body.token : '', body.password, body.passwordConfirm);
    if (!result.ok) {
      return NextResponse.json(
        { error: result.message, code: result.reason === 'invalid' ? 'INVALID_LINK' : 'WEAK_PASSWORD', field: result.reason === 'weak' ? 'password' : undefined },
        { status: result.reason === 'invalid' ? 410 : 400 },
      );
    }
    // Make sure no stale session cookie stays on this browser either.
    const response = NextResponse.json({ success: true, email: result.email });
    response.cookies.delete('pandiones_auth');
    return response;
  } catch (error) {
    console.error('Password reset error:', error);
    return NextResponse.json({ error: 'Şifre güncellenemedi. Lütfen tekrar deneyin.' }, { status: 500 });
  }
}
