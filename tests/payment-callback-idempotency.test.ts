import assert from 'node:assert/strict';
import test from 'node:test';
import { POST as checkoutHandler } from '../src/app/api/checkout/route';
import { POST as callbackHandler } from '../src/app/api/payment/callback/route';
import { initializeIyzicoCheckout, retrieveIyzicoPayment } from '../src/lib/payment/iyzico';
import { expirePendingOrders, releaseOrder } from '../src/lib/orders/checkout-service';
import { prisma } from '../src/lib/prisma';

const customer = {
  customerName: 'Test Müşteri',
  customerEmail: 'callback-test@example.com',
  customerPhone: '05550000000',
  shippingAddress: 'Test Mahallesi Deneme Sokak No: 1',
  shippingCity: 'Ankara',
  shippingDistrict: 'Çankaya',
};

const post = (body: unknown) =>
  new Request('http://localhost:3000/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

async function callback(token: string) {
  const form = new FormData();
  form.append('token', token);
  return callbackHandler(new Request('http://localhost:3000/api/payment/callback', { method: 'POST', body: form }));
}

async function fixture() {
  const product = await prisma.product.findFirst({ where: { status: 'PUBLISHED', category: { not: 'hediye-karti' }, priceKurus: { gt: 20000 } }, include: { variants: true } });
  assert.ok(product && product.variants.length > 0);
  const variant = product.variants[0];
  const originalStock = variant.stock;
  await prisma.variant.update({ where: { id: variant.id }, data: { stock: 20 } });
  const coupon = await prisma.coupon.create({ data: { code: `TESTCB${Date.now()}`, discountType: 'FIXED', discountKurus: 10000, usedCount: 0, maxUses: 5 } });
  return {
    product,
    variant,
    coupon,
    async restore() {
      await prisma.variant.update({ where: { id: variant.id }, data: { stock: originalStock } });
      await prisma.coupon.delete({ where: { id: coupon.id } }).catch(() => {});
    },
  };
}

test('checkout reserves stock and coupon; the callback captures once and is idempotent', async () => {
  const f = await fixture();
  try {
    const res = await checkoutHandler(post({ ...customer, couponCode: f.coupon.code, cart: [{ id: f.product.id, size: f.variant.size, quantity: 2 }] }));
    assert.equal(res.status, 200);
    const data = await res.json();

    // Reserved at checkout, before any payment.
    assert.equal((await prisma.variant.findUniqueOrThrow({ where: { id: f.variant.id } })).stock, 18);
    assert.equal((await prisma.coupon.findUniqueOrThrow({ where: { id: f.coupon.id } })).usedCount, 1);

    const tx = await prisma.paymentTransaction.findFirstOrThrow({ where: { orderId: data.orderId } });
    assert.ok(tx.token?.startsWith('MOCK_IYZICO_'));

    for (let i = 0; i < 2; i += 1) {
      const cb = await callback(tx.token as string);
      assert.equal(cb.status, 303);
      assert.match(cb.headers.get('location') ?? '', new RegExp(`/siparis-onay/${data.orderNumber}`));
    }
    const order = await prisma.order.findUniqueOrThrow({ where: { id: data.orderId } });
    assert.equal(order.status, 'ODENDI');
    assert.equal((await prisma.variant.findUniqueOrThrow({ where: { id: f.variant.id } })).stock, 18, 'stok ikinci kez düşmez');
    assert.equal((await prisma.coupon.findUniqueOrThrow({ where: { id: f.coupon.id } })).usedCount, 1, 'kupon ikinci kez sayılmaz');
    await prisma.order.delete({ where: { id: order.id } });
  } finally {
    await f.restore();
  }
});

test('an unpaid order gives back stock and coupon use (failure and expiry)', async () => {
  const f = await fixture();
  try {
    const make = async () => (await (await checkoutHandler(post({ ...customer, couponCode: f.coupon.code, cart: [{ id: f.product.id, size: f.variant.size, quantity: 3 }] }))).json()).orderId as string;

    const failed = await make();
    assert.equal(await releaseOrder(prisma, failed, 'FAILURE'), true);
    assert.equal(await releaseOrder(prisma, failed, 'FAILURE'), false, 'ikinci iade yapılmaz');
    assert.equal((await prisma.variant.findUniqueOrThrow({ where: { id: f.variant.id } })).stock, 20);
    assert.equal((await prisma.coupon.findUniqueOrThrow({ where: { id: f.coupon.id } })).usedCount, 0);

    const stale = await make();
    assert.equal((await prisma.variant.findUniqueOrThrow({ where: { id: f.variant.id } })).stock, 17);
    const released = await expirePendingOrders(prisma, new Date(Date.now() + 2 * 60 * 60 * 1000));
    assert.ok(released >= 1);
    const expired = await prisma.order.findUniqueOrThrow({ where: { id: stale } });
    assert.equal(expired.status, 'ODEME_BASARISIZ');
    assert.equal(expired.paymentStatus, 'EXPIRED');
    assert.equal((await prisma.variant.findUniqueOrThrow({ where: { id: f.variant.id } })).stock, 20);

    // A payment arriving after expiry does not silently revive the order.
    const tx = await prisma.paymentTransaction.findFirstOrThrow({ where: { orderId: stale } });
    await prisma.paymentTransaction.update({ where: { id: tx.id }, data: { status: 'PENDING' } });
    const late = await callback(tx.token as string);
    assert.match(late.headers.get('location') ?? '', /odeme\?error=/);
    assert.equal((await prisma.order.findUniqueOrThrow({ where: { id: stale } })).status, 'ODEME_BASARISIZ');
    assert.equal((await prisma.paymentTransaction.findUniqueOrThrow({ where: { id: tx.id } })).status, 'REVIEW');

    await prisma.order.deleteMany({ where: { id: { in: [failed, stale] } } });
  } finally {
    await f.restore();
  }
});

test('the payment simulator is off in production and without PAYMENT_MODE=simulator', async () => {
  const params = {
    conversationId: 'test_conv',
    basketId: 'b_123',
    price: 100,
    paidPrice: 100,
    callbackUrl: 'http://localhost/callback',
    buyer: { id: 'user_1', name: 'Test', surname: 'User', email: 'test@example.com', phone: '5551234567', address: 'Adres', city: 'Ankara', district: 'Çankaya' },
    shippingAddress: { contactName: 'Test', city: 'Ankara', country: 'Turkey', address: 'Adres' },
    billingAddress: { contactName: 'Test', city: 'Ankara', country: 'Turkey', address: 'Adres' },
    basketItems: [{ id: 'item_1', name: 'Ürün', category1: 'Giyim', price: 100 }],
  };
  const env = process.env as Record<string, string | undefined>;
  const original = { NODE_ENV: env.NODE_ENV, PAYMENT_MODE: env.PAYMENT_MODE };
  try {
    env.NODE_ENV = 'production';
    const checkoutRes = await initializeIyzicoCheckout(params);
    assert.equal(checkoutRes.status, 'failure');
    assert.equal(checkoutRes.isMock, false);
    const retrieveRes = await retrieveIyzicoPayment('MOCK_IYZICO_9999');
    assert.equal(retrieveRes.paymentStatus, 'FAILURE');

    env.NODE_ENV = 'development';
    delete env.PAYMENT_MODE;
    assert.equal((await initializeIyzicoCheckout(params)).status, 'failure', 'açıkça açılmadan simülatör çalışmaz');
    assert.equal((await retrieveIyzicoPayment('MOCK_IYZICO_9999')).paymentStatus, 'FAILURE');
  } finally {
    env.NODE_ENV = original.NODE_ENV;
    env.PAYMENT_MODE = original.PAYMENT_MODE;
  }
});
