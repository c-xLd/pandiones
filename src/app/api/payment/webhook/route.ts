import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { webhookSignatureValid } from '@/lib/payment/iyzico';
import { settleCheckoutPayment } from '@/lib/payment/settle';
import { recordSecurityEvent } from '@/lib/security/events';
import { readJson } from '@/lib/security/request';

export const dynamic = 'force-dynamic';

/**
 * iyzico server notification (Merchant Panel → Ayarlar → Firma Ayarları → Firma Bildirimleri, URL
 * `${NEXT_PUBLIC_SITE_URL}/api/payment/webhook`). It arrives even when the buyer closed the browser after
 * 3-D Secure, so a paid order no longer waits in "ödeme bekleniyor" until it expires.
 *
 * The `X-IYZ-SIGNATURE-V3` header must match (merchant secret key); the notification itself is only a
 * trigger — the payment is settled from iyzico's retrieve answer, exactly like the browser return
 * (settleCheckoutPayment). iyzico retries every 15 minutes (3 times) until it gets a 2xx, so every
 * correctly signed notification is acknowledged with 200, also when there is nothing to do.
 */
export async function POST(request: Request) {
  const parsed = await readJson<Record<string, unknown>>(request, 8 * 1024);
  if (!parsed.ok) return NextResponse.json({ error: 'Geçersiz istek.' }, { status: parsed.status });
  const payload = parsed.body;

  if (!webhookSignatureValid(payload, request.headers.get('x-iyz-signature-v3'))) {
    await recordSecurityEvent('payment.mismatch', { request, subject: 'webhook', detail: 'iyzico bildirimi imzası doğrulanamadı' });
    return NextResponse.json({ error: 'İmza doğrulanamadı.' }, { status: 401 });
  }

  const token = typeof payload.token === 'string' ? payload.token : '';
  const status = String(payload.status ?? '');
  // Intermediate states (INIT_THREEDS, CALLBACK_THREEDS …) need no action; only a final result settles.
  if (!token || token.length > 200 || !['SUCCESS', 'FAILURE'].includes(status)) {
    return NextResponse.json({ received: true });
  }

  try {
    const outcome = await settleCheckoutPayment(prisma, token, { request, source: 'webhook' });
    return NextResponse.json({ received: true, result: outcome.kind });
  } catch (error) {
    console.error('iyzico webhook processing error:', error instanceof Error ? error.message : error);
    // 5xx makes iyzico retry later.
    return NextResponse.json({ error: 'İşlenemedi.' }, { status: 500 });
  }
}
