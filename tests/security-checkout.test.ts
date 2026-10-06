import assert from 'node:assert/strict';
import test from 'node:test';
import { POST as checkoutHandler } from '../src/app/api/checkout/route';
import { releaseOrder } from '../src/lib/orders/checkout-service';
import { createGiftCard } from '../src/lib/gift-cards/gift-card-service';
import { prisma } from '../src/lib/prisma';

/** Attack scenarios from the 2026-10-02 review (docs/SECURITY.md, Faz 0). */

const customer = {
  customerName: 'Saldırı Testi',
  customerEmail: 'attack-test@example.com',
  customerPhone: '05550000001',
  shippingAddress: 'Deneme Mahallesi Test Sokak No: 2',
  shippingCity: 'İzmir',
  shippingDistrict: 'Konak',
};
const post = (body: unknown, key?: string) =>
  new Request('http://localhost:3000/api/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(key ? { 'Idempotency-Key': key } : {}) },
    body: JSON.stringify(body),
  });

async function product() {
  const p = await prisma.product.findFirst({ where: { status: 'PUBLISHED', category: { not: 'hediye-karti' }, price: { gt: 500 } }, include: { variants: true } });
  assert.ok(p && p.variants.length > 0);
  const v = p.variants[0];
  const original = v.stock;
  await prisma.variant.update({ where: { id: v.id }, data: { stock: 100 } });
  return { p, v, restore: () => prisma.variant.update({ where: { id: v.id }, data: { stock: original } }) };
}

async function cleanup(orderIds: string[]) {
  for (const id of orderIds) {
    await releaseOrder(prisma, id, 'FAILURE');
    await prisma.order.delete({ where: { id } }).catch(() => {});
  }
}

test('C1: one gift card cannot discount many card-paid orders', async () => {
  const { p, v, restore } = await product();
  const card = await createGiftCard({ initialBalance: 500, theme: 'noir', recipientName: 'Ada', recipientEmail: 'ada@example.com' }, prisma);
  const orders: string[] = [];
  try {
    // Cart larger than the card, so each order would still need a card payment.
    const cart = [{ id: p.id, size: v.size, quantity: 1 }];
    const first = await checkoutHandler(post({ ...customer, couponCode: card.code, cart }));
    assert.equal(first.status, 200);
    orders.push((await first.json()).orderId);
    assert.equal((await prisma.giftCard.findUniqueOrThrow({ where: { id: card.id } })).currentBalance, 0, 'bakiye siparişle birlikte rezerve edilir');

    for (let i = 0; i < 3; i += 1) {
      const again = await checkoutHandler(post({ ...customer, couponCode: card.code, cart }));
      assert.equal(again.status, 400, 'boşalan kart ikinci siparişte indirim vermez');
    }

    // Unpaid order released → balance comes back.
    await releaseOrder(prisma, orders[0], 'FAILURE');
    assert.equal((await prisma.giftCard.findUniqueOrThrow({ where: { id: card.id } })).currentBalance, 500);
  } finally {
    await cleanup(orders);
    await prisma.giftCard.delete({ where: { id: card.id } }).catch(() => {});
    await restore();
  }
});

test('C2: parallel fully-covered orders cannot overdraw a gift card', async () => {
  const { p, v, restore } = await product();
  const card = await createGiftCard({ initialBalance: p.price, theme: 'noir', recipientName: 'Ada', recipientEmail: 'ada@example.com' }, prisma);
  const orders: string[] = [];
  try {
    const cart = [{ id: p.id, size: v.size, quantity: 1 }];
    const results = await Promise.all(Array.from({ length: 6 }, () => checkoutHandler(post({ ...customer, couponCode: card.code, cart }))));
    const ok = results.filter((r) => r.status === 200);
    assert.equal(ok.length, 1, 'yalnız bir bedava sipariş');
    for (const r of ok) orders.push((await r.json()).orderId);
    const after = await prisma.giftCard.findUniqueOrThrow({ where: { id: card.id } });
    assert.ok(after.currentBalance >= 0, 'bakiye eksiye düşmez');
    assert.equal(after.currentBalance, 0);
  } finally {
    // The paid 0 TL order is not pending; delete it and its usage directly.
    for (const id of orders) {
      await prisma.giftCardUsage.deleteMany({ where: { orderId: id } });
      await prisma.order.delete({ where: { id } }).catch(() => {});
    }
    await prisma.giftCard.delete({ where: { id: card.id } }).catch(() => {});
    await restore();
  }
});

