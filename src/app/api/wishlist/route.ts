import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ items: [] });
    }

    const wishlists = await prisma.wishlistItem.findMany({
      where: { userId: session.userId },
      include: {
        product: {
          include: { variants: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      items: wishlists.map((w) => w.product),
    });
  } catch (error) {
    console.error('Error fetching wishlist:', error);
    return NextResponse.json({ error: 'Favoriler alınamadı.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { productId } = await request.json();
    if (!productId) {
      return NextResponse.json({ error: 'Ürün ID gerekli.' }, { status: 400 });
    }

    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ success: true, guest: true });
    }

    // Check if already in wishlist
    const existing = await prisma.wishlistItem.findFirst({
      where: {
        userId: session.userId,
        productId,
      },
    });

    if (existing) {
      await prisma.wishlistItem.delete({
        where: { id: existing.id },
      });
      return NextResponse.json({ added: false });
    } else {
      await prisma.wishlistItem.create({
        data: {
          userId: session.userId,
          productId,
        },
      });
      return NextResponse.json({ added: true });
    }
  } catch (error) {
    console.error('Error toggling wishlist:', error);
    return NextResponse.json({ error: 'Favori güncellenemedi.' }, { status: 500 });
  }
}
