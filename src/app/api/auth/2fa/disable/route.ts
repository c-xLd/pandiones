import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { disableTotp, verifySecondFactor } from '@/lib/auth/mfa-service';
import { sendAccountEmail } from '@/lib/email/provider';
import { enforce } from '@/lib/security/rate-limit';
import { readJson } from '@/lib/security/request';

export const dynamic = 'force-dynamic';

/** Customers can turn 2FA off with their password and a current code. Admins cannot (it is mandatory). */
export async function POST(request: Request) {
  const session = await getCurrentUser(request);
  if (!session) return NextResponse.json({ error: 'Oturum açmanız gerekiyor.' }, { status: 401 });
  if (session.role === 'ADMIN') return NextResponse.json({ error: 'Yönetici hesaplarında iki adımlı doğrulama kapatılamaz.' }, { status: 403 });
  const limited = await enforce(request, 'mfa', session.userId);
  if (limited) return limited;
  const parsed = await readJson<{ password?: unknown; code?: unknown }>(request, 2048);
  if (!parsed.ok) return NextResponse.json({ error: 'Geçersiz istek.' }, { status: parsed.status });

  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.userId }, select: { passwordHash: true, email: true, name: true } });
  const passwordOk = typeof parsed.body.password === 'string' && (await bcrypt.compare(parsed.body.password, user.passwordHash));
  const codeOk = passwordOk && typeof parsed.body.code === 'string' && (await verifySecondFactor(prisma, session.userId, parsed.body.code)) !== null;
  if (!passwordOk || !codeOk) return NextResponse.json({ error: 'Şifre ya da doğrulama kodu hatalı.' }, { status: 401 });

  await disableTotp(prisma, session.userId);
  await sendAccountEmail({ kind: 'mfa-disabled', recipientEmail: user.email, recipientName: user.name }).catch(() => {});
  return NextResponse.json({ success: true });
}