test('H1: a single-use coupon is used once even with parallel checkouts', async () => {
  const { p, v, restore } = await product();
  const coupon = await prisma.coupon.create({ data: { code: `ONCE${Date.now()}`, discountType: 'FIXED', discountValue: 50, maxUses: 1 } });
  const orders: string[] = [];
  try {
    const cart = [{ id: p.id, size: v.size, quantity: 1 }];
    const results = await Promise.all(Array.from({ length: 5 }, () => checkoutHandler(post({ ...customer, couponCode: coupon.code, cart }))));
    const ok = results.filter((r) => r.status === 200);
    assert.equal(ok.length, 1);
    for (const r of ok) orders.push((await r.json()).orderId);
    assert.equal((await prisma.coupon.findUniqueOrThrow({ where: { id: coupon.id } })).usedCount, 1);
  } finally {
    await cleanup(orders);
    await prisma.coupon.delete({ where: { id: coupon.id } }).catch(() => {});
    await restore();
  }
});

test('H1: expired, not-yet-valid and per-customer-limited coupons are refused', async () => {
  const { p, v, restore } = await product();
  const now = Date.now();
  const expired = await prisma.coupon.create({ data: { code: `OLD${now}`, discountType: 'FIXED', discountValue: 50, expiresAt: new Date(now - 1000) } });
  const future = await prisma.coupon.create({ data: { code: `NEW${now}`, discountType: 'FIXED', discountValue: 50, startsAt: new Date(now + 86_400_000) } });
  const perEmail = await prisma.coupon.create({ data: { code: `ONEPP${now}`, discountType: 'FIXED', discountValue: 50, perEmailLimit: 1, maxUses: null } });
  const orders: string[] = [];
  try {
    const cart = [{ id: p.id, size: v.size, quantity: 1 }];
    assert.match((await (await checkoutHandler(post({ ...customer, couponCode: expired.code, cart }))).json()).error, /süresi dolmuş/);
    assert.match((await (await checkoutHandler(post({ ...customer, couponCode: future.code, cart }))).json()).error, /henüz geçerli değil/);
    const first = await checkoutHandler(post({ ...customer, couponCode: perEmail.code, cart }));
    assert.equal(first.status, 200);
    orders.push((await first.json()).orderId);
    const second = await checkoutHandler(post({ ...customer, couponCode: perEmail.code, cart }));
    assert.equal(second.status, 400);
    assert.match((await second.json()).error, /kullanım hakkınız/);
  } finally {
    await cleanup(orders);
    await prisma.coupon.deleteMany({ where: { id: { in: [expired.id, future.id, perEmail.id] } } });
    await restore();
  }
});

test('H2: coupons and gift-card balance do not apply to gift-card purchases', async () => {
  const coupon = await prisma.coupon.create({ data: { code: `GCX${Date.now()}`, discountType: 'PERCENTAGE', discountValue: 20 } });
  const card = await createGiftCard({ initialBalance: 1000, theme: 'noir', recipientName: 'Ada', recipientEmail: 'ada@example.com' }, prisma);
  try {
    const cart = [{ id: 'gift-card', category: 'hediye-karti', price: 1000, quantity: 1, giftCardTheme: 'noir', recipientName: 'Deniz', recipientEmail: 'deniz@example.com' }];
    for (const code of [coupon.code, card.code]) {
      const res = await checkoutHandler(post({ ...customer, couponCode: code, cart }));
      assert.equal(res.status, 400, code);
      assert.match((await res.json()).error, /hediye kartı alımında kullanılamaz/);
    }
  } finally {
    await prisma.coupon.delete({ where: { id: coupon.id } });
    await prisma.giftCard.delete({ where: { id: card.id } });
  }
});

test('L1: a repeated submit with the same Idempotency-Key does not create a second order', async () => {
  const { p, v, restore } = await product();
  const orders: string[] = [];
  try {
    const key = `test-${crypto.randomUUID()}`;
    const cart = [{ id: p.id, size: v.size, quantity: 1 }];
    const first = await checkoutHandler(post({ ...customer, cart }, key));
    assert.equal(first.status, 200);
    orders.push((await first.json()).orderId);
    const again = await checkoutHandler(post({ ...customer, cart }, key));
    assert.equal(again.status, 409);
    assert.equal(await prisma.order.count({ where: { idempotencyKey: key } }), 1);
  } finally {
    await cleanup(orders);
    await restore();
  }
});

test('order numbers are long and random', async () => {
  const { p, v, restore } = await product();
  const orders: string[] = [];
  try {
    const res = await checkoutHandler(post({ ...customer, cart: [{ id: p.id, size: v.size, quantity: 1 }] }));
    const data = await res.json();
    orders.push(data.orderId);
    assert.match(data.orderNumber, /^PAN-[0-9A-HJKMNP-TV-Z]{10}$/);
  } finally {
    await cleanup(orders);
    await restore();
  }
});
