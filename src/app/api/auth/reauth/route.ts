import { NextResponse } from 'next/server';
import { recordSecurityEvent } from '@/lib/security/events';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { verifySecondFactor } from '@/lib/auth/mfa-service';
import { enforce } from '@/lib/security/rate-limit';
import { readJson } from '@/lib/security/request';

export const dynamic = 'force-dynamic';

/** Re-confirms the signed-in admin with a current 2FA code; opens the 10-minute window for sensitive actions. */
export async function POST(request: Request) {
  const session = await getCurrentUser(request);
  if (!session || session.role !== 'ADMIN') return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 403 });
  const limited = await enforce(request, 'mfa', session.userId);
  if (limited) return limited;
  const parsed = await readJson<{ code?: unknown }>(request, 1024);
  if (!parsed.ok) return NextResponse.json({ error: 'Geçersiz istek.' }, { status: parsed.status });
  const code = typeof parsed.body.code === 'string' ? parsed.body.code.slice(0, 20) : '';
  if (!(await verifySecondFactor(prisma, session.userId, code))) {
    await recordSecurityEvent('reauth.failed', { request, subject: session.userId });
    return NextResponse.json({ error: 'Kod hatalı ya da süresi geçmiş.', field: 'code' }, { status: 401 });
  }
  await prisma.session.update({ where: { id: session.sessionId }, data: { reauthAt: new Date() } });
  return NextResponse.json({ success: true });
}
