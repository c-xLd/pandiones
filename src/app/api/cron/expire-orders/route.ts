import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { expirePendingOrders } from '@/lib/orders/checkout-service';

export const dynamic = 'force-dynamic';

/** Constant-time check of the scheduler's bearer secret (Vercel Cron sends `Authorization: Bearer $CRON_SECRET`). */
function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 32) return false;
  const given = request.headers.get('authorization') ?? '';
  const expected = `Bearer ${secret}`;
  return given.length === expected.length && crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

/** Releases unpaid orders older than PENDING_ORDER_TTL_MINUTES: stock, coupon use and gift-card balance go back. */
export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: 'Yetkisiz.' }, { status: 401 });
  try {
    const released = await expirePendingOrders(prisma);
    return NextResponse.json({ released });
  } catch (error) {
    console.error('Expire orders job failed:', error);
    return NextResponse.json({ error: 'İş tamamlanamadı.' }, { status: 500 });
  }
}
