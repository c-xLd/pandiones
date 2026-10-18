import { NextResponse } from 'next/server';
import { clientIp } from '@/lib/security/request';
import { enforce } from '@/lib/security/rate-limit';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, guestOrderCookie } from '@/lib/auth';
import { initializeIyzicoCheckout, isIyzicoSandbox } from '@/lib/payment/iyzico';
import { CHECKOUT_FIELD_ORDER, validateCheckoutForm } from '@/lib/checkout/form-validation';
import { sendOrderConfirmationEmail, sendGiftCardDeliveryEmail } from '@/lib/email/provider';
import {
  CART_LIMITS,
  CheckoutError,
  placeOrder,
  expirePendingOrders,
  planDiscount,
  releaseOrder,
  resolveCart,
} from '@/lib/orders/checkout-service';
import { kurusToTl } from '@/lib/money';

export const dynamic = 'force-dynamic';

const IDEMPOTENCY_KEY = /^[A-Za-z0-9-]{16,80}$/;

const fail = (error: unknown) => {
  if (error instanceof CheckoutError) {
    return NextResponse.json({ error: error.message, ...(error.field ? { field: error.field } : {}) }, { status: error.status });
  }
  console.error('Checkout error:', error);
  return NextResponse.json({ error: 'Sipariş işlenirken bir hata oluştu. Kartınızdan çekim yapılmadı.' }, { status: 500 });
};

/**
 * Creates an order. Prices, stock, discounts and totals come from the database (src/lib/orders/
 * checkout-service.ts); stock, coupon use and gift-card balance are reserved with the order and given
 * back if it is not paid. A repeated submit with the same Idempotency-Key does not create a second order.
 */
