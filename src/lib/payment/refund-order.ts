import type { PrismaClient } from '@prisma/client';
import type { UserSession } from '@/lib/auth';
import { recordAudit, recordAuditAfter } from '@/lib/audit';
import { returnIyzicoPayment, type RefundLine } from '@/lib/payment/iyzico';
import { roundMoney } from '@/lib/orders/checkout-service';
import { recordSecurityEvent } from '@/lib/security/events';

/** Order status after a full refund. Not a panel step: nothing (shipping included) may follow it. */
export const REFUNDED_ORDER_STATUS = 'IADE_EDILDI';
/** Orders whose goods have not left the store: their stock goes back on the shelf with the refund. */
const NOT_SHIPPED = ['ODENDI', 'HAZIRLANIYOR'];
const REFUNDABLE = ['ODENDI', 'HAZIRLANIYOR', 'KARGODA', 'TESLIM_EDILDI'];

export type RefundOutcome =
  | { ok: true; orderNumber: string; method: 'cancel' | 'refund' | 'gift-card'; refunded: number; restocked: boolean }
  | { ok: false; status: 404 | 409 | 502; error: string; refunded?: number };

/** The paid basket items of a checkout-form payment, from the stored iyzico retrieve answer. */
export function refundLinesFrom(rawResponse: string | null): RefundLine[] {
  if (!rawResponse) return [];
  try {
    const data = JSON.parse(rawResponse) as { itemTransactions?: { paymentTransactionId?: unknown; paidPrice?: unknown }[] };
    return (data.itemTransactions ?? [])
      .map((item) => ({ paymentTransactionId: String(item.paymentTransactionId ?? ''), amount: Number(item.paidPrice) }))
      .filter((line) => line.paymentTransactionId && Number.isFinite(line.amount) && line.amount > 0);
  } catch {
    return [];
  }
}

/**
 * Refunds a whole paid order: the card part through iyzico (cancel on the payment day, otherwise a refund
 * per basket item), the gift-card part back onto the card it came from. Gift cards bought with the order
 * are switched off — and the refund is refused if one of them was already spent. Unshipped goods return
 * to stock. The order is claimed first (paymentStatus SUCCESS → REFUND_PENDING), so two admins or two
 * clicks cannot refund twice; a failure leaves REFUND_FAILED / REFUND_PARTIAL for manual follow-up in the
 * iyzico panel and raises a critical security event. The coupon use is kept (the order did happen).
 */
