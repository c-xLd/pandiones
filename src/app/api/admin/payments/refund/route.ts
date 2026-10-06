import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, requireRecentAuth } from '@/lib/security/admin-guard';
import { clientIp, readJson } from '@/lib/security/request';
import { refundOrder } from '@/lib/payment/refund-order';

export const dynamic = 'force-dynamic';

/**
 * POST { orderId, confirm: "IADE" } — refunds a whole paid order (refundOrder). Admin only, with a 2FA
 * confirmation in the last 10 minutes (money leaves the store) and an explicit confirmation word so a
 * stray click cannot refund.
 */
export async function POST(request: Request) {
  const guard = await requireAdmin(request);
  if (guard.response) return guard.response;
  const reauth = requireRecentAuth(guard.session);
  if (reauth) return reauth;

  const parsed = await readJson<{ orderId?: unknown; confirm?: unknown }>(request, 1024);
  if (!parsed.ok) return NextResponse.json({ error: 'Geçersiz istek.' }, { status: parsed.status });
  const orderId = typeof parsed.body.orderId === 'string' ? parsed.body.orderId : '';
  if (!orderId) return NextResponse.json({ error: 'Sipariş belirtilmedi.' }, { status: 400 });
  if (parsed.body.confirm !== 'IADE') return NextResponse.json({ error: 'Onay için IADE yazın.', field: 'confirm' }, { status: 400 });

  try {
    const outcome = await refundOrder(prisma, orderId, guard.session, clientIp(request));
    if (!outcome.ok) return NextResponse.json({ error: outcome.error, refunded: outcome.refunded ?? 0 }, { status: outcome.status, headers: { 'Cache-Control': 'no-store' } });
    return NextResponse.json({ success: true, ...outcome }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Refund failed:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'İade işlenemedi. iyzico panelinden durumu kontrol edin.' }, { status: 500 });
  }
}
