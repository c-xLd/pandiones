import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { guestOrderCookie } from '@/lib/auth';
import { settleCheckoutPayment } from '@/lib/payment/settle';

export const dynamic = 'force-dynamic';

/**
 * iyzico returns the buyer here after 3-D Secure (POST with the checkout-form token). Settling is shared
 * with the server notification (/api/payment/webhook): see settleCheckoutPayment. This route only turns the
 * outcome into a redirect.
 */
export async function POST(request: Request) {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '');
  const baseUrl = configured || (process.env.NODE_ENV === 'production' ? 'https://pandiones.com' : new URL(request.url).origin);
  // The buyer's access to the confirmation page travels in an HttpOnly cookie, not in the URL.
  const toConfirmation = (orderNumber: string) => {
    const response = NextResponse.redirect(`${baseUrl}/siparis-onay/${orderNumber}`, { status: 303 });
    response.cookies.set(guestOrderCookie(orderNumber));
    return response;
  };
  const toCheckout = (message: string) => NextResponse.redirect(`${baseUrl}/odeme?error=${encodeURIComponent(message)}`, { status: 303 });

  try {
    let token = '';
    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
      token = String((await request.formData()).get('token') || '');
    } else {
      token = new URLSearchParams(await request.text()).get('token') || '';
    }
    if (!token || token.length > 200) return toCheckout('Ödeme dönüşünde belirteç bulunamadı.');

    const outcome = await settleCheckoutPayment(prisma, token, { request, source: 'callback' });
    switch (outcome.kind) {
      case 'paid':
      case 'already-paid':
        return toConfirmation(outcome.orderNumber);
      case 'failed':
        return toCheckout(outcome.message);
      case 'mismatch':
        return toCheckout('Ödemeniz doğrulanamadı. Kartınızdan çekim yapıldıysa iade edilecektir; lütfen bizimle iletişime geçin.');
      case 'late':
        return toCheckout('Ödeme süresi dolduktan sonra tamamlandı. Kartınızdan çekim yapıldıysa iade edilecektir; lütfen bizimle iletişime geçin.');
      default:
        return toCheckout('Sipariş bulunamadı.');
    }
  } catch (error) {
    console.error('Payment callback processing error:', error instanceof Error ? error.message : error);
    return toCheckout('Ödeme sonucu işlenirken bir hata oluştu.');
  }
}
