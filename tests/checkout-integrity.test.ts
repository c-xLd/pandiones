import assert from 'node:assert/strict';
import test from 'node:test';
import { POST as checkoutHandler } from '../src/app/api/checkout/route';
import { prisma } from '../src/lib/prisma';

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

test('checkout rejects unlisted or non-existent products', async () => {
  const req = createPostRequest({
    ...validCustomer,
    cart: [{ id: 'non-existent-product-id', size: 'S', quantity: 1 }],
  });
  const res = await checkoutHandler(req);
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.match(data.error, /veritabanında bulunamadı veya satışta değil/i);
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

  const req = createPostRequest({
    ...validCustomer,
    cart: [{ id: product.id, size: variant.size, quantity: variant.stock + 999 }],
  });
  const res = await checkoutHandler(req);
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.match(data.error, /yeterli stok bulunmamaktadır/i);
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

  // Cleanup created test order
  await prisma.order.delete({ where: { id: savedOrder.id } });
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
  assert.match(data.error, /geçersiz veya süresi dolmuş/i);
});

test('checkout rejects coupon if order total is below minSpend', async () => {
  const product = await prisma.product.findFirst({
    where: { status: 'PUBLISHED' },
    include: { variants: true },
  });
  assert.ok(product);
  const variant = product.variants[0];

  // ZARAFET500 has minSpend: 3000
  const req = createPostRequest({
    ...validCustomer,
    couponCode: 'ZARAFET500',
    cart: [{ id: product.id, size: variant.size, quantity: 1 }], // Price is ~1890, below 3000
  });
  const res = await checkoutHandler(req);
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.match(data.error, /ve üzeri siparişlerde geçerlidir/i);
});

test('checkout correctly applies valid coupon discount on server side', async () => {
  const product = await prisma.product.findFirst({
    where: { status: 'PUBLISHED' },
    include: { variants: true },
  });
  assert.ok(product);
  const variant = product.variants[0];

  // PANDIONES10 gives 10% discount
  const req = createPostRequest({
    ...validCustomer,
    couponCode: 'PANDIONES10',
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
  assert.equal(savedOrder.couponCode, 'PANDIONES10');

  // Cleanup created test order
  await prisma.order.delete({ where: { id: savedOrder.id } });
});
