import { NextResponse } from 'next/server';
import { HUMAN_CHECK_FAILED, verifyHuman } from '@/lib/security/turnstile';
import { prisma } from '@/lib/prisma';
import { RESET_TOKEN_TTL_MS, createPasswordReset, normalizeResetEmail } from '@/lib/auth/password-reset';
import { emailDeliveryConfigured, sendPasswordResetEmail } from '@/lib/email/provider';
import { enforce } from '@/lib/security/rate-limit';
import { siteOrigin } from '@/lib/security/site';

export const dynamic = 'force-dynamic';

const SAME_ANSWER = 'Bu adrese kayıtlı bir hesap varsa, şifre sıfırlama bağlantısını gönderdik. Gelen kutunuzu ve gereksiz klasörünü kontrol edin.';

/**
 * "Şifremi unuttum". The answer is the same whether or not the e-mail has an account, so the form cannot
 * be used to find out who is registered. It differs only when e-mail cannot be sent at all.
 */
export async function POST(request: Request) {
  let body: { email?: unknown; turnstileToken?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Geçersiz istek.' }, { status: 400 });
  }
  if (!(await verifyHuman(request, body.turnstileToken))) {
    return NextResponse.json({ error: HUMAN_CHECK_FAILED, code: 'HUMAN_CHECK_FAILED' }, { status: 400 });
  }

  const email = normalizeResetEmail(body?.email);
  if (!email) return NextResponse.json({ error: 'Geçerli bir e-posta adresi girin.', field: 'email' }, { status: 400 });
  const limited = await enforce(request, 'passwordForgot', email);
  if (limited) return limited;

  // Checked before looking the account up, so this answer says nothing about the address.
  if (!emailDeliveryConfigured()) {
    return NextResponse.json({ error: 'Şu an e-posta gönderemiyoruz. Lütfen daha sonra tekrar deneyin ya da bize yazın.' }, { status: 503 });
  }

  try {
    const reset = await createPasswordReset(prisma, email);
    if (reset) {
      const result = await sendPasswordResetEmail({
        recipientEmail: reset.user.email,
        recipientName: reset.user.name,
        resetUrl: `${siteOrigin(request)}/sifre-sifirla?token=${encodeURIComponent(reset.token)}`,
        validMinutes: RESET_TOKEN_TTL_MS / 60000,
      });
      if (!result.success) {
        // Remove the unusable link so a retry is not blocked by the cooldown.
        await prisma.passwordResetToken.deleteMany({ where: { userId: reset.user.id, usedAt: null } });
        console.error('[PASSWORD_RESET_EMAIL_FAILED]', result.error);
        return NextResponse.json({ error: 'E-posta gönderilemedi. Lütfen birkaç dakika sonra tekrar deneyin.' }, { status: 503 });
      }
    }
    return NextResponse.json({ success: true, message: SAME_ANSWER });
  } catch (error) {
    console.error('Password reset request error:', error);
    return NextResponse.json({ error: 'İsteğiniz alınamadı. Lütfen tekrar deneyin.' }, { status: 500 });
  }
}
