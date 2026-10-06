import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { trackOpenShipments } from '@/lib/shipping/service';

export const dynamic = 'force-dynamic';

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 32) return false;
  const given = request.headers.get('authorization') ?? '';
  const expected = `Bearer ${secret}`;
  return given.length === expected.length && crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

/** PTT tracking: new movements of shipments on the way, statuses applied. Skips quietly without PTT credentials. */
export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: 'Yetkisiz.' }, { status: 401 });
  try {
    return NextResponse.json(await trackOpenShipments(prisma));
  } catch (error) {
    console.error('Shipment tracking cron error:', error);
    return NextResponse.json({ error: 'Takip çalışmadı.' }, { status: 500 });
  }
}
