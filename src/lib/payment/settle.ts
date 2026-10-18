import type { PrismaClient } from '@prisma/client';
import { recordSecurityEvent } from '@/lib/security/events';
import { retrieveIyzicoPayment } from '@/lib/payment/iyzico';
import { sendOrderConfirmationEmail, sendGiftCardDeliveryEmail } from '@/lib/email/provider';
import { releaseOrder } from '@/lib/orders/checkout-service';
import { kurusToTl, tlToKurus } from '@/lib/money';

export type SettleOutcome =
  | { kind: 'paid'; orderNumber: string }
  | { kind: 'already-paid'; orderNumber: string }
  | { kind: 'failed'; orderNumber: string; message: string }
  | { kind: 'mismatch'; orderNumber: string }
  | { kind: 'late'; orderNumber: string }
  | { kind: 'not-found' };

/**
 * Settles the checkout-form payment behind `token`. Called by the browser return (/api/payment/callback)
 * and by iyzico's server notification (/api/payment/webhook) — whichever comes first does the work, the
 * other sees `already-paid`. The result is always fetched from iyzico by token (signature and conversation
 * checked in retrieveIyzicoPayment) and cross-checked against the order (paid amount, basket id); nothing
 * the caller sent is trusted beyond the token. The order moves pending → paid exactly once; stock, coupon
 * and gift-card balance were reserved at checkout, so a failure only gives them back.
 */
export async function settleCheckoutPayment(db: PrismaClient, token: string, context: { request?: Request; source: 'callback' | 'webhook' }): Promise<SettleOutcome> {
  const { request } = context;
  const transaction = await db.paymentTransaction.findFirst({
    where: { token },
    include: { order: { include: { items: true } } },
  });
  if (!transaction || !transaction.order) return { kind: 'not-found' };
  const order = transaction.order;

  if (order.status !== 'ODEME_BEKLENIYOR' && (order.paymentStatus === 'SUCCESS' || transaction.status === 'SUCCESS')) {
    return { kind: 'already-paid', orderNumber: order.orderNumber };
  }

  const verify = await retrieveIyzicoPayment(token, transaction.conversationId ?? undefined);
  const paid = verify.status === 'success' && verify.paymentStatus === 'SUCCESS';

  if (!paid) {
    const message = verify.errorMessage || 'Ödeme banka tarafından onaylanmadı.';
    if (verify.signatureInvalid) {
      await recordSecurityEvent('payment.mismatch', { request, subject: order.orderNumber, detail: 'iyzico yanıt imzası ya da konuşma kimliği doğrulanamadı' });
    }
    // Only a still-pending attempt is marked failed; a paid order is never touched by a late failure.
    const marked = await db.paymentTransaction.updateMany({
      where: { id: transaction.id, status: { notIn: ['SUCCESS', 'REVIEW'] } },
      data: { status: 'FAILURE', errorMessage: message, rawResponse: verify.rawResponse || null },
    });
    if (marked.count === 1) await releaseOrder(db, order.id, 'FAILURE', message);
    return { kind: 'failed', orderNumber: order.orderNumber, message };
  }

  // The simulator (development only) does not report amounts; a real payment must match the order.
  const simulated = token.startsWith('MOCK_IYZICO_');
  if (!simulated) {
    const amountMatches = verify.paidPrice !== undefined && tlToKurus(verify.paidPrice) === order.totalKurus;
    const basketMatches = verify.basketId === order.id;
    if (!amountMatches || !basketMatches) {
      console.error('[PAYMENT_MISMATCH]', { order: order.orderNumber, amountMatches, basketMatches });
      await recordSecurityEvent('payment.mismatch', { request, subject: order.orderNumber, detail: `Tutar eşleşiyor: ${amountMatches}, sepet eşleşiyor: ${basketMatches}` });
      await db.paymentTransaction.update({
        where: { id: transaction.id },
        data: { status: 'REVIEW', paymentId: verify.paymentId || null, errorMessage: 'Tutar veya sepet uyuşmazlığı; iade/inceleme gerekli.', rawResponse: verify.rawResponse || null },
      });
      await releaseOrder(db, order.id, 'FAILURE', 'Ödeme doğrulanamadı.');
      return { kind: 'mismatch', orderNumber: order.orderNumber };
    }
  }

  const outcome = await db.$transaction(async (tx) => {
    // pending → paid, once. A released (expired) order is not revived silently.
    const moved = await tx.order.updateMany({
      where: { id: order.id, status: 'ODEME_BEKLENIYOR' },
      data: { status: 'ODENDI', paymentStatus: 'SUCCESS', paymentId: verify.paymentId || null, paidAt: new Date() },
    });
    if (moved.count !== 1) {
      // The other path (callback or webhook) settled this payment a moment ago.
      const now = await tx.order.findUnique({ where: { id: order.id }, select: { paymentStatus: true, paymentId: true } });
      if (now?.paymentStatus === 'SUCCESS' && (now.paymentId ?? null) === (verify.paymentId ?? null)) return { kind: 'already-paid' as const, giftCards: [] };
    }
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
    if (moved.count !== 1) return { kind: 'late' as const, giftCards: [] };
    const giftCards = await tx.giftCard.findMany({ where: { orderId: order.id, isActive: false } });
    if (giftCards.length > 0) await tx.giftCard.updateMany({ where: { orderId: order.id, isActive: false }, data: { isActive: true } });
    return { kind: 'paid' as const, giftCards };
  });

  if (outcome.kind === 'already-paid') return { kind: 'already-paid', orderNumber: order.orderNumber };
  if (outcome.kind === 'late') {
    console.error('[PAID_AFTER_RELEASE]', order.orderNumber);
    await recordSecurityEvent('payment.after_release', { request, subject: order.orderNumber, detail: 'Süresi dolmuş siparişe ödeme geldi; iade/inceleme gerekli.' });
    return { kind: 'late', orderNumber: order.orderNumber };
  }

  await Promise.all([
    ...outcome.giftCards.map((card) =>
      sendGiftCardDeliveryEmail({
        code: card.code,
        initialBalance: kurusToTl(card.initialBalanceKurus),
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
      items: order.items.map((item) => ({ productName: item.productName, size: item.size, quantity: item.quantity, price: kurusToTl(item.priceKurus) })),
      totalAmount: kurusToTl(order.totalKurus),
      discountAmount: kurusToTl(order.discountKurus),
      couponCode: order.couponCode,
      paidAt: new Date(),
    }).catch(() => console.warn('[ORDER_CONFIRMATION_EMAIL_FAILED]', order.orderNumber)),
  ]);

  return { kind: 'paid', orderNumber: order.orderNumber };
}
