import { NextResponse } from 'next/server';
import { HUMAN_CHECK_FAILED, verifyHuman } from '@/lib/security/turnstile';
import { prisma } from '@/lib/prisma';
import { validateAuthForm } from '@/lib/auth/form-validation';
import { checkNewPassword, compareWithDummy, hashPassword } from '@/lib/auth/password-policy';
import { createEmailVerification } from '@/lib/auth/password-reset';
import { sendAccountEmail, emailDeliveryConfigured } from '@/lib/email/provider';
import { enforce } from '@/lib/security/rate-limit';
import { readJson } from '@/lib/security/request';
import { siteOrigin } from '@/lib/security/site';

export const dynamic = 'force-dynamic';

const SAME_ANSWER =
  'Kaydınızı aldık. Hesabınızı etkinleştirmek için e-posta adresinize bir doğrulama bağlantısı gönderdik. Bu adresle zaten bir hesabınız varsa, nasıl giriş yapacağınızı anlatan bir e-posta alacaksınız.';

/**
 * Registration. The answer is the same whether or not the address already has an account, and no session
 * is opened here — the account becomes usable when the e-mailed link is opened (/e-posta-dogrula). That
 * way the form cannot be used to find out who is registered.
 */
export async function POST(request: Request) {
  const parsed = await readJson<Record<string, unknown>>(request, 4 * 1024);
  if (!parsed.ok) return NextResponse.json({ error: 'Geçersiz istek.' }, { status: parsed.status });
  const body = parsed.body;
  if (!(await verifyHuman(request, body.turnstileToken))) {
    return NextResponse.json({ error: HUMAN_CHECK_FAILED, code: 'HUMAN_CHECK_FAILED' }, { status: 400 });
  }
  const str = (key: string) => (typeof body[key] === 'string' ? (body[key] as string) : '');
  const values = { name: str('name'), email: str('email'), password: str('password'), phone: str('phone') };

  const limited = await enforce(request, 'register', values.email || null);
  if (limited) return limited;

  const errors = validateAuthForm('register', values);
  const firstField = (['name', 'email', 'password', 'phone'] as const).find((field) => errors[field]);
  if (firstField) return NextResponse.json({ error: errors[firstField], field: firstField }, { status: 400 });

  const email = values.email.trim().toLowerCase();
  const name = values.name.trim();
  const policy = await checkNewPassword(values.password, { email, name });
  if (policy) return NextResponse.json({ error: policy, field: 'password' }, { status: 400 });

  if (!emailDeliveryConfigured()) {
    return NextResponse.json({ error: 'Şu an e-posta gönderemediğimiz için kayıt alınamıyor. Lütfen daha sonra tekrar deneyin.' }, { status: 503 });
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email }, select: { id: true, name: true, emailVerifiedAt: true } });
    if (existing) {
      await compareWithDummy(values.password); // same time as hashing a new password
      if (existing.emailVerifiedAt) {
        await sendAccountEmail({ kind: 'existing-account', recipientEmail: email, recipientName: existing.name, actionUrl: `${siteOrigin(request)}/giris-yap` }).catch(() => {});
      } else {
        const token = await createEmailVerification(prisma, existing.id);
        await sendAccountEmail({ kind: 'verify-email', recipientEmail: email, recipientName: existing.name, actionUrl: `${siteOrigin(request)}/e-posta-dogrula?token=${encodeURIComponent(token)}` }).catch(() => {});
      }
      return NextResponse.json({ success: true, verificationSent: true, message: SAME_ANSWER });
    }

    const user = await prisma.user.create({
      data: { name, email, passwordHash: await hashPassword(values.password), phone: values.phone.trim() || null, role: 'CUSTOMER' },
    });
    const token = await createEmailVerification(prisma, user.id);
    await sendAccountEmail({ kind: 'verify-email', recipientEmail: email, recipientName: name, actionUrl: `${siteOrigin(request)}/e-posta-dogrula?token=${encodeURIComponent(token)}` }).catch(() => {});
    return NextResponse.json({ success: true, verificationSent: true, message: SAME_ANSWER });
  } catch (error) {
    console.error('Register error:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Kayıt sırasında bir hata oluştu. Lütfen tekrar deneyin.' }, { status: 500 });
  }
}
