import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { logPersonalDataAccess } from '@/lib/security/admin-guard';

export const dynamic = 'force-dynamic';

const PAID_STATUSES = ['ODENDI', 'HAZIRLANIYOR', 'KARGODA', 'TESLIM_EDILDI'];

export async function GET(request: Request) {
  try {
    const session = await getCurrentUser(request);
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 403 });
    }
    await logPersonalDataAccess(session, 'customers', 'Müşteri listesi görüntülendi');

    const customers = await prisma.user.findMany({
      where: { role: 'CUSTOMER' },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        createdAt: true,
        addresses: {
          select: {
            id: true,
            title: true,
            recipient: true,
            city: true,
            district: true,
            address: true,
            phone: true,
            isDefault: true,
          },
        },
        orders: {
          select: {
            id: true,
            orderNumber: true,
            totalAmount: true,
            status: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: {
            wishlists: true,
            orders: true,
          },
        },
      },
    });

    const enriched = customers.map((c) => {
      const paidOrders = c.orders.filter((o) => PAID_STATUSES.includes(o.status));
      const totalSpent = paidOrders.reduce((sum, o) => sum + o.totalAmount, 0);
      const lastOrder = c.orders[0];

      return {
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        createdAt: c.createdAt,
        totalOrdersCount: c.orders.length,
        paidOrdersCount: paidOrders.length,
        totalSpent,
        lastOrderAt: lastOrder ? lastOrder.createdAt : null,
        lastOrderNumber: lastOrder ? lastOrder.orderNumber : null,
        wishlistCount: c._count.wishlists,
        addresses: c.addresses,
        recentOrders: c.orders.slice(0, 5),
      };
    });

    return NextResponse.json(enriched);
  } catch (error) {
    console.error('Admin customers GET error:', error);
    return NextResponse.json({ error: 'Müşteriler alınamadı.' }, { status: 500 });
  }
}
