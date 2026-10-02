import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test, { afterEach, beforeEach } from 'node:test';
import {
  __setIyzipayClientForTests,
  initializeIyzicoCheckout,
  isIyzicoConfigured,
  checkoutFormSignatureValid,
  isIyzicoSandbox,
  retrieveIyzicoPayment,
  type IyzipayCallback,
  type IyzipayClient,
} from '../src/lib/payment/iyzico';

const ENV_KEYS = ['IYZICO_API_KEY', 'IYZICO_SECRET_KEY', 'IYZICO_BASE_URL'] as const;
let savedEnv: Record<string, string | undefined> = {};

beforeEach(() => {
  savedEnv = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
  process.env.IYZICO_API_KEY = 'sandbox-test-api';
  process.env.IYZICO_SECRET_KEY = 'sandbox-test-secret';
  process.env.IYZICO_BASE_URL = 'https://sandbox-api.iyzipay.com';
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (savedEnv[k] === undefined) delete process.env[k];
    else process.env[k] = savedEnv[k];
  }
  __setIyzipayClientForTests(null);
});

const params = {
  conversationId: 'conv_1',
  price: 1890,
  paidPrice: 1790.5,
  basketId: 'PND-1',
  callbackUrl: 'https://pandiones.test/api/payment/callback',
  buyer: { id: 'u1', ip: '203.0.113.7', name: 'Aslı', surname: 'Yılmaz', email: 'asli@example.com', phone: '+905321234567', address: 'Cevdet Paşa Cad. 64', city: 'İstanbul', district: 'Beşiktaş' },
  shippingAddress: { contactName: 'Aslı Yılmaz', city: 'İstanbul', country: 'Turkey', address: 'Cevdet Paşa Cad. 64' },
  billingAddress: { contactName: 'Aslı Yılmaz', city: 'İstanbul', country: 'Turkey', address: 'Cevdet Paşa Cad. 64' },
  basketItems: [{ id: 'p1', name: 'Dantel Takım', category1: 'Giyim', price: 1890 }],
};

function fakeClient(respond: { init?: [unknown, Record<string, any>]; retrieve?: [unknown, Record<string, any>] }) {
  const calls: { init?: any; retrieve?: any } = {};
  const client: IyzipayClient = {
    checkoutFormInitialize: { create(request: object, cb: IyzipayCallback) { calls.init = request; cb(...(respond.init ?? [null, {}])); } },
    checkoutForm: { retrieve(request: object, cb: IyzipayCallback) { calls.retrieve = request; cb(...(respond.retrieve ?? [null, {}])); } },
  };
  __setIyzipayClientForTests(client);
  return calls;
}

test('configuration and sandbox detection read the environment at call time', () => {
  assert.equal(isIyzicoConfigured(), true);
  assert.equal(isIyzicoSandbox(), true);
  process.env.IYZICO_BASE_URL = 'https://api.iyzipay.com';
  assert.equal(isIyzicoSandbox(), false);
  delete process.env.IYZICO_BASE_URL;
  assert.equal(isIyzicoSandbox(), true, 'default base URL is the sandbox');
  process.env.IYZICO_API_KEY = '';
  assert.equal(isIyzicoConfigured(), false);
});

test('initialize sends the same request fields as before through the SDK', async () => {
  const calls = fakeClient({ init: [null, { status: 'success', token: 'tok_1', checkoutFormContent: '<script>1</script>', paymentPageUrl: 'https://sandbox-cpp.iyzipay.com?token=tok_1' }] });
  const result = await initializeIyzicoCheckout(params);

  assert.deepEqual(result, { status: 'success', token: 'tok_1', checkoutFormContent: '<script>1</script>', paymentPageUrl: 'https://sandbox-cpp.iyzipay.com?token=tok_1', isMock: false });
  assert.equal(calls.init.locale, 'tr');
  assert.equal(calls.init.price, '1890.00');
  assert.equal(calls.init.paidPrice, '1790.50');
  assert.equal(calls.init.currency, 'TRY');
  assert.equal(calls.init.paymentGroup, 'PRODUCT');
  assert.deepEqual(calls.init.enabledInstallments, [1, 2, 3, 6]);
  assert.equal(calls.init.buyer.gsmNumber, '+905321234567');
  assert.equal(calls.init.buyer.identityNumber, '11111111110');
  assert.equal(calls.init.buyer.ip, '203.0.113.7', 'the shopper IP, not a fixed address');
  assert.equal(calls.init.shippingAddress.zipCode, '34000');
  assert.deepEqual(calls.init.basketItems, [{ id: 'p1', name: 'Dantel Takım', category1: 'Giyim', itemType: 'PHYSICAL', price: '1890.00' }]);
});

test('initialize passes iyzico failure messages through', async () => {
  fakeClient({ init: [null, { status: 'failure', errorCode: '12', errorMessage: 'Kart numarası geçersizdir' }] });
  const result = await initializeIyzicoCheckout(params);
  assert.deepEqual(result, { status: 'failure', errorMessage: 'Kart numarası geçersizdir', isMock: false });
});

test('initialize turns SDK transport errors into a failure result', async () => {
  fakeClient({ init: [new Error('ECONNRESET'), {}] });
  const result = await initializeIyzicoCheckout(params);
  assert.equal(result.status, 'failure');
  assert.equal(result.errorMessage, 'Ödeme sağlayıcısına bağlanırken hata oluştu.');
  assert.equal(result.isMock, false);
});

