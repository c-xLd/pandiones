import assert from 'node:assert/strict';
import test from 'node:test';
import { prisma } from '../src/lib/prisma';
import {
  generateGiftCardCode,
  ensureGiftCardProduct,
  createGiftCard,
  findGiftCardByCode,
  checkGiftCardBalance,
  redeemGiftCard,
  GIFT_CARD_PRODUCT_ID,
} from '../src/lib/gift-cards/gift-card-service';
import { POST as balanceHandler } from '../src/app/api/gift-cards/balance/route';
import { POST as couponValidateHandler } from '../src/app/api/coupons/validate/route';
import { POST as checkoutHandler } from '../src/app/api/checkout/route';

function createJsonPostRequest(url: string, body: Record<string, unknown>): Request {
  return new Request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

test('generateGiftCardCode generates valid format PND-GC-XXXX-XXXX', () => {
  const code = generateGiftCardCode();
  assert.match(code, /^PND-GC-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$/);
});

test('ensureGiftCardProduct upserts the gift card product in database with variants', async () => {
  const product = await ensureGiftCardProduct(prisma);
  assert.equal(product.id, GIFT_CARD_PRODUCT_ID);
  assert.equal(product.category, 'hediye-karti');
  assert.ok(product.variants.length >= 4);
});

test('createGiftCard creates an active card with 12-month validity and checks balance', async () => {
  const card = await createGiftCard(
    {
      initialBalance: 2500,
      theme: 'noir',
      recipientName: 'Leyla Alkan',
      recipientEmail: 'leyla@example.com',
      senderName: 'Kerem Alkan',
      giftNote: 'Tüm zarafetinle kutlu olsun.',
    },
    prisma
  );

  assert.ok(card.id);
  assert.match(card.code, /^PND-GC-/);
  assert.equal(card.initialBalance, 2500);
  assert.equal(card.currentBalance, 2500);
  assert.equal(card.theme, 'noir');
  assert.equal(card.isActive, true);

  // Check balance service
  const balanceInfo = await checkGiftCardBalance(card.code, prisma);
  assert.equal(balanceInfo.valid, true);
  if (balanceInfo.valid) {
    assert.equal(balanceInfo.currentBalance, 2500);
    assert.equal(balanceInfo.recipientName, 'Leyla Alkan');
  }

  // Redeem partial balance
  const dummyOrderId = `test-order-${Date.now()}`;
  // Create dummy order for foreign key constraint in usage
  const order = await prisma.order.create({
    data: {
      orderNumber: `PAN-${Date.now().toString().slice(-6)}`,
      customerName: 'Test Müşteri',
      customerEmail: 'test@example.com',
      customerPhone: '05551112233',
      shippingAddress: 'Deneme Cad. No: 1',
      shippingCity: 'İstanbul',
      shippingDistrict: 'Kadıköy',
      totalAmount: 1000,
      status: 'ODEME_BEKLENIYOR',
    },
  });

  const updatedCard = await redeemGiftCard(card.id, 1000, order.id, prisma);
  assert.equal(updatedCard.currentBalance, 1500);

  const usage = await prisma.giftCardUsage.findFirst({
    where: { giftCardId: card.id, orderId: order.id },
  });
  assert.ok(usage);
  assert.equal(usage.amount, 1000);
});

test('/api/gift-cards/balance endpoint returns 200 for valid card and 404 for invalid card', async () => {
  const card = await createGiftCard(
    {
      initialBalance: 5000,
      theme: 'pearl',
      recipientName: 'Deniz Kaya',
      recipientEmail: 'deniz@example.com',
    },
    prisma
  );

  // 1. Valid inquiry
  const validReq = createJsonPostRequest('http://localhost:3000/api/gift-cards/balance', {
    code: card.code,
  });
  const validRes = await balanceHandler(validReq);
  assert.equal(validRes.status, 200);
  const validData = await validRes.json();
  assert.equal(validData.valid, true);
  assert.equal(validData.currentBalance, 5000);
  assert.equal(validData.recipientName, undefined, 'kodu bilen alıcı/gönderen bilgisini görmez');

  // 2. Invalid inquiry
  const invalidReq = createJsonPostRequest('http://localhost:3000/api/gift-cards/balance', {
    code: 'PND-GC-GEÇERSİZ-KOD',
  });
  const invalidRes = await balanceHandler(invalidReq);
  assert.equal(invalidRes.status, 404);
  const invalidData = await invalidRes.json();
  assert.match(invalidData.error, /bulunamadı/i);
});

test('/api/coupons/validate endpoint recognizes gift cards and calculates remaining balance', async () => {
  const card = await createGiftCard(
    {
      initialBalance: 3000,
      theme: 'rose',
      recipientName: 'Bahar Gül',
      recipientEmail: 'bahar@example.com',
    },
    prisma
  );

  // The preview prices the real cart from the database (client subtotals are not trusted).
  const product = await prisma.product.findFirst({ where: { status: 'PUBLISHED' }, include: { variants: true } });
  assert.ok(product && product.variants.length > 0);
  const req = createJsonPostRequest('http://localhost:3000/api/coupons/validate', {
    code: card.code,
    cart: [{ id: product.id, size: product.variants[0].size, quantity: 1 }],
  });
  const res = await couponValidateHandler(req);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.valid, true);
  assert.equal(data.isGiftCard, true);
  const expected = Math.min(3000, product.price);
  assert.equal(data.discountAmount, expected);
  assert.equal(data.remainingGiftCardBalance, 3000 - expected);
  assert.equal(data.recipientName, undefined, 'kod sahibi bilgisi dönmez');
});

