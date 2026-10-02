import { NextResponse } from 'next/server';
import { enforce } from '@/lib/security/rate-limit';
import { prisma } from '@/lib/prisma';
import { CART_LIMITS, CheckoutError, planDiscount, resolveCart, roundMoney } from '@/lib/orders/checkout-service';

export const dynamic = 'force-dynamic';

/**
 * Previews a coupon or gift-card code against the cart with the same rules checkout uses
 * (src/lib/orders/checkout-service.ts): expiry, limits, minimum spend on eligible (non gift-card) lines.
 * Nothing is reserved here; checkout re-checks and claims. The answer carries no personal data.
 */
export async function POST(request: Request) {
  const limited = await enforce(request, 'codeCheck');
  if (limited) return limited;
  try {
    const text = await request.text();
    if (text.length > CART_LIMITS.bodyBytes) return NextResponse.json({ error: 'İstek çok büyük.' }, { status: 413 });
    let body: { code?: unknown; cart?: unknown; email?: unknown };
    try {
      body = JSON.parse(text);
    } catch {
      return NextResponse.json({ error: 'Geçersiz istek.' }, { status: 400 });
    }
    if (typeof body.code !== 'string' || !body.code.trim()) {
      return NextResponse.json({ error: 'Lütfen bir kupon veya hediye kartı kodu giriniz.' }, { status: 400 });
    }

    const lines = await resolveCart(prisma, body.cart, '');
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase().slice(0, 254) : '';
    const plan = await planDiscount(prisma, body.code, lines, email);
    if (plan.kind === 'none') return NextResponse.json({ error: 'Kod geçersiz.' }, { status: 400 });

    if (plan.kind === 'coupon') {
      const coupon = await prisma.coupon.findUniqueOrThrow({ where: { id: plan.couponId }, select: { discountType: true, discountValue: true } });
      return NextResponse.json({ valid: true, code: plan.code, discountType: coupon.discountType, discountValue: coupon.discountValue, discountAmount: plan.amount });
    }

    const card = await prisma.giftCard.findUniqueOrThrow({ where: { id: plan.giftCardId }, select: { currentBalance: true } });
    return NextResponse.json({
      valid: true,
      isGiftCard: true,
      code: plan.code,
      discountType: 'GIFT_CARD',
      discountAmount: plan.amount,
      remainingGiftCardBalance: roundMoney(Math.max(0, card.currentBalance - plan.amount)),
    });
  } catch (error) {
    if (error instanceof CheckoutError) return NextResponse.json({ error: error.message }, { status: error.status === 409 ? 400 : error.status });
    console.error('Coupon/GiftCard validation error:', error);
    return NextResponse.json({ error: 'Kod doğrulanırken bir hata oluştu.' }, { status: 500 });
  }
}
