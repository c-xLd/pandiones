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

    const [orders, missingTrackingCount,  productsCount, customersCount, lowStockVariants, newMessagesCount, pendingReturnsCount, pendingWaitlistCount, activeGiftCardsCount] = await Promise.all([
      prisma.order.findMany({
        orderBy: { createdAt: 'desc' },
        include: { items: true },
      }),
      prisma.order.count({ where: { status: 'KARGODA', OR: [{ trackingCode: null }, { trackingCode: '' }] } }),
      prisma.product.count(),
      prisma.user.count({ where: { role: 'CUSTOMER' } }),
      // Same threshold as the storefront's "az kaldı" (Ayarlar → Düşük stok eşiği); sold-out sizes included.
      prisma.variant.findMany({
        where: { stock: { lte: lowStockThreshold }, product: { status: 'PUBLISHED' } },
        include: { product: { select: { id: true, name: true, slug: true, image: true } } },
        orderBy: [{ stock: 'asc' }],
      }),
      prisma.contactMessage.count({ where: { status: 'YENI' } }).catch(() => 0),
      prisma.returnRequest.count({ where: { status: 'BEKLIYOR' } }).catch(() => 0),
      prisma.stockAlert.count({ where: { isNotified: false } }).catch(() => 0),
      prisma.giftCard.count({ where: { isActive: true } }).catch(() => 0),
    ]);

    const paidOrders = orders.filter((o) => (PAID_STATUSES as readonly string[]).includes(o.status));
    const totalRevenue = paidOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const aov = paidOrders.length > 0 ? Math.round(totalRevenue / paidOrders.length) : 0;
    const totalDiscounts = paidOrders.reduce((sum, o) => sum + (o.discountAmount || 0) + (o.giftCardAmount || 0), 0);
    const pendingOrdersCount = orders.filter((o) => o.status === 'ODENDI' || o.status === 'HAZIRLANIYOR').length;

    return NextResponse.json({
      totalRevenue,
      aov,
      totalDiscounts,
      totalOrders: orders.length,
      paidOrdersCount: paidOrders.length,
      pendingOrdersCount,
      totalProducts: productsCount,
      totalCustomers: customersCount,
      newMessagesCount,
      pendingReturnsCount,
      pendingWaitlistCount,
      activeGiftCardsCount,
      recentOrders: orders.slice(0, 5),
      lowStockVariants,
      lowStockThreshold,
      missingTrackingCount,
      dashboard: buildDashboard(orders, new Date()),
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json({ error: 'İstatistikler alınamadı.' }, { status: 500 });
  }
}
