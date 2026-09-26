import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { PUBLIC_PRODUCT_WHERE } from '@/lib/products/public-catalog';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const product = await prisma.product.findFirst({
      where: { ...PUBLIC_PRODUCT_WHERE, OR: [{ id }, { slug: id }] },
      select: { id: true },
    });

    if (!product) {
      return NextResponse.json({ error: 'Ürün bulunamadı.' }, { status: 404 });
    }

    const reviews = await prisma.review.findMany({
      where: { productId: product.id },
      orderBy: { createdAt: 'desc' },
    });

    const avgRating =
      reviews.length > 0
        ? Math.round(
            (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 10
          ) / 10
        : null;

    return NextResponse.json({
      reviews,
      total: reviews.length,
      averageRating: avgRating,
    });
  } catch (error) {
    console.error('Reviews fetch error:', error);
    return NextResponse.json({ error: 'Yorumlar alınamadı.' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { rating, comment } = body;

    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json(
        { error: 'Değerlendirme yapabilmek için lütfen giriş yapınız.' },
        { status: 401 }
      );
    }

    const numRating = Number(rating);
    if (!numRating || numRating < 1 || numRating > 5 || !comment || !comment.trim()) {
      return NextResponse.json(
        { error: 'Lütfen 1 ile 5 arasında bir puan ve geçerli bir yorum giriniz.' },
        { status: 400 }
      );
    }

    const product = await prisma.product.findFirst({
      where: { ...PUBLIC_PRODUCT_WHERE, OR: [{ id }, { slug: id }] },
      select: { id: true },
    });

    if (!product) {
      return NextResponse.json({ error: 'Ürün bulunamadı.' }, { status: 404 });
    }

    // Check if user has a verified purchase of this product
    const verifiedPurchase = await prisma.orderItem.findFirst({
      where: {
        productId: product.id,
        order: {
          userId: session.userId,
          status: { in: ['ODENDI', 'HAZIRLANIYOR', 'KARGODA', 'TESLIM_EDILDI'] },
        },
      },
    });

    const isVerifiedBuyer = Boolean(verifiedPurchase);
    const authorName = isVerifiedBuyer
      ? `${session.name} (Doğrulanmış Alıcı)`
      : session.name;

    const review = await prisma.review.create({
      data: {
        productId: product.id,
        userId: session.userId,
        userName: authorName,
        rating: Math.round(numRating),
        comment: comment.trim(),
      },
    });

    return NextResponse.json({ success: true, review, isVerifiedBuyer });
  } catch (error) {
    console.error('Review create error:', error);
    return NextResponse.json(
      { error: 'Yorum kaydedilirken bir hata oluştu.' },
      { status: 500 }
    );
  }
}
