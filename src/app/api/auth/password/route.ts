import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, revokeAllSessions } from '@/lib/auth';
import { checkNewPassword, hashPassword } from '@/lib/auth/password-policy';
import { enforce } from '@/lib/security/rate-limit';
import { readJson } from '@/lib/security/request';

export const dynamic = 'force-dynamic';

/**
 * Signed-in password change. Needs the current password; the new one passes the same policy as
 * registration (length, not the e-mail, not in known breaches). Every other session of the account is
 * ended; this device stays signed in.
 */
export async function PATCH(request: Request) {
  const session = await getCurrentUser(request);
  if (!session) return NextResponse.json({ error: 'Şifrenizi değiştirmek için oturum açmalısınız.' }, { status: 401 });
  const limited = await enforce(request, 'login', session.email);
  if (limited) return limited;

  const parsed = await readJson<{ currentPassword?: unknown; newPassword?: unknown; confirmPassword?: unknown }>(request, 2048);
  if (!parsed.ok) return NextResponse.json({ error: 'Geçersiz istek.' }, { status: parsed.status });
  const { currentPassword, newPassword, confirmPassword } = parsed.body;
  if (typeof currentPassword !== 'string' || typeof newPassword !== 'string' || typeof confirmPassword !== 'string' || !currentPassword || !newPassword) {
    return NextResponse.json({ error: 'Lütfen tüm şifre alanlarını doldurunuz.' }, { status: 400 });
  }
  if (newPassword !== confirmPassword) {
    return NextResponse.json({ error: 'Yeni şifreniz ve şifre onayı birbiriyle eşleşmiyor.' }, { status: 400 });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { id: true, email: true, name: true, passwordHash: true } });
    if (!user) return NextResponse.json({ error: 'Kullanıcı hesabı bulunamadı.' }, { status: 404 });
    if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
      return NextResponse.json({ error: 'Mevcut şifrenizi hatalı girdiniz.' }, { status: 400 });
    }
    if (await bcrypt.compare(newPassword, user.passwordHash)) {
      return NextResponse.json({ error: 'Yeni şifreniz mevcut şifrenizle aynı olamaz.' }, { status: 400 });
    }
    const policy = await checkNewPassword(newPassword, { email: user.email, name: user.name });
    if (policy) return NextResponse.json({ error: policy }, { status: 400 });

    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(newPassword) } });
    const closed = await revokeAllSessions(user.id, session.sessionId);
    return NextResponse.json({
      success: true,
      message: closed > 0 ? 'Şifreniz güncellendi. Diğer cihazlardaki oturumlar kapatıldı.' : 'Şifreniz güncellendi.',
    });
  } catch (error) {
    console.error('Error changing password:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Şifre güncellenirken bir hata oluştu.' }, { status: 500 });
  }
}
