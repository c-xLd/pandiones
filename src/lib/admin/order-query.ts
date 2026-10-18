import type { Prisma } from '@prisma/client';
import { CARRIERS, isOrderStatus } from '@/lib/orders/transitions';

/** Query string of GET /api/admin/orders, validated. Pure; tested in tests/admin-orders-list.test.ts. */

export const ORDER_VIEWS = ['ALL', 'PENDING_FULFILLMENT', 'MISSING_TRACKING', 'LABEL_NOT_PRINTED', 'DELIVERY_FAILED'] as const;
export const ORDER_RANGES = ['24h', '7d', '30d'] as const;
export const ORDER_SORTS = ['new', 'old', 'total'] as const;
export const ORDER_PAGE_SIZES = [10, 15, 25, 50, 100] as const;
const IN_FULFILLMENT = ['ODENDI', 'HAZIRLANIYOR', 'KARGODA'];
const DAY = 24 * 3600 * 1000;

export type OrderQuery = {
  status: string;
  carrier: string | null;
  month: string | null;
  range: (typeof ORDER_RANGES)[number] | null;
  q: string;
  page: number;
  pageSize: number;
  sort: (typeof ORDER_SORTS)[number];
};

const pick = <T extends string>(value: string | null, allowed: readonly T[]): T | null => (value && allowed.includes(value as T) ? (value as T) : null);

export function parseOrderQuery(params: URLSearchParams): OrderQuery {
  const status = params.get('status') ?? 'ALL';
  const pageSize = Number(params.get('pageSize'));
  const page = Number(params.get('page'));
  const month = params.get('month');
  return {
    status: ORDER_VIEWS.includes(status as (typeof ORDER_VIEWS)[number]) || isOrderStatus(status) ? status : 'ALL',
    carrier: pick(params.get('carrier'), CARRIERS),
    month: month && /^\d{4}-(0[1-9]|1[0-2])$/.test(month) ? month : null,
    range: pick(params.get('range'), ORDER_RANGES),
    q: (params.get('q') ?? '').trim().slice(0, 80),
    page: Number.isInteger(page) && page > 0 ? page : 1,
    pageSize: ORDER_PAGE_SIZES.includes(pageSize as (typeof ORDER_PAGE_SIZES)[number]) ? pageSize : 15,
    sort: pick(params.get('sort'), ORDER_SORTS) ?? 'new',
  };
}

/** Türkiye has no DST: months start at 00:00 UTC+3. */
export function monthBounds(month: string): { gte: Date; lt: Date } {
  const [year, m] = month.split('-').map(Number);
  const next = m === 12 ? `${year + 1}-01` : `${year}-${String(m + 1).padStart(2, '0')}`;
  return { gte: new Date(`${month}-01T00:00:00+03:00`), lt: new Date(`${next}-01T00:00:00+03:00`) };
}

/** Shipment created but its label never printed (parcel not yet out of the door). */
export const LABEL_NOT_PRINTED: Prisma.OrderWhereInput = { shipments: { some: { status: 'ETIKET_HAZIR', labelPrintedAt: null } } };
/** PTT could not deliver, or the parcel is on its way back. */
export const DELIVERY_FAILED: Prisma.OrderWhereInput = { shipments: { some: { status: { in: ['TESLIM_EDILEMEDI', 'IADE'] } } } };

export function buildOrderWhere(query: OrderQuery, now = new Date()): Prisma.OrderWhereInput {
  const and: Prisma.OrderWhereInput[] = [];
  if (query.status === 'PENDING_FULFILLMENT') and.push({ status: { in: ['ODENDI', 'HAZIRLANIYOR'] } });
  else if (query.status === 'MISSING_TRACKING') and.push({ status: { in: IN_FULFILLMENT }, OR: [{ trackingCode: null }, { trackingCode: '' }] });
  else if (query.status === 'LABEL_NOT_PRINTED') and.push(LABEL_NOT_PRINTED);
  else if (query.status === 'DELIVERY_FAILED') and.push(DELIVERY_FAILED);
  else if (query.status !== 'ALL') and.push({ status: query.status });
  if (query.carrier) and.push({ trackingCompany: query.carrier });
  if (query.month) and.push({ createdAt: monthBounds(query.month) });
  if (query.range) {
    const days = query.range === '24h' ? 1 : query.range === '7d' ? 7 : 30;
    and.push({ createdAt: { gte: new Date(now.getTime() - days * DAY) } });
  }
  if (query.q) {
    const contains = { contains: query.q, mode: 'insensitive' as const };
    and.push({
      OR: [
        { orderNumber: contains },
        { customerName: contains },
        { customerEmail: contains },
        { customerPhone: contains },
        { shippingCity: contains },
        { shippingDistrict: contains },
        { trackingCode: contains },
        { items: { some: { productName: contains } } },
      ],
    });
  }
  return and.length ? { AND: and } : {};
}

export function buildOrderBy(sort: OrderQuery['sort']): Prisma.OrderOrderByWithRelationInput[] {
  if (sort === 'old') return [{ createdAt: 'asc' }];
  if (sort === 'total') return [{ totalKurus: 'desc' }, { createdAt: 'desc' }];
  return [{ createdAt: 'desc' }];
}
