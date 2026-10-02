import assert from 'node:assert/strict';
import test from 'node:test';
import { POST as checkoutHandler } from '../src/app/api/checkout/route';
import { prisma } from '../src/lib/prisma';
import { releaseOrder } from '../src/lib/orders/checkout-service';

/** Gives back what a test order reserved (stock, coupon use, gift-card balance), then removes it. */
async function discardOrder(id: string) {
  await releaseOrder(prisma, id, 'FAILURE');
  await prisma.order.delete({ where: { id } });
}

/** A coupon owned by one test; removed afterwards. */
async function testCoupon(t: { after(fn: () => unknown): void }, data: { discountType: 'PERCENTAGE' | 'FIXED'; discountValue: number; minSpend: number }) {
  const coupon = await prisma.coupon.create({ data: { code: `TEST-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`.toUpperCase(), maxUses: 10, ...data } });
  t.after(() => prisma.coupon.delete({ where: { id: coupon.id } }).catch(() => {}));
  return coupon.code;
}

const validCustomer = {
  customerName: 'Selin Yılmaz',
  customerEmail: 'selin@example.com',
  customerPhone: '05551234567',
  shippingAddress: 'Bağdat Caddesi No: 42 D: 5',
  shippingCity: 'İstanbul',
  shippingDistrict: 'Kadıköy',
};