export async function refundOrder(db: PrismaClient, orderId: string, actor: Pick<UserSession, 'userId' | 'email'>, ip: string): Promise<RefundOutcome> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      items: { select: { productId: true, size: true, quantity: true } },
      transactions: { where: { status: 'SUCCESS' }, orderBy: { createdAt: 'desc' }, take: 1 },
      giftCardUsages: { select: { id: true, giftCardId: true, amount: true } },
      giftCardsPurchased: { select: { id: true, code: true, initialBalance: true, currentBalance: true } },
    },
  });
  if (!order) return { ok: false, status: 404, error: 'Sipariş bulunamadı.' };
  if (order.paymentStatus !== 'SUCCESS' || !REFUNDABLE.includes(order.status)) {
    return { ok: false, status: 409, error: 'Yalnız ödemesi alınmış ve iade edilmemiş sipariş iade edilebilir.' };
  }
  const spent = order.giftCardsPurchased.find((card) => roundMoney(card.currentBalance) < roundMoney(card.initialBalance));
  if (spent) return { ok: false, status: 409, error: 'Bu siparişle alınan bir hediye kartı kullanılmış; iade iyzico panelinden ve elle yapılmalı.' };

  const payment = order.transactions[0];
  const cardAmount = roundMoney(order.totalAmount);
  if (cardAmount > 0 && !payment?.paymentId) {
    return { ok: false, status: 409, error: 'Ödeme kaydında iyzico ödeme numarası yok; iade iyzico panelinden yapılmalı.' };
  }
  const lines = refundLinesFrom(payment?.rawResponse ?? null);
  const simulated = Boolean(payment?.token?.startsWith('MOCK_IYZICO_'));
  if (cardAmount > 0 && !simulated && lines.length === 0) {
    return { ok: false, status: 409, error: 'Ödeme kaydında ürün işlem numaraları yok; iade iyzico panelinden yapılmalı.' };
  }

  const claimed = await db.order.updateMany({ where: { id: order.id, paymentStatus: 'SUCCESS' }, data: { paymentStatus: 'REFUND_PENDING' } });
  if (claimed.count !== 1) return { ok: false, status: 409, error: 'Bu siparişin iadesi zaten işleniyor ya da yapıldı.' };

  let method: 'cancel' | 'refund' | 'gift-card' = 'gift-card';
  let refunded = 0;
  let rawAnswers: string[] = [];
  if (cardAmount > 0 && payment?.paymentId) {
    const result = await returnIyzicoPayment({
      paymentId: payment.paymentId,
      token: payment.token,
      lines: simulated && lines.length === 0 ? [{ paymentTransactionId: 'mock', amount: cardAmount }] : lines,
      conversationId: `refund_${order.id}`,
      ip,
    });
    rawAnswers = result.raw;
    refunded = roundMoney(result.refunded);
    if (!result.ok) {
      const status = refunded > 0 ? 'REFUND_PARTIAL' : 'REFUND_FAILED';
      await db.$transaction([
        db.order.update({ where: { id: order.id }, data: { paymentStatus: status } }),
        db.paymentTransaction.create({
          data: { orderId: order.id, provider: 'IYZICO', conversationId: `refund_${order.id}`, paymentId: payment.paymentId, status, amount: -refunded, errorMessage: result.errorMessage, rawResponse: rawAnswers.join('\n').slice(0, 20000) },
        }),
      ]);
      await recordSecurityEvent('payment.mismatch', { subject: order.orderNumber, detail: `İade tamamlanamadı (${refunded} TL iade edildi): ${result.errorMessage}` });
      await recordAuditAfter(db, actor, { action: 'order.refund_failed', entity: 'order', entityId: order.id, summary: `${order.orderNumber} iadesi tamamlanamadı: ${result.errorMessage}` });
      return { ok: false, status: 502, error: `İade tamamlanamadı: ${result.errorMessage}`, refunded };
    }
    method = result.method;
  }

  const restock = NOT_SHIPPED.includes(order.status);
  await db.$transaction(async (tx) => {
    await tx.order.update({ where: { id: order.id }, data: { status: REFUNDED_ORDER_STATUS, paymentStatus: 'REFUNDED' } });
    if (cardAmount > 0) {
      await tx.paymentTransaction.create({
        data: { orderId: order.id, provider: 'IYZICO', conversationId: `refund_${order.id}`, paymentId: payment?.paymentId ?? null, status: 'REFUNDED', amount: -refunded, rawResponse: rawAnswers.join('\n').slice(0, 20000) },
      });
    }
    for (const usage of order.giftCardUsages) {
      await tx.giftCard.update({ where: { id: usage.giftCardId }, data: { currentBalance: { increment: usage.amount } } });
    }
    if (order.giftCardUsages.length > 0) await tx.giftCardUsage.deleteMany({ where: { orderId: order.id } });
    if (order.giftCardsPurchased.length > 0) await tx.giftCard.updateMany({ where: { orderId: order.id }, data: { isActive: false } });
    if (restock) {
      for (const item of order.items) {
        await tx.variant.updateMany({ where: { productId: item.productId, size: item.size }, data: { stock: { increment: item.quantity } } });
      }
    }
    const giftPart = roundMoney(order.giftCardUsages.reduce((sum, usage) => sum + usage.amount, 0));
    await recordAudit(tx, actor, {
      action: 'order.refund',
      entity: 'order',
      entityId: order.id,
      summary: `${order.orderNumber} iade edildi: kart ${refunded} TL (${method === 'cancel' ? 'iptal' : method === 'refund' ? 'iade' : '—'}), hediye kartı ${giftPart} TL${restock ? ', stok geri eklendi' : ''}`,
      diff: { status: [order.status, REFUNDED_ORDER_STATUS], paymentStatus: ['SUCCESS', 'REFUNDED'] },
    });
  });

  return { ok: true, orderNumber: order.orderNumber, method, refunded, restocked: restock };
}