/** What iyzico would sign with the merchant secret (see checkoutFormSignatureValid). */
function signed(data: Record<string, any>, secret = 'sandbox-test-secret') {
  const fields = [data.paymentStatus, data.paymentId, data.currency, data.basketId, data.conversationId, data.paidPrice, data.price, data.token];
  return { ...data, signature: crypto.createHmac('sha256', secret).update(fields.join(':')).digest('hex') };
}

const PAID = { status: 'success', paymentStatus: 'SUCCESS', paymentId: '22416035', price: 1890, paidPrice: 1790.5, installment: 3, currency: 'TRY', basketId: 'PND-1', conversationId: 'conv_1', token: 'tok_1', cardType: 'CREDIT_CARD', cardAssociation: 'MASTER_CARD', cardFamily: 'Bonus', binNumber: '552879', lastFourDigits: '0006' };

test('retrieve maps a successful payment', async () => {
  const calls = fakeClient({ retrieve: [null, signed(PAID)] });
  const result = await retrieveIyzicoPayment('tok_1', 'conv_1');

  assert.deepEqual(calls.retrieve, { locale: 'tr', conversationId: 'conv_1', token: 'tok_1' });
  assert.equal(result.status, 'success');
  assert.equal(result.paymentStatus, 'SUCCESS');
  assert.equal(result.paymentId, '22416035');
  assert.equal(result.installment, 3);
  assert.equal(result.paidPrice, 1790.5);
  assert.equal(result.lastFourDigits, '0006');
  assert.ok(result.rawResponse?.includes('22416035'));
});

test('retrieve refuses a success without a valid iyzico signature or for another conversation', async () => {
  fakeClient({ retrieve: [null, { ...PAID }] });
  const unsigned = await retrieveIyzicoPayment('tok_1', 'conv_1');
  assert.equal(unsigned.paymentStatus, 'FAILURE');
  assert.equal(unsigned.signatureInvalid, true);

  fakeClient({ retrieve: [null, { ...signed(PAID), paidPrice: 1 }] });
  const tampered = await retrieveIyzicoPayment('tok_1', 'conv_1');
  assert.equal(tampered.paymentStatus, 'FAILURE');

  fakeClient({ retrieve: [null, signed(PAID, 'another-merchant-secret')] });
  assert.equal((await retrieveIyzicoPayment('tok_1', 'conv_1')).paymentStatus, 'FAILURE');

  fakeClient({ retrieve: [null, signed({ ...PAID, conversationId: 'conv_other' })] });
  const otherConversation = await retrieveIyzicoPayment('tok_1', 'conv_1');
  assert.equal(otherConversation.paymentStatus, 'FAILURE');
  assert.equal(otherConversation.signatureInvalid, true);

  assert.equal(checkoutFormSignatureValid(signed(PAID), 'sandbox-test-secret'), true);
  assert.equal(checkoutFormSignatureValid({ ...signed(PAID), token: undefined }, 'sandbox-test-secret'), false);
});

test('retrieve reports declined payments and transport errors as failures', async () => {
  fakeClient({ retrieve: [null, { status: 'success', paymentStatus: 'FAILURE', errorMessage: 'Yetersiz bakiye' }] });
  const declined = await retrieveIyzicoPayment('tok_2', 'conv_2');
  assert.equal(declined.paymentStatus, 'FAILURE');
  assert.equal(declined.errorMessage, 'Yetersiz bakiye');

  fakeClient({ retrieve: [new Error('timeout'), {}] });
  const broken = await retrieveIyzicoPayment('tok_3');
  assert.equal(broken.status, 'failure');
  assert.equal(broken.errorMessage, 'Ödeme sonucu doğrulanırken bağlantı hatası oluştu.');
});

test('the development simulator is honest about being a simulation', async () => {
  process.env.IYZICO_API_KEY = '';
  const result = await initializeIyzicoCheckout(params);
  assert.equal(result.isMock, true);
  const html = result.checkoutFormContent || '';
  assert.match(html, /class="payment-simulator"/);
  assert.match(html, /Geliştirme simülasyonu/);
  assert.match(html, /kart bilgisi istenmez ve tahsilat yapılmaz/);
  assert.match(html, /<button type="submit" class="btn btn--primary btn--lg btn--block">/);
  assert.match(html, /name="token" value="MOCK_IYZICO_/);
  assert.doesNotMatch(html, /Mastercard|Otomatik Doğrulandı|style=/);
});

test('production refuses to start payments against the iyzico sandbox', async () => {
  const env = process.env as Record<string, string | undefined>;
  const originalNodeEnv = env.NODE_ENV;
  env.NODE_ENV = 'production';
  try {
    const calls = fakeClient({ init: [null, { status: 'success', token: 'tok_x' }] });
    delete process.env.IYZICO_BASE_URL; // unset means sandbox
    const result = await initializeIyzicoCheckout(params);
    assert.equal(result.status, 'failure');
    assert.match(result.errorMessage || '', /test ortamına bağlı/);
    assert.equal(calls.init, undefined, 'no request reaches iyzico');

    process.env.IYZICO_BASE_URL = 'https://api.iyzipay.com';
    const live = await initializeIyzicoCheckout(params);
    assert.equal(live.status, 'success');
  } finally {
    env.NODE_ENV = originalNodeEnv;
  }
});

test('a success without amounts cannot be verified and is not accepted', async () => {
  fakeClient({ retrieve: [null, { ...signed({ ...PAID, conversationId: 'conv_9', token: 'tok_9' }), price: null, paidPrice: 'abc', installment: null }] });
  const result = await retrieveIyzicoPayment('tok_9', 'conv_9');
  assert.equal(result.paymentStatus, 'FAILURE');
  assert.equal(result.price, undefined);
  assert.equal(result.paidPrice, undefined);
});
