import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { code, subtotal } = await request.json();

    if (!code) {
      return NextResponse.json(
        { error: 'Lütfen bir kupon veya hediye kartı kodu giriniz.' },
        { status: 400 }
      );
    }

    const normalizedCode = code.toUpperCase().trim();
    const cartTotal = Number(subtotal) || 0;

    // 1. Try finding in Coupon table
    const coupon = await prisma.coupon.findUnique({
      where: { code: normalizedCode },
    });

    if (coupon && coupon.isActive) {
      if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
        return NextResponse.json(
          { error: 'Bu kuponun toplam kullanım limiti tükenmiştir.' },
          { status: 400 }
        );
      }

      if (coupon.minSpend && cartTotal < coupon.minSpend) {
        return NextResponse.json(
          {
            error: `Bu kupon yalnızca ${new Intl.NumberFormat('tr-TR', {
              style: 'currency',
              currency: 'TRY',
              maximumFractionDigits: 0,
            }).format(coupon.minSpend)} ve üzeri siparişlerde geçerlidir.`,
          },
          { status: 400 }
        );
      }

      let discountAmount = 0;
      if (coupon.discountType === 'PERCENTAGE') {
        discountAmount = Math.round((cartTotal * coupon.discountValue) / 100);
      } else {
        discountAmount = Math.min(coupon.discountValue, cartTotal);
      }

      return NextResponse.json({
        valid: true,
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        discountAmount,
      });
    }

    // 2. Try finding in GiftCard table
    const giftCard = await prisma.giftCard.findUnique({
      where: { code: normalizedCode },
    });

    if (giftCard) {
      if (!giftCard.isActive) {
        return NextResponse.json(
          { error: 'Bu hediye kartı kullanım dışıdır.' },
          { status: 400 }
        );
      }

      if (new Date() > giftCard.expiresAt) {
        return NextResponse.json(
          { error: 'Bu hediye kartının geçerlilik süresi dolmuştur.' },
          { status: 400 }
        );
      }

      if (giftCard.currentBalance <= 0) {
        return NextResponse.json(
          { error: 'Bu hediye kartının bakiyesi tükenmiştir.' },
          { status: 400 }
        );
      }

      const discountAmount = Math.min(giftCard.currentBalance, cartTotal);
      const remainingBalance = Math.max(0, giftCard.currentBalance - discountAmount);

      return NextResponse.json({
        valid: true,
        isGiftCard: true,
        code: giftCard.code,
        discountType: 'GIFT_CARD',
        discountValue: giftCard.currentBalance,
        discountAmount,
        remainingGiftCardBalance: remainingBalance,
        recipientName: giftCard.recipientName,
      });
    }

    // Neither coupon nor gift card found
    return NextResponse.json(
      { error: 'Geçersiz veya süresi dolmuş kupon / hediye kartı kodu.' },
      { status: 404 }
    );
  } catch (error) {
    console.error('Coupon/GiftCard validation error:', error);
    return NextResponse.json(
      { error: 'Kod doğrulanırken bir hata oluştu.' },
      { status: 500 }
    );
  }
}
