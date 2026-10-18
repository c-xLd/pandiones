import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test, { afterEach } from 'node:test';
import { POST as checkoutHandler } from '../src/app/api/checkout/route';
import { POST as callbackHandler } from '../src/app/api/payment/callback/route';
import { POST as webhookHandler } from '../src/app/api/payment/webhook/route';
import {
  __setIyzipayClientForTests,
  initializeSignatureValid,
  refundSignatureValid,
  webhookSignatureValid,
  type IyzipayCallback,
} from '../src/lib/payment/iyzico';
import { refundLinesFrom, refundOrder, REFUNDED_ORDER_STATUS } from '../src/lib/payment/refund-order';
import { prisma } from '../src/lib/prisma';

const SECRET = 'sandbox-webhook-test-secret';
const actor = { userId: 'test-admin', email: 'admin@pandiones.test' };
const ENV_KEYS = ['IYZICO_API_KEY', 'IYZICO_SECRET_KEY', 'IYZICO_BASE_URL'] as const;
const saved = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
  __setIyzipayClientForTests(null);
});

const hmac = (text: string, secret = SECRET) => crypto.createHmac('sha256', secret).update(text).digest('hex');

function webhookRequest(payload: Record<string, unknown>, signature?: string) {
  const sig = signature ?? hmac(`${SECRET}${payload.iyziEventType}${payload.iyziPaymentId}${payload.token}${payload.paymentConversationId}${payload.status}`);
  return new Request('http://localhost:3000/api/payment/webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-IYZ-SIGNATURE-V3': sig },
    body: JSON.stringify(payload),
  });
}

const customer = {
  customerName: 'Webhook Deneme',
  customerEmail: 'webhook-test@example.com',
  customerPhone: '05550000000',
  shippingAddress: 'Test Mahallesi Deneme Sokak No: 1',
  shippingCity: 'Ankara',
  shippingDistrict: 'Çankaya',
};

/** A pending simulator order (no API key → development simulator), with its token. */
async function pendingOrder(quantity = 1) {
  const product = await prisma.product.findFirst({ where: { status: 'PUBLISHED', category: { not: 'hediye-karti' }, priceKurus: { gt: 20000 } }, include: { variants: true } });
  assert.ok(product && product.variants.length > 0);
  const variant = product.variants[0];
  const originalStock = variant.stock;
  await prisma.variant.update({ where: { id: variant.id }, data: { stock: 20 } });
  const res = await checkoutHandler(
    new Request('http://localhost:3000/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...customer, cart: [{ id: product.id, size: variant.size, quantity }] }),
    }),
  );
  assert.equal(res.status, 200);
  const data = await res.json();
  const tx = await prisma.paymentTransaction.findFirstOrThrow({ where: { orderId: data.orderId } });
  return {
    orderId: data.orderId as string,
    token: tx.token as string,
    conversationId: tx.conversationId,
    variantId: variant.id,
    async cleanup() {
      await prisma.order.delete({ where: { id: data.orderId } }).catch(() => {});
      await prisma.variant.update({ where: { id: variant.id }, data: { stock: originalStock } });
    },
  };
}

test('webhook signature: X-IYZ-SIGNATURE-V3 = HMAC-SHA256(secret, secret+eventType+paymentId+token+conversationId+status)', () => {
  const payload = { iyziEventType: 'CHECKOUT_FORM_AUTH', iyziPaymentId: 22416035, token: 'tok_1', paymentConversationId: 'conv_1', status: 'SUCCESS' };
  const good = hmac(`${SECRET}CHECKOUT_FORM_AUTH22416035tok_1conv_1SUCCESS`);
  assert.equal(webhookSignatureValid(payload, good, SECRET), true);
  assert.equal(webhookSignatureValid(payload, good.toUpperCase(), SECRET), true);
  assert.equal(webhookSignatureValid({ ...payload, status: 'FAILURE' }, good, SECRET), false, 'durum değiştirilemez');
  assert.equal(webhookSignatureValid(payload, hmac(`${SECRET}CHECKOUT_FORM_AUTH22416035tok_1conv_1SUCCESS`, 'other'), SECRET), false);
  assert.equal(webhookSignatureValid(payload, null, SECRET), false);
  assert.equal(webhookSignatureValid({ ...payload, token: '' }, good, SECRET), false);
});

test('initialize and refund response signatures', () => {
  const init = { conversationId: 'conv_1', token: 'tok_1' };
  assert.equal(initializeSignatureValid({ ...init, signature: hmac('conv_1:tok_1') }, SECRET), true);
  assert.equal(initializeSignatureValid({ ...init, signature: hmac('conv_1:tok_2') }, SECRET), false);
  // Prices are signed without trailing zeros: 10.50 → "10.5".
  const refund = { paymentId: '1', price: '10.50', currency: 'TRY', conversationId: 'r_1' };
  assert.equal(refundSignatureValid({ ...refund, signature: hmac('1:10.5:TRY:r_1') }, SECRET), true);
  assert.equal(refundSignatureValid({ ...refund, signature: hmac('1:10.50:TRY:r_1') }, SECRET), false);
});

