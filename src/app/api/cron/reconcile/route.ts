import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { retrieveIyzicoPayment } from '@/lib/payment/iyzico';
import { tlToKurus } from '@/lib/money';
import { recordSecurityEvent } from '@/lib/security/events';

export const dynamic = 'force-dynamic';

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 32) return false;
  const given = request.headers.get('authorization') ?? '';
  const expected = `Bearer ${secret}`;
  return given.length === expected.length && crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

/**
 * Daily payment reconciliation: every card order paid in the last 48 hours is re-fetched from iyzico and
 * compared (paid, amount, basket). Card payments still waiting for review are counted. Any difference
 * becomes a critical security event (e-mailed). Read-only: it never changes an order.
 */
export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: 'Yetkisiz.' }, { status: 401 });
  const since = new Date(Date.now() - 48 * 60 * 60 * 1000);
  try {
    const paid = await prisma.order.findMany({
      where: { paymentProvider: 'IYZICO', status: { in: ['ODENDI', 'HAZIRLANIYOR', 'KARGODA', 'TESLIM_EDILDI'] }, paidAt: { gt: since } },
      select: { id: true, orderNumber: true, totalKurus: true, transactions: { where: { status: 'SUCCESS' }, select: { token: true }, take: 1 } },
      take: 500,
    });
    let checked = 0;
    const problems: string[] = [];
    for (const order of paid) {
      const token = order.transactions[0]?.token;
      if (!token) {
        problems.push(`${order.orderNumber}: başarılı ödeme kaydı yok`);
        continue;
      }
      if (token.startsWith('MOCK_IYZICO_')) continue; // development simulator
      const result = await retrieveIyzicoPayment(token);
      checked += 1;
      const ok = result.status === 'success' && result.paymentStatus === 'SUCCESS' && result.paidPrice !== undefined && tlToKurus(result.paidPrice) === order.totalKurus && result.basketId === order.id;
      if (!ok) problems.push(`${order.orderNumber}: iyzico kaydı siparişle uyuşmuyor`);
    }
    const pendingReview = await prisma.paymentTransaction.count({ where: { status: 'REVIEW' } });
    if (problems.length > 0) {
      await recordSecurityEvent('payment.mismatch', { subject: 'mutabakat', detail: problems.slice(0, 10).join('; ') });
    }
    return NextResponse.json({ orders: paid.length, checked, problems: problems.length, pendingReview });
  } catch (error) {
    console.error('Reconciliation failed:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Mutabakat tamamlanamadı.' }, { status: 500 });
  }
}