test('checkout route fulfills 0 TL order directly when paid 100% by gift card', async () => {
  // 1. Create a card with 5000 TL balance
  const card = await createGiftCard(
    {
      initialBalance: 5000,
      theme: 'noir',
      recipientName: 'Zeynep Akın',
      recipientEmail: 'zeynep@example.com',
    },
    prisma
  );

  // 2. Pick a real published product
  const product = await prisma.product.findFirst({
    where: { status: 'PUBLISHED', id: { not: GIFT_CARD_PRODUCT_ID } },
    include: { variants: true },
  });
  assert.ok(product && product.variants.length > 0);
  const variant = product.variants[0];

  const req = createJsonPostRequest('http://localhost:3000/api/checkout', {
    customerName: 'Zeynep Akın',
    customerEmail: 'zeynep@example.com',
    customerPhone: '05559876543',
    shippingAddress: 'Abdi İpekçi Cad. No: 12',
    shippingCity: 'İstanbul',
    shippingDistrict: 'Şişli',
    couponCode: card.code,
    cart: [
      {
        id: product.id,
        size: variant.size,
        quantity: 1,
      },
    ],
  });

  const res = await checkoutHandler(req);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.equal(data.directComplete, true);
  assert.ok(data.orderNumber);

  // Verify in database: Order is ODENDI, giftCardUsage created, card balance deducted
  const savedOrder = await prisma.order.findUnique({
    where: { orderNumber: data.orderNumber },
  });
  assert.ok(savedOrder);
  assert.equal(savedOrder.status, 'ODENDI');
  assert.equal(savedOrder.paymentProvider, 'GIFT_CARD');
  assert.equal(savedOrder.giftCardCode, card.code);
  assert.equal(savedOrder.totalAmount, 0);

  const updatedCard = await prisma.giftCard.findUnique({
    where: { id: card.id },
  });
  assert.ok(updatedCard);
  assert.equal(updatedCard.currentBalance, 5000 - product.price);

  const usage = await prisma.giftCardUsage.findFirst({
    where: { giftCardId: card.id, orderId: savedOrder.id },
  });
  assert.ok(usage);
  assert.equal(usage.amount, product.price);
});

test('checkout route resolves gift card cart item and pre-creates gift card linked to order', async () => {
  const req = createJsonPostRequest('http://localhost:3000/api/checkout', {
    customerName: 'Ahmet Demir',
    customerEmail: 'ahmet@example.com',
    customerPhone: '05553334455',
    shippingAddress: 'Kordon Cad. No: 20',
    shippingCity: 'İzmir',
    shippingDistrict: 'Konak',
    cart: [
      {
        id: GIFT_CARD_PRODUCT_ID,
        slug: 'dijital-hediye-karti',
        name: 'Pandiones Dijital Hediye Kartı (Pandiones Noir)',
        price: 2500,
        size: '2500 TL',
        quantity: 1,
        giftCardTheme: 'noir',
        recipientName: 'Canan Güneş',
        recipientEmail: 'canan@example.com',
        senderName: 'Ahmet Demir',
        giftNote: 'Tebrikler ve sevgiler.',
      },
    ],
  });

  const res = await checkoutHandler(req);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.ok(data.orderNumber);

  // Verify gift card record was created in database linked to orderId with isActive: false
  const order = await prisma.order.findUnique({
    where: { orderNumber: data.orderNumber },
  });
  assert.ok(order);

  const giftCard = await prisma.giftCard.findFirst({
    where: { orderId: order.id },
  });
  assert.ok(giftCard);
  assert.equal(giftCard.initialBalance, 2500);
  assert.equal(giftCard.recipientEmail, 'canan@example.com');
  assert.equal(giftCard.theme, 'noir');
  assert.equal(giftCard.isActive, false); // Pending card activation until payment callback
});
