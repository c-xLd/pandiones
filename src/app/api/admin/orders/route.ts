import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { DELIVERY_FAILED, LABEL_NOT_PRINTED, buildOrderBy, buildOrderWhere, parseOrderQuery } from '@/lib/admin/order-query';
import { ADMIN_ORDER_INCLUDE, applyOrderChanges, type OrderChange } from '@/lib/admin/order-updates';

export const dynamic = 'force-dynamic';

const IN_FULFILLMENT = ['ODENDI', 'HAZIRLANIYOR', 'KARGODA'];

/** One page of orders for the panel, with the filter applied on the server and the overall counts. */
export async function GET(request: Request) {
  try {
    const session = await getCurrentUser(request);
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 403 });
    }

    const url = new URL(request.url);
    const includeCounts = url.searchParams.get('counts') !== 'false';
    const query = parseOrderQuery(url.searchParams);
    const where = buildOrderWhere(query);

    if (!includeCounts) {
      const [total, orders] = await Promise.all([
        prisma.order.count({ where }),
        prisma.order.findMany({
          where,
          orderBy: buildOrderBy(query.sort),
          skip: (query.page - 1) * query.pageSize,
          take: query.pageSize,
          include: ADMIN_ORDER_INCLUDE,
        }),
      ]);

      return NextResponse.json({
        orders,
        total,
        page: query.page,
        pageSize: query.pageSize,
        counts: {},
        months: [],
      });
    }

    const [total, orders, byStatus, missingTracking, months, labelPending, deliveryFailed] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        orderBy: buildOrderBy(query.sort),
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: ADMIN_ORDER_INCLUDE,
      }),
      prisma.order.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.order.count({ where: { status: { in: IN_FULFILLMENT }, OR: [{ trackingCode: null }, { trackingCode: '' }] } }),
      prisma.$queryRaw<{ key: string; count: bigint }[]>(Prisma.sql`
        SELECT to_char(("createdAt" AT TIME ZONE 'UTC') + INTERVAL '3 hours', 'YYYY-MM') AS key, COUNT(*) AS count
        FROM "Order" GROUP BY key ORDER BY key DESC`),
      prisma.order.count({ where: LABEL_NOT_PRINTED }),
      prisma.order.count({ where: DELIVERY_FAILED }),
    ]);

    const counts: Record<string, number> = { all: 0, missingTracking, labelPending, deliveryFailed };
    for (const row of byStatus) {
      counts[row.status] = row._count._all;
      counts.all += row._count._all;
    }

    return NextResponse.json({
      orders,
      total,
      page: query.page,
      pageSize: query.pageSize,
      counts,
      months: months.map((row) => ({ key: row.key, count: Number(row.count) })),
    });
  } catch (error) {
    console.error('Admin orders error:', error);
    return NextResponse.json({ error: 'Siparişler alınamadı.' }, { status: 500 });
  }
}

/**
 * Status, tracking and note changes for one order (`orderId`) or many (`orderIds`, same change for each).
 * Changes that break the transition rules are refused: 409 for a single order, `skipped` for a batch.
 */
export async function PATCH(request: Request) {
  try {
    const session = await getCurrentUser(request);
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Geçersiz istek.' }, { status: 400 });
    const { orderId, orderIds, status, trackingCompany, trackingCode, adminNotes } = body as Record<string, unknown>;

    const ids = Array.isArray(orderIds) && orderIds.length > 0 ? orderIds.filter((id): id is string => typeof id === 'string') : typeof orderId === 'string' ? [orderId] : [];
    if (ids.length === 0) return NextResponse.json({ error: 'Sipariş ID gerekli.' }, { status: 400 });
    if (ids.length > 200) return NextResponse.json({ error: 'Tek seferde en çok 200 sipariş güncellenebilir.' }, { status: 400 });

    const change: Omit<OrderChange, 'id'> = {};
    if (typeof status === 'string') change.status = status;
    if (typeof trackingCompany === 'string') change.trackingCompany = trackingCompany;
    if (typeof trackingCode === 'string') change.trackingCode = trackingCode;
    if (typeof adminNotes === 'string') change.adminNotes = adminNotes;
    if (Object.keys(change).length === 0) return NextResponse.json({ error: 'Güncellenecek alan belirtilmedi.' }, { status: 400 });

    const result = await applyOrderChanges(prisma, session, ids.map((id) => ({ id, ...change })));

    if (ids.length === 1 && result.skipped.length === 1) {
      return NextResponse.json({ error: result.skipped[0].reason, skipped: result.skipped }, { status: 409 });
    }

    const updatedOrders = await prisma.order.findMany({ where: { id: { in: result.updatedIds } }, include: ADMIN_ORDER_INCLUDE });
    return NextResponse.json({
      success: true,
      updatedCount: updatedOrders.length,
      orders: updatedOrders,
      order: updatedOrders[0],
      skipped: result.skipped,
      emails: result.emails,
    });
  } catch (error) {
    console.error('Admin order update error:', error);
    return NextResponse.json({ error: 'Sipariş güncellenemedi.' }, { status: 500 });
  }
}
