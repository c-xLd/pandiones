import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, verifyOrderGuestToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const url = new URL(request.url);
    const guestToken =
      url.searchParams.get('token') ||
      request.headers.get('x-order-token') ||
      '';

    const order = await prisma.order.findFirst({
      where: {
        OR: [{ id }, { orderNumber: id }],
      },
      include: {
        items: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Sipariş bulunamadı.' }, { status: 404 });
    }

    const session = await getCurrentUser();
    const isAdmin = session?.role === 'ADMIN';
    const isOwner = Boolean(
      session?.userId && order.userId && session.userId === order.userId
    );
    const isVerifiedGuest = Boolean(
      guestToken && verifyOrderGuestToken(order.orderNumber, guestToken)
    );

    if (!isAdmin && !isOwner && !isVerifiedGuest) {
      return NextResponse.json(
        { error: 'Bu siparişi görüntüleme yetkiniz bulunmamaktadır.' },
        { status: 403 }
      );
    }

    return NextResponse.json(order);
  } catch (error) {
    console.error('Error fetching order:', error);
    return NextResponse.json(
      { error: 'Sipariş bilgileri alınırken bir hata oluştu.' },
      { status: 500 }
    );
  }
}
