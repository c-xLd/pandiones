import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { recordAudit } from '@/lib/audit';
import { checkReturnTransition, isReturnStatus } from '@/lib/orders/transitions';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getCurrentUser();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 403 });
    }

    const returns = await prisma.returnRequest.findMany({
      include: {
        order: {
          include: {
            items: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(returns);
  } catch (error) {
    console.error('Error fetching admin return requests:', error);
    return NextResponse.json(
      { error: 'İade talepleri yüklenemedi.' },
      { status: 500 }
    );
  }
}

const RETURN_STATUS_TEXT: Record<string, string> = { BEKLIYOR: 'beklemeye alındı', ONAYLANDI: 'onaylandı', REDDEDILDI: 'reddedildi' };

export async function PATCH(request: Request) {
  try {
    const session = await getCurrentUser();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 403 });
    }

    const body = await request.json();
    const { id, status, adminNotes } = body;

    if (!id || !isReturnStatus(status)) {
      return NextResponse.json(
        { error: 'Geçersiz talep ID veya durum.' },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const before = await tx.returnRequest.findUnique({
        where: { id },
        select: { status: true, order: { select: { orderNumber: true } } },
      });
      if (!before) {
        return { status: 404, error: 'İade talebi bulunamadı.' } as const;
      }
      const check = checkReturnTransition(before.status, status);
      if (!check.ok) {
        return { status: 409, error: check.reason } as const;
      }
      const changed = await tx.returnRequest.update({
        where: { id },
        data: {
          status,
          ...(adminNotes !== undefined ? { adminNotes } : {}),
        },
      });
      if (before.status !== status) {
        await recordAudit(tx, session, {
          action: 'return.status',
          entity: 'return',
          entityId: changed.id,
          summary: `İade #${changed.id.slice(-6).toUpperCase()}${before.order ? ` (sipariş #${before.order.orderNumber})` : ''}: ${RETURN_STATUS_TEXT[status]}`,
          diff: { status: [before.status, status] },
        });
      }
      return { status: 200, changed } as const;
    });

    if (result.status !== 200) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({
      success: true,
      message: `İade talebi durumu "${status}" olarak güncellendi.`,
      returnRequest: result.changed,
    });
  } catch (error) {
    console.error('Error updating return request:', error);
    return NextResponse.json(
      { error: 'İade talebi güncellenirken bir hata oluştu.' },
      { status: 500 }
    );
  }
}