test('a signed SUCCESS webhook settles the order even if the buyer never came back; callback and repeats are no-ops', async () => {
  delete process.env.IYZICO_API_KEY;
  process.env.IYZICO_SECRET_KEY = SECRET;
  const o = await pendingOrder(2);
  try {
    const payload = { iyziEventType: 'CHECKOUT_FORM_AUTH', iyziPaymentId: 1, token: o.token, paymentConversationId: o.conversationId, status: 'SUCCESS', iyziReferenceCode: 'ref-1', iyziEventTime: Date.now() };

    const forged = await webhookHandler(webhookRequest(payload, hmac('wrong')));
    assert.equal(forged.status, 401);
    assert.equal((await prisma.order.findUniqueOrThrow({ where: { id: o.orderId } })).status, 'ODEME_BEKLENIYOR', 'sahte bildirim siparişi değiştirmez');

    const first = await webhookHandler(webhookRequest(payload));
    assert.equal(first.status, 200);
    assert.equal((await first.json()).result, 'paid');
    assert.equal((await prisma.order.findUniqueOrThrow({ where: { id: o.orderId } })).status, 'ODENDI');

    const again = await webhookHandler(webhookRequest(payload));
    assert.equal((await again.json()).result, 'already-paid');

    const form = new FormData();
    form.append('token', o.token);
    const back = await callbackHandler(new Request('http://localhost:3000/api/payment/callback', { method: 'POST', body: form }));
    assert.equal(back.status, 303);
    assert.match(back.headers.get('location') ?? '', /\/siparis-onay\//, 'geç gelen tarayıcı onay sayfasına gider');

    const paidTx = await prisma.paymentTransaction.findMany({ where: { orderId: o.orderId } });
    assert.deepEqual(paidTx.map((t) => t.status), ['SUCCESS'], 'inceleme kaydı açılmaz');
    assert.equal((await prisma.variant.findUniqueOrThrow({ where: { id: o.variantId } })).stock, 18, 'stok bir kez düşer');

    const ignored = await webhookHandler(webhookRequest({ ...payload, status: 'INIT_THREEDS' }));
    assert.equal(ignored.status, 200, 'ara durumlar onaylanır, işlem yapılmaz');
  } finally {
    await o.cleanup();
  }
});

test('callback and webhook arriving together settle once without a false "paid after release" review', async () => {
  delete process.env.IYZICO_API_KEY;
  process.env.IYZICO_SECRET_KEY = SECRET;
  const o = await pendingOrder();
  try {
    const before = await prisma.securityEvent.count({ where: { type: 'payment.after_release' } });
    const form = new FormData();
    form.append('token', o.token);
    const payload = { iyziEventType: 'CHECKOUT_FORM_AUTH', iyziPaymentId: 1, token: o.token, paymentConversationId: o.conversationId, status: 'SUCCESS' };
    const [cb, wh] = await Promise.all([
      callbackHandler(new Request('http://localhost:3000/api/payment/callback', { method: 'POST', body: form })),
      webhookHandler(webhookRequest(payload)),
    ]);
    assert.equal(cb.status, 303);
    assert.match(cb.headers.get('location') ?? '', /\/siparis-onay\//);
    assert.ok(['paid', 'already-paid'].includes((await wh.json()).result));
    const order = await prisma.order.findUniqueOrThrow({ where: { id: o.orderId }, include: { transactions: true } });
    assert.equal(order.status, 'ODENDI');
    assert.ok(order.transactions.every((t) => t.status === 'SUCCESS'));
    assert.equal(await prisma.securityEvent.count({ where: { type: 'payment.after_release' } }), before);
  } finally {
    await o.cleanup();
  }
});

test('refunding a paid simulator order: status, stock back, one refund only', async () => {
  delete process.env.IYZICO_API_KEY;
  const o = await pendingOrder(3);
  try {
    const form = new FormData();
    form.append('token', o.token);
    await callbackHandler(new Request('http://localhost:3000/api/payment/callback', { method: 'POST', body: form }));
    assert.equal((await prisma.variant.findUniqueOrThrow({ where: { id: o.variantId } })).stock, 17);

    const [a, b] = await Promise.all([refundOrder(prisma, o.orderId, actor, '127.0.0.1'), refundOrder(prisma, o.orderId, actor, '127.0.0.1')]);
    assert.equal([a, b].filter((r) => r.ok).length, 1, 'iki tıklama iki iade yapmaz');
    const order = await prisma.order.findUniqueOrThrow({ where: { id: o.orderId } });
    assert.equal(order.status, REFUNDED_ORDER_STATUS);
    assert.equal(order.paymentStatus, 'REFUNDED');
    assert.equal((await prisma.variant.findUniqueOrThrow({ where: { id: o.variantId } })).stock, 20, 'kargolanmamış ürün stoğa döner');
    assert.equal((await prisma.auditLog.count({ where: { action: 'order.refund', entityId: o.orderId } })), 1);

    const again = await refundOrder(prisma, o.orderId, actor, '127.0.0.1');
    assert.equal(again.ok, false);
  } finally {
    await prisma.auditLog.deleteMany({ where: { entityId: o.orderId } });
    await o.cleanup();
  }
});

test('refund via iyzico: cancel refused → per-item refunds; a bad signature stops and is flagged', async () => {
  process.env.IYZICO_API_KEY = 'sandbox-test-api';
  process.env.IYZICO_SECRET_KEY = SECRET;
  process.env.IYZICO_BASE_URL = 'https://sandbox-api.iyzipay.com';
  const product = await prisma.product.findFirstOrThrow({ where: { status: 'PUBLISHED', category: { not: 'hediye-karti' } } });

  async function paidOrder() {
    return prisma.order.create({
      data: {
        orderNumber: `PAN-T${crypto.randomBytes(5).toString('hex').toUpperCase()}`,
        customerName: 'İade Deneme',
        customerEmail: 'refund@example.com',
        customerPhone: '05550000000',
        shippingAddress: 'Adres 1',
        shippingCity: 'Ankara',
        shippingDistrict: 'Çankaya',
        totalKurus: 30000,
        status: 'KARGODA',
        paymentStatus: 'SUCCESS',
        items: { create: [{ productId: product.id, productName: product.name, size: 'S', quantity: 1, priceKurus: 30000 }] },
        transactions: {
          create: {
            conversationId: 'conv_r',
            token: 'tok_real',
            paymentId: '900',
            status: 'SUCCESS',
            amountKurus: 30000,
            rawResponse: JSON.stringify({ itemTransactions: [{ paymentTransactionId: '901', paidPrice: 120 }, { paymentTransactionId: '902', paidPrice: 180 }] }),
          },
        },
      },
    });
  }

  const refundCalls: Record<string, any>[] = [];
  const signedRefund = (req: Record<string, any>) => {
    const answer = { status: 'success', paymentId: '900', paymentTransactionId: req.paymentTransactionId, price: Number(req.price), currency: 'TRY', conversationId: req.conversationId };
    return { ...answer, signature: hmac(`900:${String(Number(req.price))}:TRY:${req.conversationId}`) };
  };
  const client = (refundAnswer: (req: Record<string, any>) => Record<string, any>) => ({
    checkoutFormInitialize: { create: (_r: object, cb: IyzipayCallback) => cb(null, {}) },
    checkoutForm: { retrieve: (_r: object, cb: IyzipayCallback) => cb(null, {}) },
    cancel: { create: (_r: object, cb: IyzipayCallback) => cb(null, { status: 'failure', errorMessage: 'Gün sonu alınmış' }) },
    refund: {
      create: (req: Record<string, any>, cb: IyzipayCallback) => {
        refundCalls.push(req);
        cb(null, refundAnswer(req));
      },
    },
  });

  const good = await paidOrder();
  const bad = await paidOrder();
  try {
    __setIyzipayClientForTests(client(signedRefund));
    const ok = await refundOrder(prisma, good.id, actor, '203.0.113.9');
    assert.equal(ok.ok, true);
    assert.ok(ok.ok && ok.method === 'refund' && ok.refunded === 300 && ok.restocked === false, 'kargodaki ürün stoğa eklenmez');
    assert.deepEqual(refundCalls.map((c) => [c.paymentTransactionId, c.price, c.ip]), [['901', '120.00', '203.0.113.9'], ['902', '180.00', '203.0.113.9']]);

    __setIyzipayClientForTests(client((req) => ({ ...signedRefund(req), signature: 'forged' })));
    const failed = await refundOrder(prisma, bad.id, actor, '203.0.113.9');
    assert.equal(failed.ok, false);
    const badOrder = await prisma.order.findUniqueOrThrow({ where: { id: bad.id } });
    assert.equal(badOrder.paymentStatus, 'REFUND_FAILED');
    assert.equal(badOrder.status, 'KARGODA', 'başarısız iade siparişi kapatmaz');
  } finally {
    await prisma.auditLog.deleteMany({ where: { entityId: { in: [good.id, bad.id] } } });
    await prisma.order.deleteMany({ where: { id: { in: [good.id, bad.id] } } });
  }
});

test('refund lines come from the stored retrieve answer', () => {
  assert.deepEqual(refundLinesFrom(JSON.stringify({ itemTransactions: [{ paymentTransactionId: 7, paidPrice: '99.9' }, { paymentTransactionId: '', paidPrice: 1 }] })), [{ paymentTransactionId: '7', amount: 99.9 }]);
  assert.deepEqual(refundLinesFrom('not json'), []);
  assert.deepEqual(refundLinesFrom(null), []);
});
