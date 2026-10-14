import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { PAID_STATUSES, buildDashboard } from '@/lib/admin/dashboard';
import { readStoreSettings } from '@/lib/settings/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getCurrentUser(request);
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 403 });
    }

    const settings = await readStoreSettings();
    const lowStockThreshold = settings.lowStockThreshold;

    const dashboardCutoff = new Date(Date.now() - 370 * 24 * 60 * 60 * 1000);

    const [
      revenueAgg,
      totalOrders,
      pendingOrdersCount,
      recentOrders,
      dashboardOrders,
      missingTrackingCount,
      productsCount,
      customersCount,
      lowStockVariants,
      newMessagesCount,
      pendingReturnsCount,
      pendingWaitlistCount,
      activeGiftCardsCount,
    ] = await Promise.all([
      prisma.order.aggregate({
        where: { status: { in: [...PAID_STATUSES] } },
        _sum: { totalAmount: true, discountAmount: true, giftCardAmount: true },
        _count: { _all: true },
      }),
      prisma.order.count(),
      prisma.order.count({ where: { status: { in: ['ODENDI', 'HAZIRLANIYOR'] } } }),
      prisma.order.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { id: true, orderNumber: true, customerName: true, totalAmount: true, status: true, createdAt: true },
      }),
      prisma.order.findMany({
        where: {
          status: { in: [...PAID_STATUSES] },
          createdAt: { gte: dashboardCutoff },
        },
        select: {
          status: true,
          totalAmount: true,
          createdAt: true,
          paidAt: true,
          items: {
            select: {
              productId: true,
              productName: true,
              quantity: true,
              price: true,
            },
          },
        },
      }),
      prisma.order.count({ where: { status: 'KARGODA', OR: [{ trackingCode: null }, { trackingCode: '' }] } }),
      prisma.product.count({ where: { category: { not: 'hediye-karti' } } }),
      prisma.user.count({ where: { role: 'CUSTOMER' } }),
      // Same threshold as the storefront's "az kaldı" (Ayarlar → Düşük stok eşiği); sold-out sizes included.
      prisma.variant.findMany({
        where: { stock: { lte: lowStockThreshold }, product: { status: 'PUBLISHED', category: { not: 'hediye-karti' } } },
        include: { product: { select: { id: true, name: true, slug: true, image: true } } },
        orderBy: [{ stock: 'asc' }],
      }),
      prisma.contactMessage.count({ where: { status: 'YENI' } }).catch(() => 0),
      prisma.returnRequest.count({ where: { status: 'BEKLIYOR' } }).catch(() => 0),
      prisma.stockAlert.count({ where: { isNotified: false } }).catch(() => 0),
      prisma.giftCard.count({ where: { isActive: true } }).catch(() => 0),
    ]);

    const totalRevenue = revenueAgg._sum.totalAmount ?? 0;
    const paidOrdersCount = revenueAgg._count._all;
    const aov = paidOrdersCount > 0 ? Math.round(totalRevenue / paidOrdersCount) : 0;
    const totalDiscounts = (revenueAgg._sum.discountAmount ?? 0) + (revenueAgg._sum.giftCardAmount ?? 0);

    return NextResponse.json({
      totalRevenue,
      aov,
      totalDiscounts,
      totalOrders,
      paidOrdersCount,
      pendingOrdersCount,
      totalProducts: productsCount,
      totalCustomers: customersCount,
      newMessagesCount,
      pendingReturnsCount,
      pendingWaitlistCount,
      activeGiftCardsCount,
      recentOrders,
      lowStockVariants,
      lowStockThreshold,
      missingTrackingCount,
      dashboard: buildDashboard(dashboardOrders, new Date()),
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json({ error: 'İstatistikler alınamadı.' }, { status: 500 });
  }
}
