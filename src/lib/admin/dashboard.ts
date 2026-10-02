/** Dashboard figures from real orders. Pure: the stats route loads the rows, this shapes them. */

export const PAID_STATUSES = ['ODENDI', 'HAZIRLANIYOR', 'KARGODA', 'TESLIM_EDILDI'] as const;

export type DashboardOrder = {
  status: string;
  totalAmount: number;
  createdAt: Date;
  paidAt: Date | null;
  items: { productId: string; productName: string; quantity: number; price: number }[];
};

export type SeriesPoint = { key: string; label: string; revenue: number; orders: number };

export type Dashboard = {
  daily: SeriesPoint[];
  monthly: SeriesPoint[];
  period: { revenue: number; orders: number; previousRevenue: number; previousOrders: number };
  topProducts: { productId: string; name: string; quantity: number; revenue: number }[];
};

const DAY = 24 * 60 * 60 * 1000;
const MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

const isPaid = (status: string) => (PAID_STATUSES as readonly string[]).includes(status);
/** Revenue belongs to the day it was paid; older rows without paidAt fall back to creation. */
const paidDate = (order: DashboardOrder) => order.paidAt ?? order.createdAt;
const dayKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const monthKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
const round = (value: number) => Math.round(value * 100) / 100;

export function buildDashboard(orders: DashboardOrder[], now: Date, days = 30): Dashboard {
  const paid = orders.filter((order) => isPaid(order.status));

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const daily: SeriesPoint[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date(startOfToday.getTime() - i * DAY);
    daily.push({ key: dayKey(date), label: `${date.getDate()} ${MONTHS[date.getMonth()]}`, revenue: 0, orders: 0 });
  }
  const monthly: SeriesPoint[] = [];
  for (let i = 11; i >= 0; i -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthly.push({ key: monthKey(date), label: `${MONTHS[date.getMonth()]} ${String(date.getFullYear()).slice(2)}`, revenue: 0, orders: 0 });
  }
  const dailyByKey = new Map(daily.map((point) => [point.key, point]));
  const monthlyByKey = new Map(monthly.map((point) => [point.key, point]));

  const periodStart = startOfToday.getTime() - (days - 1) * DAY;
  const previousStart = periodStart - days * DAY;
  const period = { revenue: 0, orders: 0, previousRevenue: 0, previousOrders: 0 };
  const products = new Map<string, { productId: string; name: string; quantity: number; revenue: number }>();

  for (const order of paid) {
    const date = paidDate(order);
    const day = dailyByKey.get(dayKey(date));
    if (day) {
      day.revenue += order.totalAmount;
      day.orders += 1;
    }
    const month = monthlyByKey.get(monthKey(date));
    if (month) {
      month.revenue += order.totalAmount;
      month.orders += 1;
    }
    const time = date.getTime();
    if (time >= periodStart) {
      period.revenue += order.totalAmount;
      period.orders += 1;
    } else if (time >= previousStart) {
      period.previousRevenue += order.totalAmount;
      period.previousOrders += 1;
    }
    for (const item of order.items) {
      const entry = products.get(item.productId) ?? { productId: item.productId, name: item.productName, quantity: 0, revenue: 0 };
      entry.quantity += item.quantity;
      entry.revenue += item.price * item.quantity;
      products.set(item.productId, entry);
    }
  }

  const fix = (point: SeriesPoint) => ({ ...point, revenue: round(point.revenue) });
  return {
    daily: daily.map(fix),
    monthly: monthly.map(fix),
    period: {
      revenue: round(period.revenue),
      orders: period.orders,
      previousRevenue: round(period.previousRevenue),
      previousOrders: period.previousOrders,
    },
    topProducts: [...products.values()]
      .sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue)
      .slice(0, 5)
      .map((entry) => ({ ...entry, revenue: round(entry.revenue) })),
  };
}