export async function POST(request: Request) {
  const limited = await enforce(request, 'checkout');
  if (limited) return limited;
  try {
    const text = await request.text();
    if (text.length > CART_LIMITS.bodyBytes) throw new CheckoutError('İstek çok büyük.', 413);
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(text);
    } catch {
      throw new CheckoutError('Geçersiz istek.');
    }
    if (!body || typeof body !== 'object') throw new CheckoutError('Geçersiz istek.');

    const s = (key: string) => (typeof body[key] === 'string' ? (body[key] as string) : '');
    const fieldErrors = validateCheckoutForm({
      customerName: s('customerName'),
      customerEmail: s('customerEmail'),
      customerPhone: s('customerPhone'),
      shippingCity: s('shippingCity'),
      shippingDistrict: s('shippingDistrict'),
      shippingAddress: s('shippingAddress'),
      shippingNotes: s('shippingNotes'),
    });
    const firstInvalid = CHECKOUT_FIELD_ORDER.find((field) => fieldErrors[field]);
    if (firstInvalid) {
      return NextResponse.json({ error: fieldErrors[firstInvalid], field: firstInvalid, fieldErrors }, { status: 400 });
    }

    const rawKey = request.headers.get('idempotency-key');
    const idempotencyKey = rawKey && IDEMPOTENCY_KEY.test(rawKey) ? rawKey : null;
    if (idempotencyKey) {
      const existing = await prisma.order.findUnique({ where: { idempotencyKey }, select: { orderNumber: true, id: true, status: true } });
      if (existing) {
        if (existing.status === 'ODENDI') {
          const repeat = NextResponse.json({ success: true, orderNumber: existing.orderNumber, orderId: existing.id, directComplete: true });
          repeat.cookies.set(guestOrderCookie(existing.orderNumber));
          return repeat;
        }
        return NextResponse.json({ error: 'Bu sipariş zaten oluşturuldu. Sayfayı yenileyip tekrar deneyin.', orderNumber: existing.orderNumber }, { status: 409 });
      }
    }

    const customerName = s('customerName').trim();
    const customerEmail = s('customerEmail').trim().toLowerCase();
    const session = await getCurrentUser(request);
    // Stock held by abandoned payments goes back before this cart is checked (the 10-minute cron is the
    // main path; this keeps a sold-out size from staying blocked if the cron is late).
    await expirePendingOrders(prisma, new Date(), 20).catch((error) => console.error('Expiring stale orders failed:', error instanceof Error ? error.message : error));
    const lines = await resolveCart(prisma, body.cart, customerName);
    const discount = await planDiscount(prisma, body.couponCode, lines, customerEmail);

    const placed = await placeOrder(prisma, {
      idempotencyKey,
      lines,
      discount,
      contact: {
        userId: session?.userId ?? null,
        customerName,
        customerEmail,
        customerPhone: s('customerPhone').trim(),
        shippingAddress: s('shippingAddress').trim(),
        shippingCity: s('shippingCity').trim(),
        shippingDistrict: s('shippingDistrict').trim(),
        shippingNotes: s('shippingNotes').trim(),
      },
    });
    const { order } = placed;

    // Fully covered by a coupon or gift card: paid on the spot, no card payment.
    if (placed.paidNow) {
      await Promise.all([
        ...placed.giftCards.map((gc) =>
          sendGiftCardDeliveryEmail({
            code: gc.code,
            initialBalance: kurusToTl(gc.initialBalanceKurus),
            recipientName: gc.recipientName,
            recipientEmail: gc.recipientEmail,
            senderName: gc.senderName || undefined,
            giftNote: gc.giftNote || undefined,
            theme: gc.theme,
            expiresAt: gc.expiresAt,
          }).catch(() => console.warn('[GIFT_CARD_DELIVERY_EMAIL_FAILED]', order.orderNumber)),
        ),
        sendOrderConfirmationEmail({
          orderNumber: order.orderNumber,
          customerName: order.customerName,
          customerEmail: order.customerEmail,
          shippingAddress: order.shippingAddress,
          shippingCity: order.shippingCity,
          shippingDistrict: order.shippingDistrict,
          items: lines.map((l) => ({ productName: l.productName, size: l.size, quantity: l.quantity, price: kurusToTl(l.priceKurus) })),
          totalAmount: 0,
          discountAmount: kurusToTl(order.discountKurus),
          couponCode: order.couponCode || order.giftCardCode,
          paidAt: order.paidAt ?? new Date(),
        }).catch(() => console.warn('[ORDER_CONFIRMATION_EMAIL_FAILED]', order.orderNumber)),
      ]);
      const done = NextResponse.json({ success: true, orderNumber: order.orderNumber, orderId: order.id, directComplete: true });
      done.cookies.set(guestOrderCookie(order.orderNumber));
      return done;
    }

    // Callback address comes from configuration in production, never from the request's Host header.
    const origin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || (process.env.NODE_ENV === 'production' ? 'https://pandiones.com' : new URL(request.url).origin);
    const conversationId = `conv_${order.orderNumber}_${Date.now()}`;
    const nameParts = customerName.split(/\s+/);

    const paymentResult = await initializeIyzicoCheckout({
      conversationId,
      basketId: order.id,
      // iyzico wants TL; the basket lines below add up to `price` exactly because every amount is kuruş.
      price: kurusToTl(placed.rawTotalKurus),
      paidPrice: kurusToTl(placed.totalKurus),
      callbackUrl: `${origin}/api/payment/callback`,
      buyer: {
        id: session?.userId || `guest_${order.id}`,
        ip: clientIp(request),
        name: nameParts[0] || 'Değerli',
        surname: nameParts.slice(1).join(' ') || 'Müşterimiz',
        email: customerEmail,
        phone: order.customerPhone.replace(/\D/g, '').slice(-10),
        address: order.shippingAddress,
        city: order.shippingCity,
        district: order.shippingDistrict || order.shippingCity,
      },
      shippingAddress: { contactName: customerName, city: order.shippingCity, country: 'Turkey', address: order.shippingAddress },
      billingAddress: { contactName: customerName, city: order.shippingCity, country: 'Turkey', address: order.shippingAddress },
      basketItems: lines.map((line, idx) => ({
        id: `${line.productId}_${line.size}_${idx}`,
        name: `${line.productName} (${line.size})`,
        category1: line.category,
        price: kurusToTl(line.priceKurus * line.quantity),
      })),
    });

    if (paymentResult.status !== 'success') {
      await releaseOrder(prisma, order.id, 'FAILURE', paymentResult.errorMessage);
      return NextResponse.json({ error: paymentResult.errorMessage || 'Ödeme oturumu başlatılamadı.' }, { status: 400 });
    }

    await prisma.paymentTransaction.create({
      data: {
        orderId: order.id,
        provider: 'IYZICO',
        conversationId,
        token: paymentResult.token || null,
        status: 'PENDING',
        amountKurus: placed.totalKurus,
        currency: 'TRY',
      },
    });

    return NextResponse.json({
      success: true,
      orderNumber: order.orderNumber,
      orderId: order.id,
      paymentToken: paymentResult.token,
      checkoutFormContent: paymentResult.checkoutFormContent,
      paymentPageUrl: paymentResult.paymentPageUrl,
      isMock: paymentResult.isMock,
      isTestMode: paymentResult.isMock || isIyzicoSandbox(),
    });
  } catch (error) {
    return fail(error);
  }
}
