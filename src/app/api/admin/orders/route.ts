import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { recordAudit } from '@/lib/audit';
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
        items: {
          include: {
            product: {
              select: {
                id: true,
                image: true,
                slug: true,
                category: true,
              },
            },
          },
        },
        transactions: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    return NextResponse.json(orders);
  } catch (error) {
    console.error('Admin orders error:', error);
    return NextResponse.json({ error: 'Siparişler alınamadı.' }, { status: 500 });
  }
}

const ORDER_STATUSES = ['ODEME_BEKLENIYOR', 'ODENDI', 'HAZIRLANIYOR', 'KARGODA', 'TESLIM_EDILDI', 'ODEME_BASARISIZ'];
const ORDER_STATUS_LABELS: Record<string, string> = {
  ODEME_BEKLENIYOR: 'Ödeme bekleniyor',
  ODENDI: 'Ödendi',
  HAZIRLANIYOR: 'Hazırlanıyor',
  KARGODA: 'Kargoda',
  TESLIM_EDILDI: 'Teslim edildi',
  ODEME_BASARISIZ: 'Ödeme başarısız',
};

export async function PATCH(request: Request) {
  try {
    const session = await getCurrentUser(request);
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 403 });
    }

    const body = await request.json();
    const { orderId, orderIds, status, trackingCompany, trackingCode, adminNotes } = body;

    const idsToUpdate: string[] = [];
    if (Array.isArray(orderIds) && orderIds.length > 0) {
      idsToUpdate.push(...orderIds.filter(Boolean));
    } else if (orderId) {
      idsToUpdate.push(orderId);
    }

    if (idsToUpdate.length === 0) {
      return NextResponse.json({ error: 'Sipariş ID gerekli.' }, { status: 400 });
    }

    const updateData: Record<string, any> = {};
    if (status !== undefined) updateData.status = status;
    if (trackingCompany !== undefined) updateData.trackingCompany = trackingCompany;
    if (trackingCode !== undefined) updateData.trackingCode = trackingCode;
    if (adminNotes !== undefined) updateData.adminNotes = adminNotes;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'Güncellenecek alan belirtilmedi.' }, { status: 400 });
    }

    if (status !== undefined && !ORDER_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Geçersiz sipariş durumu.' }, { status: 400 });
    }

    // The change and its activity-log line commit together.
    await prisma.$transaction(async (tx) => {
      const before = await tx.order.findMany({
        where: { id: { in: idsToUpdate } },
        select: { id: true, orderNumber: true, status: true, trackingCompany: true, trackingCode: true, adminNotes: true },
      });
      await tx.order.updateMany({ where: { id: { in: idsToUpdate } }, data: updateData });
      for (const order of before) {
        const diff: Record<string, [unknown, unknown]> = {};
        for (const [field, value] of Object.entries(updateData)) {
          const previous = order[field as keyof typeof order];
          if (previous === value) continue;
          // Internal notes can hold customer details; the log records that they changed, not the text.
          diff[field] = field === 'adminNotes' ? ['önceki not', 'yeni not'] : [previous, value];
        }
        if (Object.keys(diff).length === 0) continue;
        const parts = [
          diff.status ? `durum ${ORDER_STATUS_LABELS[String(diff.status[1])] ?? diff.status[1]}` : null,
          diff.trackingCode || diff.trackingCompany ? 'kargo bilgisi' : null,
          diff.adminNotes ? 'yönetici notu' : null,
        ].filter(Boolean);
        await recordAudit(tx, session, {
          action: diff.status ? 'order.status' : diff.adminNotes && parts.length === 1 ? 'order.note' : 'order.tracking',
          entity: 'order',
          entityId: order.id,
          summary: `#${order.orderNumber}: ${parts.join(', ')} güncellendi`,
          diff,
        });
      }
    });

    const updatedOrders = await prisma.order.findMany({
      where: { id: { in: idsToUpdate } },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                image: true,
                slug: true,
                category: true,
              },
            },
          },
        },
        transactions: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (status === 'KARGODA') {
      // Awaited so the send finishes inside this request (a serverless function may stop right after
      // the response). A failed e-mail does not undo the status change; it is logged.
      await Promise.all(
        updatedOrders
          .filter((ord) => ord.trackingCode)
          .map((ord) =>
            sendOrderShippedEmail({
              orderNumber: ord.orderNumber,
              customerName: ord.customerName,
              customerEmail: ord.customerEmail,
              trackingCompany: ord.trackingCompany || 'Kargo',
              trackingCode: ord.trackingCode as string,
            }).catch((err) => {
              console.warn(`[ORDER_SHIPPED_EMAIL_FAILED] Order ${ord.orderNumber}:`, err);
            }),
          ),
      );
    }

    return NextResponse.json({
      success: true,
      updatedCount: updatedOrders.length,
      orders: updatedOrders,
      order: updatedOrders[0],
    });
  } catch (error) {
    console.error('Admin order update error:', error);
    return NextResponse.json({ error: 'Sipariş güncellenemedi.' }, { status: 500 });
  }
}
