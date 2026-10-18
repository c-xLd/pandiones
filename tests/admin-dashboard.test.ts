import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDashboard, type DashboardOrder } from '../src/lib/admin/dashboard';

const now = new Date(2026, 9, 2, 15, 0); // 2 Ekim 2026
const daysAgo = (n: number) => new Date(2026, 9, 2 - n, 12, 0);
type TlItem = Omit<DashboardOrder['items'][number], 'priceKurus'> & { price: number };
const order = (status: string, total: number, paidAt: Date | null, items: TlItem[] = []): DashboardOrder => ({
  status,
  totalKurus: Math.round(total * 100),
  createdAt: paidAt ?? daysAgo(1),
  paidAt,
  items: items.map(({ price, ...item }) => ({ ...item, priceKurus: Math.round(price * 100) })),
});

test('dashboard counts only paid orders, by the day they were paid', () => {
  const dashboard = buildDashboard(
    [
      order('ODENDI', 1000, daysAgo(0)),
      order('KARGODA', 500, daysAgo(2)),
      order('ODEME_BEKLENIYOR', 99999, null),
      order('ODEME_BASARISIZ', 77777, null),
      order('TESLIM_EDILDI', 300, daysAgo(40)), // previous 30-day window
    ],
    now,
  );
  assert.equal(dashboard.daily.length, 30);
  assert.equal(dashboard.daily.at(-1)?.revenue, 1000);
  assert.equal(dashboard.daily.at(-3)?.revenue, 500);
  assert.deepEqual(dashboard.period, { revenue: 1500, orders: 2, previousRevenue: 300, previousOrders: 1 });
  assert.equal(dashboard.monthly.length, 12);
  assert.equal(dashboard.monthly.at(-1)?.revenue, 1000); // 30 Eylül, önceki aya düşer
  assert.equal(dashboard.monthly.at(-2)?.revenue, 500);
  assert.equal(dashboard.monthly.reduce((sum, m) => sum + m.revenue, 0), 1800);
});

test('top products rank by paid quantity', () => {
  const dashboard = buildDashboard(
    [
      order('ODENDI', 0, daysAgo(1), [{ productId: 'a', productName: 'A', quantity: 1, price: 100 }]),
      order('ODENDI', 0, daysAgo(1), [{ productId: 'b', productName: 'B', quantity: 3, price: 50 }]),
      order('ODEME_BEKLENIYOR', 0, null, [{ productId: 'c', productName: 'C', quantity: 9, price: 10 }]),
    ],
    now,
  );
  assert.deepEqual(dashboard.topProducts.map((p) => [p.productId, p.quantity, p.revenue]), [['b', 3, 150], ['a', 1, 100]]);
});
