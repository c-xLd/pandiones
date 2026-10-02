import { NextResponse } from 'next/server';
import { maskSecret } from '@/lib/security/redact';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { requireRecentAuth } from '@/lib/security/admin-guard';
import { createGiftCard } from '@/lib/gift-cards/gift-card-service';
import { sendGiftCardDeliveryEmail } from '@/lib/email/provider';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getCurrentUser(request);
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 403 });
    }

    const giftCards = await prisma.giftCard.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        usages: {
          include: {
            order: {
              select: {
                id: true,
                orderNumber: true,
                customerName: true,
                totalAmount: true,
              },
            },
          },
          orderBy: { usedAt: 'desc' },
        },
        order: {
          select: {
            id: true,
            orderNumber: true,
            customerName: true,
          },
        },
      },
    });

    return NextResponse.json(giftCards);
  } catch (error) {
    console.error('Admin gift cards GET error:', error);
    return NextResponse.json({ error: 'Hediye kartları alınamadı.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getCurrentUser(request);
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 403 });
    }
    const stepUp = requireRecentAuth(session);
    if (stepUp) return stepUp;

    const body = await request.json();
    const { initialBalance, theme, recipientName, recipientEmail, senderName, giftNote } = body;

    const balanceNum = Number(initialBalance);
    if (!balanceNum || balanceNum <= 0 || !Number.isFinite(balanceNum)) {
      return NextResponse.json({ error: 'Geçerli bir kart bakiyesi giriniz.' }, { status: 400 });
    }

    if (!recipientName?.trim()) {
      return NextResponse.json({ error: 'Alıcı adı gereklidir.' }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!recipientEmail || !emailRegex.test(recipientEmail.trim())) {
      return NextResponse.json({ error: 'Geçerli bir alıcı e-posta adresi giriniz.' }, { status: 400 });
    }

    const card = await createGiftCard({
      initialBalance: balanceNum,
      theme: theme || 'noir',
      recipientName: recipientName.trim(),
      recipientEmail: recipientEmail.trim().toLowerCase(),
      senderName: senderName?.trim() || 'Pandiones Özel Hizmetleri',
      giftNote: giftNote?.trim() || null,
      isActive: true,
    });

    // Otomatik teslimat e-postası (kullanıcı onayı doğrultusunda). The answer says whether it really went out.
    let emailSent = false;
    try {
      await sendGiftCardDeliveryEmail({
        recipientEmail: card.recipientEmail,
        recipientName: card.recipientName,
        senderName: card.senderName || 'Pandiones',
        code: card.code,
        initialBalance: card.initialBalance,
        giftNote: card.giftNote || undefined,
        theme: card.theme,
        expiresAt: card.expiresAt,
      });
      await prisma.giftCard.update({
        where: { id: card.id },
        data: { isDelivered: true },
      });
      emailSent = true;
    } catch (emailErr) {
      console.warn(`[GIFT_CARD_EMAIL_FAILED] Card ${maskSecret(card.code)}:`, emailErr instanceof Error ? emailErr.message : emailErr);
    }

    return NextResponse.json({ success: true, giftCard: { ...card, isDelivered: emailSent }, emailSent }, { status: 201 });
  } catch (error) {
    console.error('Admin gift card POST error:', error);
    return NextResponse.json({ error: 'Hediye kartı oluşturulamadı.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getCurrentUser(request);
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 403 });
    }

    const { id, isActive } = await request.json();
    if (!id || typeof isActive !== 'boolean') {
      return NextResponse.json({ error: 'Kart kimliği ve aktiflik durumu gereklidir.' }, { status: 400 });
    }

    const updated = await prisma.giftCard.update({
      where: { id },
      data: { isActive },
    });

    return NextResponse.json({ success: true, giftCard: updated });
  } catch (error) {
    console.error('Admin gift card PATCH error:', error);
    return NextResponse.json({ error: 'Hediye kartı güncellenemedi.' }, { status: 500 });
  }
}
