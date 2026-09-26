import assert from 'node:assert/strict';
import test from 'node:test';
import { POST as callbackHandler } from '../src/app/api/payment/callback/route';
import { initializeIyzicoCheckout, retrieveIyzicoPayment } from '../src/lib/payment/iyzico';
import { prisma } from '../src/lib/prisma';

test('payment callback processes order, decrements stock and increments coupon', async () => {
  const product = await prisma.product.findFirst({
    where: { status: 'PUBLISHED' },
    include: { variants: true },
  });
  assert.ok(product && product.variants.length > 0);
  const variant = product.variants[0];
  const initialStock = variant.stock;

  // Create a coupon for test
  const testCouponCode = `TEST_CB_${Date.now()}`;
  const coupon = await prisma.coupon.create({
    data: {
      code: testCouponCode,
      discountType: 'FIXED',
      discountValue: 100,
      usedCount: 0,
    },
  });

  const orderNumber = `PAN-TEST-${Date.now()}`;
  const token = `MOCK_IYZICO_TEST_${Date.now()}`;

  const order = await prisma.order.create({
    data: {
      orderNumber,
      customerName: 'Test Müşteri',
      customerEmail: 'test@example.com',
      customerPhone: '05550000000',
      shippingAddress: 'Test Adres',
      shippingCity: 'İstanbul',
      shippingDistrict: 'Kadıköy',
      totalAmount: 1000,
      couponCode: coupon.code,
      status: 'ODEME_BEKLENIYOR',
      items: {
        create: [
          {
            productId: product.id,
            productName: product.name,
            size: variant.size,
            quantity: 2,
            price: 500,
          },
        ],
      },
    },
  });

  await prisma.paymentTransaction.create({
    data: {
      orderId: order.id,
      conversationId: `conv_${orderNumber}`,
      token,
      status: 'PENDING',
      amount: 1000,
    },
  });

  // 1. First callback invocation
  const formData = new FormData();
  formData.append('token', token);
  formData.append('conversationId', `conv_${orderNumber}`);

  const req1 = new Request('http://localhost:3000/api/payment/callback', {
    method: 'POST',
    body: formData,
  });

  const res1 = await callbackHandler(req1);
  assert.equal(res1.status, 303);
  assert.ok(res1.headers.get('location')?.includes(`/siparis-onay/${orderNumber}`));

  // Verify DB state after 1st callback
  const updatedOrder = await prisma.order.findUnique({ where: { id: order.id } });
  assert.equal(updatedOrder?.status, 'ODENDI');

  const updatedVariant = await prisma.variant.findUnique({ where: { id: variant.id } });
  assert.equal(updatedVariant?.stock, initialStock - 2);

  const updatedCoupon = await prisma.coupon.findUnique({ where: { id: coupon.id } });
  assert.equal(updatedCoupon?.usedCount, 1);

  // 2. Second callback invocation (Duplicate / Webhook retry)
  const req2 = new Request('http://localhost:3000/api/payment/callback', {
    method: 'POST',
    body: formData,
  });

  const res2 = await callbackHandler(req2);
  assert.equal(res2.status, 303);
  assert.ok(res2.headers.get('location')?.includes(`/siparis-onay/${orderNumber}`));

  // Verify DB state did NOT change second time (Idempotency guarantee)
  const variantAfter2nd = await prisma.variant.findUnique({ where: { id: variant.id } });
  assert.equal(variantAfter2nd?.stock, initialStock - 2, 'Stock must not decrement twice');

  const couponAfter2nd = await prisma.coupon.findUnique({ where: { id: coupon.id } });
  assert.equal(couponAfter2nd?.usedCount, 1, 'Coupon usedCount must not increment twice');

  // Cleanup
  await prisma.variant.update({ where: { id: variant.id }, data: { stock: initialStock } });
  await prisma.coupon.delete({ where: { id: coupon.id } });
  await prisma.order.delete({ where: { id: order.id } });
});

test('variant stock decrement is lower-bounded at 0 and never goes negative', async () => {
  const product = await prisma.product.findFirst({
    where: { status: 'PUBLISHED' },
    include: { variants: true },
  });
  assert.ok(product && product.variants.length > 0);
  const variant = product.variants[0];
  const originalStock = variant.stock;

  // Set stock to 1
  await prisma.variant.update({ where: { id: variant.id }, data: { stock: 1 } });

  const orderNumber = `PAN-BOUND-${Date.now()}`;
  const token = `MOCK_IYZICO_BOUND_${Date.now()}`;

  const order = await prisma.order.create({
    data: {
      orderNumber,
      customerName: 'Test Müşteri',
      customerEmail: 'test@example.com',
      customerPhone: '05550000000',
      shippingAddress: 'Test Adres',
      shippingCity: 'İstanbul',
      shippingDistrict: 'Kadıköy',
      totalAmount: 1000,
      status: 'ODEME_BEKLENIYOR',
      items: {
        create: [
          {
            productId: product.id,
            productName: product.name,
            size: variant.size,
            quantity: 5, // 5 requested, but only 1 in stock
            price: 200,
          },
        ],
      },
    },
  });

  await prisma.paymentTransaction.create({
    data: {
      orderId: order.id,
      conversationId: `conv_${orderNumber}`,
      token,
      status: 'PENDING',
      amount: 1000,
    },
  });

  const formData = new FormData();
  formData.append('token', token);
  formData.append('conversationId', `conv_${orderNumber}`);

  const req = new Request('http://localhost:3000/api/payment/callback', {
    method: 'POST',
    body: formData,
  });

  await callbackHandler(req);

  const finalVariant = await prisma.variant.findUnique({ where: { id: variant.id } });
  assert.equal(finalVariant?.stock, 0, 'Stock must floor at 0 and not become negative (-4)');

  // Cleanup
  await prisma.variant.update({ where: { id: variant.id }, data: { stock: originalStock } });
  await prisma.order.delete({ where: { id: order.id } });
});

test('production environment strictly blocks mock checkout initialization and mock payment tokens', async () => {
  const originalEnv = process.env.NODE_ENV;
  try {
    (process.env as any).NODE_ENV = 'production';

    const checkoutRes = await initializeIyzicoCheckout({
      conversationId: 'test_conv',
      basketId: 'b_123',
      price: 100,
      paidPrice: 100,
      callbackUrl: 'http://localhost/callback',
      buyer: {
        id: 'user_1',
        name: 'Test',
        surname: 'User',
        email: 'test@example.com',
        phone: '5551234567',
        address: 'Adres',
        city: 'İstanbul',
        district: 'Kadıköy',
      },
      shippingAddress: { contactName: 'Test', city: 'İstanbul', country: 'Turkey', address: 'Adres' },
      billingAddress: { contactName: 'Test', city: 'İstanbul', country: 'Turkey', address: 'Adres' },
      basketItems: [{ id: 'item_1', name: 'Ürün', category1: 'Giyim', price: 100 }],
    });

    assert.equal(checkoutRes.status, 'failure');
    assert.equal(checkoutRes.isMock, false);
    assert.match(checkoutRes.errorMessage || '', /Canlı ortamda işlem yapılamaz/i);

    const retrieveRes = await retrieveIyzicoPayment('MOCK_IYZICO_9999');
    assert.equal(retrieveRes.status, 'failure');
    assert.equal(retrieveRes.paymentStatus, 'FAILURE');
    assert.match(retrieveRes.errorMessage || '', /simülatör ödemeleri kabul edilmez/i);
  } finally {
    (process.env as any).NODE_ENV = originalEnv;
  }
});
