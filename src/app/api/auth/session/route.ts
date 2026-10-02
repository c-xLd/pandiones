import { NextResponse } from 'next/server';
import { getCurrentUser, renewAdminSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const expired = () =>
  NextResponse.json({ error: 'Oturumunuz sona erdi. Lütfen yeniden giriş yapın.', code: 'SESSION_EXPIRED' }, { status: 401 });

/** Admin session deadlines without renewing them (the panel's countdown reads this). */
export async function GET(request: Request) {
  const session = await getCurrentUser(request);
  if (!session) return expired();
  if (session.role !== 'ADMIN') return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 403 });
  return NextResponse.json({ expiresAt: session.exp, idleExpiresAt: session.idle ?? null });
}

/** Renews an admin session's 30-minute inactivity window in the database (never past its 8-hour end). */
export async function POST(request: Request) {
  const session = await getCurrentUser(request);
  if (!session) return expired();
  if (session.role !== 'ADMIN') return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 403 });
  const renewed = await renewAdminSession(session);
  if (!renewed) return expired();
  return NextResponse.json({ expiresAt: renewed.exp, idleExpiresAt: renewed.idle });
}
