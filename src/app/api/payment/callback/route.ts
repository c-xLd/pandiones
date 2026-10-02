import { NextResponse } from 'next/server';
import { recordSecurityEvent } from '@/lib/security/events';
import { prisma } from '@/lib/prisma';
import { retrieveIyzicoPayment } from '@/lib/payment/iyzico';
import { guestOrderCookie } from '@/lib/auth';
import { sendOrderConfirmationEmail, sendGiftCardDeliveryEmail } from '@/lib/email/provider';
import { releaseOrder, toKurus } from '@/lib/orders/checkout-service';

export const dynamic = 'force-dynamic';

/**
 * iyzico returns the buyer here after 3-D Secure. The result is fetched from iyzico by token (the POST
 * body is not trusted), cross-checked against the order (paid amount, basket id), and the order moves
 * pending → paid exactly once. Stock, coupon and gift-card balance were already reserved at checkout.
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

    const transaction = await prisma.paymentTransaction.findFirst({
      where: { token },
      include: { order: { include: { items: true } } },
    });
    if (!transaction || !transaction.order) return toCheckout('Sipariş bulunamadı.');
    const order = transaction.order;

    if (order.status === 'ODENDI' || transaction.status === 'SUCCESS') {
      return toConfirmation(order.orderNumber);
    }

    const verify = await retrieveIyzicoPayment(token, transaction.conversationId ?? undefined);
    const paid = verify.status === 'success' && verify.paymentStatus === 'SUCCESS';

    if (!paid) {
      const message = verify.errorMessage || 'Ödeme banka tarafından onaylanmadı.';
      if (verify.signatureInvalid) {
        await recordSecurityEvent('payment.mismatch', { request, subject: order.orderNumber, detail: 'iyzico yanıt imzası ya da konuşma kimliği doğrulanamadı' });
      }
      await prisma.paymentTransaction.update({ where: { id: transaction.id }, data: { status: 'FAILURE', errorMessage: message, rawResponse: verify.rawResponse || null } });
      await releaseOrder(prisma, order.id, 'FAILURE', message);
      return toCheckout(message);
    }

    // The simulator (development only) does not report amounts; a real payment must match the order.
    const simulated = token.startsWith('MOCK_IYZICO_');
    if (!simulated) {
      const amountMatches = verify.paidPrice !== undefined && toKurus(verify.paidPrice) === toKurus(order.totalAmount);
      const basketMatches = verify.basketId === order.id;
      if (!amountMatches || !basketMatches) {
        console.error('[PAYMENT_MISMATCH]', { order: order.orderNumber, amountMatches, basketMatches });
        await recordSecurityEvent('payment.mismatch', { request, subject: order.orderNumber, detail: `Tutar eşleşiyor: ${amountMatches}, sepet eşleşiyor: ${basketMatches}` });
        await prisma.paymentTransaction.update({
          where: { id: transaction.id },
          data: { status: 'REVIEW', paymentId: verify.paymentId || null, errorMessage: 'Tutar veya sepet uyuşmazlığı; iade/inceleme gerekli.', rawResponse: verify.rawResponse || null },
        });
        await releaseOrder(prisma, order.id, 'FAILURE', 'Ödeme doğrulanamadı.');
        return toCheckout('Ödemeniz doğrulanamadı. Kartınızdan çekim yapıldıysa iade edilecektir; lütfen bizimle iletişime geçin.');
      }
    }

    const outcome = await prisma.$transaction(async (tx) => {
      // pending → paid, once. A released (expired) order is not revived silently.
      const moved = await tx.order.updateMany({
        where: { id: order.id, status: 'ODEME_BEKLENIYOR' },
        data: { status: 'ODENDI', paymentStatus: 'SUCCESS', paymentId: verify.paymentId || null, paidAt: new Date() },
      });
      await tx.paymentTransaction.update({
        where: { id: transaction.id },
        data: {
          status: moved.count === 1 ? 'SUCCESS' : 'REVIEW',
          paymentId: verify.paymentId || null,
          installment: verify.installment || 1,
          cardType: verify.cardType || null,
          cardAssociation: verify.cardAssociation || null,
          cardFamily: verify.cardFamily || null,
          binNumber: verify.binNumber || null,
          lastFourDigits: verify.lastFourDigits || null,
          rawResponse: verify.rawResponse || null,
          ...(moved.count === 1 ? {} : { errorMessage: 'Ödeme, sipariş süresi dolduktan sonra geldi; iade/inceleme gerekli.' }),
        },
      });
      if (moved.count !== 1) return { paid: false as const, giftCards: [] };
      const giftCards = await tx.giftCard.findMany({ where: { orderId: order.id, isActive: false } });
      if (giftCards.length > 0) await tx.giftCard.updateMany({ where: { orderId: order.id, isActive: false }, data: { isActive: true } });
      return { paid: true as const, giftCards };
    });

    if (!outcome.paid) {
      console.error('[PAID_AFTER_RELEASE]', order.orderNumber);
      await recordSecurityEvent('payment.after_release', { request, subject: order.orderNumber, detail: 'Süresi dolmuş siparişe ödeme geldi; iade/inceleme gerekli.' });
      return toCheckout('Ödeme süresi dolduktan sonra tamamlandı. Kartınızdan çekim yapıldıysa iade edilecektir; lütfen bizimle iletişime geçin.');
    }

    await Promise.all([
      ...outcome.giftCards.map((card) =>
        sendGiftCardDeliveryEmail({
          code: card.code,
          initialBalance: card.initialBalance,
          recipientName: card.recipientName,
          recipientEmail: card.recipientEmail,
          senderName: card.senderName || undefined,
          giftNote: card.giftNote || undefined,
          theme: card.theme,
          expiresAt: card.expiresAt,
        }).catch(() => console.warn('[GIFT_CARD_DELIVERY_EMAIL_FAILED]', order.orderNumber)),
      ),
      sendOrderConfirmationEmail({
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        shippingAddress: order.shippingAddress,
        shippingCity: order.shippingCity,
        shippingDistrict: order.shippingDistrict,
        items: order.items.map((item) => ({ productName: item.productName, size: item.size, quantity: item.quantity, price: item.price })),
        totalAmount: order.totalAmount,
        discountAmount: order.discountAmount,
        couponCode: order.couponCode,
        paidAt: new Date(),
      }).catch(() => console.warn('[ORDER_CONFIRMATION_EMAIL_FAILED]', order.orderNumber)),
    ]);

    return toConfirmation(order.orderNumber);
  } catch (error) {
    console.error('Payment callback processing error:', error);
    return toCheckout('Ödeme sonucu işlenirken bir hata oluştu.');
  }
}
