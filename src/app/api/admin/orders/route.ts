import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { sendOrderShippedEmail } from '@/lib/email/provider';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getCurrentUser(request);
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 403 });
    }

    const orders = await prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        items: true,
      },
    });

    return NextResponse.json(orders);
  } catch (error) {
    console.error('Admin orders error:', error);
    return NextResponse.json({ error: 'Siparişler alınamadı.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getCurrentUser(request);
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 403 });
    }

    const { orderId, status, trackingCompany, trackingCode } = await request.json();
    if (!orderId || !status) {
      return NextResponse.json({ error: 'Sipariş ID ve durum gerekli.' }, { status: 400 });
    }

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        status,
        ...(trackingCompany !== undefined && { trackingCompany }),
        ...(trackingCode !== undefined && { trackingCode }),
      },
    });

    if (status === 'KARGODA' && updated.trackingCode) {
      sendOrderShippedEmail({
        orderNumber: updated.orderNumber,
        customerName: updated.customerName,
        customerEmail: updated.customerEmail,
        trackingCompany: updated.trackingCompany || 'Kargo',
        trackingCode: updated.trackingCode,
      }).catch((err) => {
        console.warn(`[ORDER_SHIPPED_EMAIL_FAILED] Order ${updated.orderNumber}:`, err);
      });
    }

    return NextResponse.json({ success: true, order: updated });
  } catch (error) {
    console.error('Admin order update error:', error);
    return NextResponse.json({ error: 'Sipariş güncellenemedi.' }, { status: 500 });
  }
}
