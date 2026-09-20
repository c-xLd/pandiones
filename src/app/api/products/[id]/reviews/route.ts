import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { PUBLIC_PRODUCT_WHERE } from '@/lib/products/public-catalog';

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
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 5;

    return NextResponse.json({
      reviews,
      total: reviews.length,
      averageRating: Math.round(avgRating * 10) / 10,
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
    const { rating, comment, userName } = body;

    if (!rating || !comment) {
      return NextResponse.json(
        { error: 'Puan ve yorum alanları zorunludur.' },
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

    const session = await getCurrentUser();

    const review = await prisma.review.create({
      data: {
        productId: product.id,
        userId: session?.userId || null,
        userName: session?.name || userName || 'Değerli Müşterimiz',
        rating: Math.max(1, Math.min(5, Number(rating))),
        comment: comment.trim(),
      },
    });

    return NextResponse.json({ success: true, review });
  } catch (error) {
    console.error('Review create error:', error);
    return NextResponse.json(
      { error: 'Yorum kaydedilirken bir hata oluştu.' },
      { status: 500 }
    );
  }
}
