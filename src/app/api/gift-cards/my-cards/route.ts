import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getCurrentUser(request);
    if (!session?.userId) {
      return NextResponse.json({ error: 'Giriş yapmanız gerekmektedir.' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, email: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı.' }, { status: 404 });
    }

    const userEmail = user.email.toLowerCase().trim();
    const now = new Date();

    // 1. Gift cards received by the customer (recipientEmail matches user email)
    const receivedCards = await prisma.giftCard.findMany({
      where: {
        recipientEmail: {
          equals: userEmail,
        },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        code: true,
        initialBalance: true,
        currentBalance: true,
        currency: true,
        theme: true,
        recipientName: true,
        recipientEmail: true,
        senderName: true,
        giftNote: true,
        isActive: true,
        expiresAt: true,
        createdAt: true,
        usages: {
          orderBy: { usedAt: 'desc' },
          select: {
            id: true,
            amount: true,
            usedAt: true,
            order: {
              select: {
                orderNumber: true,
              },
            },
          },
        },
      },
    });

    // 2. Gift cards purchased by the customer in their orders
    const purchasedCards = await prisma.giftCard.findMany({
      where: {
        order: {
          userId: user.id,
        },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        code: true,
        initialBalance: true,
        currentBalance: true,
        currency: true,
        theme: true,
        recipientName: true,
        recipientEmail: true,
        senderName: true,
        giftNote: true,
        isActive: true,
        isDelivered: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    // Calculate total active balance for cards owned by customer
    const totalActiveBalance = receivedCards
      .filter((card) => card.isActive && new Date(card.expiresAt) > now)
      .reduce((sum, card) => sum + card.currentBalance, 0);

    return NextResponse.json({
      receivedCards,
      purchasedCards,
      totalActiveBalance,
    });
  } catch (error) {
    console.error('Error fetching user gift cards:', error);
    return NextResponse.json(
      { error: 'Hediye kartları yüklenirken bir hata oluştu.' },
      { status: 500 }
    );
  }
}
