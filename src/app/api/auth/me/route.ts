import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { PUBLIC_PRODUCT_WHERE } from '@/lib/products/public-catalog';
import { toTlJson } from '@/lib/money-json';

export const dynamic = 'force-dynamic';

/**
 * The signed-in customer's own data for the account pages. Explicit `select` everywhere: internal fields
 * (admin notes, payment ids, idempotency keys, password and 2FA material) never leave the server.
 */
export async function GET() {
  try {
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ user: null });

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
        totpEnabledAt: true,
        orders: {
          orderBy: { createdAt: 'desc' },
          take: 100,
          select: {
            id: true,
            orderNumber: true,
            status: true,
            paymentStatus: true,
            totalKurus: true,
            discountKurus: true,
            giftCardKurus: true,
            giftCardCode: true,
            couponCode: true,
            createdAt: true,
            paidAt: true,
            trackingCompany: true,
            trackingCode: true,
            customerName: true,
            customerEmail: true,
            customerPhone: true,
            shippingAddress: true,
            shippingCity: true,
            shippingDistrict: true,
            shippingNotes: true,
            items: {
              select: {
                id: true,
                productId: true,
                productName: true,
                size: true,
                quantity: true,
                priceKurus: true,
                product: { select: { slug: true, image: true, name: true, color: true } },
              },
            },
            returns: { select: { id: true, status: true, reason: true, createdAt: true } },
          },
        },
        wishlists: {
          where: { product: PUBLIC_PRODUCT_WHERE },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            productId: true,
            createdAt: true,
            product: {
              select: {
                id: true,
                slug: true,
                name: true,
                priceKurus: true,
                color: true,
                category: true,
                image: true,
                variants: { select: { id: true, size: true, stock: true } },
              },
            },
          },
        },
      },
    });
    if (!user) return NextResponse.json({ user: null });

    const newsletter = await prisma.newsletter.findUnique({ where: { email: user.email.toLowerCase().trim() }, select: { id: true } });
    const { totpEnabledAt, ...rest } = user;
    return NextResponse.json({
      user: { ...toTlJson(rest), isSubscribedNewsletter: Boolean(newsletter), twoFactorEnabled: Boolean(totpEnabledAt) },
    });
  } catch (error) {
    console.error('Error in /api/auth/me:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Kullanıcı bilgisi alınamadı.' }, { status: 500 });
  }
}
