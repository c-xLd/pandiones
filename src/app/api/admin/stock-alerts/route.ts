import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { logPersonalDataAccess } from '@/lib/security/admin-guard';
import { can } from '@/lib/security/roles';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getCurrentUser(request);
    if (!session || !can(session.role, 'catalog')) {
      return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 403 });
    }
    await logPersonalDataAccess(session, 'stock-alerts', 'Stok talebi e-postaları görüntülendi');

    const alerts = await prisma.stockAlert.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            category: true,
            image: true,
            price: true,
            variants: {
              select: {
                id: true,
                size: true,
                stock: true,
              },
            },
          },
        },
      },
    });

    // Group pending alerts by Product + Size
    const pendingAlerts = alerts.filter((a) => !a.isNotified);
    const summaryMap = new Map<string, {
      productId: string;
      productName: string;
      productSlug: string;
      category: string;
      image: string;
      size: string;
      currentStock: number;
      pendingCount: number;
      emails: string[];
    }>();

    for (const alert of pendingAlerts) {
      const key = `${alert.productId}::${alert.size}`;
      const variant = alert.product?.variants?.find((v) => v.size === alert.size);
      const currentStock = variant ? variant.stock : 0;

      if (!summaryMap.has(key)) {
        summaryMap.set(key, {
          productId: alert.productId,
          productName: alert.product?.name || 'Bilinmeyen Ürün',
          productSlug: alert.product?.slug || '',
          category: alert.product?.category || '',
          image: alert.product?.image || '',
          size: alert.size,
          currentStock,
          pendingCount: 0,
          emails: [],
        });
      }

      const item = summaryMap.get(key)!;
      item.pendingCount++;
      if (item.emails.length < 5) {
        item.emails.push(alert.email);
      }
    }

    const waitlistSummary = Array.from(summaryMap.values()).sort(
      (a, b) => b.pendingCount - a.pendingCount
    );

    return NextResponse.json({
      alerts,
      waitlistSummary,
      totalPending: pendingAlerts.length,
      totalNotified: alerts.length - pendingAlerts.length,
    });
  } catch (error) {
    console.error('Admin stock alerts GET error:', error);
    return NextResponse.json({ error: 'Stok talepleri alınamadı.' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getCurrentUser(request);
    if (!session || !can(session.role, 'catalog')) {
      return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 403 });
    }

    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ error: 'Talep ID gereklidir.' }, { status: 400 });
    }

    await prisma.stockAlert.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin stock alert DELETE error:', error);
    return NextResponse.json({ error: 'Talep silinemedi.' }, { status: 500 });
  }
}