function createPostRequest(body: Record<string, unknown>): Request {
  return new Request('http://localhost:3000/api/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

test('checkout rejects missing required customer fields or empty cart', async () => {
  const res1 = await checkoutHandler(createPostRequest({ ...validCustomer, cart: [] }));
  assert.equal(res1.status, 400);

  const res2 = await checkoutHandler(createPostRequest({ ...validCustomer, customerEmail: '', cart: [{ id: 'xyz', size: 'S', quantity: 1 }] }));
  assert.equal(res2.status, 400);
});

test('checkout validates email and phone format on the server', async () => {
  const cart = [{ id: 'xyz', size: 'S', quantity: 1 }];
  const badPhone = await checkoutHandler(createPostRequest({ ...validCustomer, customerPhone: '12345', cart }));
  assert.equal(badPhone.status, 400);
  assert.equal((await badPhone.json()).field, 'customerPhone');

  const badEmail = await checkoutHandler(createPostRequest({ ...validCustomer, customerEmail: 'selin@', cart }));
  assert.equal(badEmail.status, 400);
  assert.equal((await badEmail.json()).field, 'customerEmail');
});

test('checkout rejects unlisted or non-existent products', async () => {
  const req = createPostRequest({
    ...validCustomer,
    cart: [{ id: 'non-existent-product-id', size: 'S', quantity: 1 }],
  });
  const res = await checkoutHandler(req);
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.match(data.error, /artık satışta değil|tanınmadı/i);
});

test('checkout rejects cart item with missing or invalid size', async () => {
  const product = await prisma.product.findFirst({ where: { status: 'PUBLISHED' } });
  assert.ok(product, 'A published product must exist in database');

  const req = createPostRequest({
    ...validCustomer,
    cart: [{ id: product.id, size: '', quantity: 1 }],
  });
  const res = await checkoutHandler(req);
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.match(data.error, /geçerli bir beden/i);
});

test('checkout rejects order when variant stock is insufficient', async () => {
  const product = await prisma.product.findFirst({
    where: { status: 'PUBLISHED' },
    include: { variants: true },
  });
  assert.ok(product && product.variants.length > 0, 'Product with variants must exist');
  const variant = product.variants[0];

  const original = variant.stock;
  await prisma.variant.update({ where: { id: variant.id }, data: { stock: 1 } });
  try {
    const res = await checkoutHandler(createPostRequest({ ...validCustomer, cart: [{ id: product.id, size: variant.size, quantity: 2 }] }));
    assert.equal(res.status, 409);
    assert.match((await res.json()).error, /yeterli stok yok/i);

    // The same size split over two lines is counted together.
    const split = await checkoutHandler(createPostRequest({
      ...validCustomer,
      cart: [{ id: product.id, size: variant.size, quantity: 1 }, { id: product.id, size: variant.size, quantity: 1 }],
    }));
    assert.equal(split.status, 409);
  } finally {
    await prisma.variant.update({ where: { id: variant.id }, data: { stock: original } });
  }
});

test('checkout caps quantities, cart lines and body size', async () => {
  const product = await prisma.product.findFirst({ where: { status: 'PUBLISHED' }, include: { variants: true } });
  assert.ok(product && product.variants.length > 0);
  const size = product.variants[0].size;

  const tooMany = await checkoutHandler(createPostRequest({ ...validCustomer, cart: [{ id: product.id, size, quantity: 11 }] }));
  assert.equal(tooMany.status, 400);
  assert.match((await tooMany.json()).error, /en fazla 10 adet/i);

  const fractional = await checkoutHandler(createPostRequest({ ...validCustomer, cart: [{ id: product.id, size, quantity: 1.5 }] }));
  assert.equal(fractional.status, 400);

  const lines = Array.from({ length: 31 }, () => ({ id: product.id, size, quantity: 1 }));
  assert.equal((await checkoutHandler(createPostRequest({ ...validCustomer, cart: lines }))).status, 400);

  const huge = await checkoutHandler(createPostRequest({ ...validCustomer, cart: [{ id: product.id, size, quantity: 1, pad: 'x'.repeat(40_000) }] }));
  assert.equal(huge.status, 413);

  const giftCards = await checkoutHandler(createPostRequest({
    ...validCustomer,
    cart: [{ id: 'gift-card', category: 'hediye-karti', price: 500, quantity: 6, giftCardTheme: 'noir', recipientName: 'Ada', recipientEmail: 'ada@example.com' }],
  }));
  assert.equal(giftCards.status, 400);
  assert.match((await giftCards.json()).error, /hediye kartı|10 adet/i);
});

test('checkout ignores client-injected discountAmount and calculates raw total', async () => {
  const product = await prisma.product.findFirst({
    where: { status: 'PUBLISHED' },
    include: { variants: true },
  });
  assert.ok(product && product.variants.length > 0);
  const variant = product.variants[0];

  // Malicious request injecting discountAmount: 999999
  const req = createPostRequest({
    ...validCustomer,
    discountAmount: 999999,
    cart: [{ id: product.id, size: variant.size, quantity: 1 }],
  });
  const res = await checkoutHandler(req);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(data.orderId);

  // Check saved order in database
  const savedOrder = await prisma.order.findUnique({
    where: { id: data.orderId },
  });
  assert.ok(savedOrder);
  assert.equal(savedOrder.discountAmount, 0, 'Discount amount must be 0 when no coupon is validated');
  assert.equal(savedOrder.totalAmount, product.price, 'Total amount must equal database product price');

  await discardOrder(savedOrder.id);
});

test('checkout rejects invalid or expired coupon', async () => {
  const product = await prisma.product.findFirst({
    where: { status: 'PUBLISHED' },
    include: { variants: true },
  });
  assert.ok(product);
  const variant = product.variants[0];

  const req = createPostRequest({
    ...validCustomer,
    couponCode: 'FAKE_COUPON_99',
    cart: [{ id: product.id, size: variant.size, quantity: 1 }],
  });
  const res = await checkoutHandler(req);
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.match(data.error, /geçersiz/i);
});

test('checkout rejects coupon if order total is below minSpend', async (t) => {
  const product = await prisma.product.findFirst({
    where: { status: 'PUBLISHED' },
    include: { variants: true },
  });
  assert.ok(product);
  const variant = product.variants[0];

  const code = await testCoupon(t, { discountType: 'FIXED', discountValue: 500, minSpend: product.price + 1000 });
  const req = createPostRequest({
    ...validCustomer,
    couponCode: code,
    cart: [{ id: product.id, size: variant.size, quantity: 1 }],
  });
  const res = await checkoutHandler(req);
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.match(data.error, /ve üzeri ürün tutarında geçerlidir/i);
});

test('checkout correctly applies valid coupon discount on server side', async (t) => {
  const product = await prisma.product.findFirst({
    where: { status: 'PUBLISHED' },
    include: { variants: true },
  });
  assert.ok(product);
  const variant = product.variants[0];

  const code = await testCoupon(t, { discountType: 'PERCENTAGE', discountValue: 10, minSpend: 0 });
  const req = createPostRequest({
    ...validCustomer,
    couponCode: code,
    cart: [{ id: product.id, size: variant.size, quantity: 1 }],
  });
  const res = await checkoutHandler(req);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(data.orderId);

  const savedOrder = await prisma.order.findUnique({
    where: { id: data.orderId },
  });
  assert.ok(savedOrder);
  const expectedDiscount = Math.round((product.price * 10) / 100);
  const expectedTotal = product.price - expectedDiscount;

  assert.equal(savedOrder.discountAmount, expectedDiscount);
  assert.equal(savedOrder.totalAmount, expectedTotal);
  assert.equal(savedOrder.couponCode, code);

  await discardOrder(savedOrder.id);
});
