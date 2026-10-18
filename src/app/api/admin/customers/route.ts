import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { logPersonalDataAccess, requireAdmin, requireRecentAuth } from '@/lib/security/admin-guard';
import { readJson } from '@/lib/security/request';
import { RoleChangeError, ROLE_CHANGE_TEXT, setStaffRole } from '@/lib/admin/staff-role';

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
      // Customers and staff (staff are customer accounts with panel rights); admins are not listed.
      where: { role: { in: ['CUSTOMER', 'STAFF'] } },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        totpEnabledAt: true,
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
        role: c.role === 'STAFF' ? 'STAFF' : 'CUSTOMER',
        twoFactor: Boolean(c.totpEnabledAt),
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

/** Makes a customer staff or staff a customer again (admin only, 2FA confirmed in the last 10 minutes). */
export async function PATCH(request: Request) {
  const guard = await requireAdmin(request);
  if (guard.response) return guard.response;
  const reauth = requireRecentAuth(guard.session);
  if (reauth) return reauth;
  const parsed = await readJson<{ userId?: unknown; role?: unknown }>(request);
  if (!parsed.ok) return NextResponse.json({ error: 'İstek okunamadı.' }, { status: parsed.status });
  const { userId, role } = parsed.body ?? {};
  try {
    const result = await setStaffRole(prisma, guard.session, typeof userId === 'string' ? userId : '', role);
    return NextResponse.json({ success: true, ...result }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof RoleChangeError) {
      const text = ROLE_CHANGE_TEXT[error.code];
      return NextResponse.json({ error: text.message, code: error.code }, { status: text.status });
    }
    console.error('Role change error:', error);
    return NextResponse.json({ error: 'Rol değiştirilemedi.' }, { status: 500 });
  }
}
