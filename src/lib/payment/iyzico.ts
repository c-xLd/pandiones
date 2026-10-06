import crypto from 'node:crypto';
import Iyzipay from 'iyzipay';
import { safeEqual } from '@/lib/security/crypto';

export interface BuyerInfo {
  id: string;
  /** The shopper's IP as seen by our server (clientIp); iyzico uses it for fraud checks. */
  ip?: string;
  name: string;
  surname: string;
  email: string;
  phone: string;
  identityNumber?: string;
  address: string;
  city: string;
  district: string;
}

export interface BasketItem {
  id: string;
  name: string;
  category1: string;
  price: number;
}

export interface InitCheckoutParams {
  locale?: 'tr' | 'en';
  conversationId: string;
  price: number;
  paidPrice: number;
  currency?: 'TRY';
  basketId: string;
  paymentGroup?: 'PRODUCT';
  callbackUrl: string;
  buyer: BuyerInfo;
  shippingAddress: {
    contactName: string;
    city: string;
    country: string;
    address: string;
    zipCode?: string;
  };
  billingAddress: {
    contactName: string;
    city: string;
    country: string;
    address: string;
    zipCode?: string;
  };
  basketItems: BasketItem[];
}

export interface CheckoutFormResult {
  status: 'success' | 'failure';
  token?: string;
  checkoutFormContent?: string;
  paymentPageUrl?: string;
  errorMessage?: string;
  isMock: boolean;
}

export interface RetrievePaymentResult {
  status: 'success' | 'failure';
  paymentStatus: 'SUCCESS' | 'FAILURE';
  paymentId?: string;
  price?: number;
  paidPrice?: number;
  installment?: number;
  currency?: string;
  basketId?: string;
  cardType?: string;
  cardAssociation?: string;
  cardFamily?: string;
  binNumber?: string;
  lastFourDigits?: string;
  errorMessage?: string;
  rawResponse?: string;
  /** True when iyzico's answer failed the signature/conversation check (possible forgery). */
  signatureInvalid?: boolean;
}

const DEFAULT_BASE_URL = 'https://sandbox-api.iyzipay.com';

function readConfig() {
  return {
    apiKey: process.env.IYZICO_API_KEY || '',
    secretKey: process.env.IYZICO_SECRET_KEY || '',
    baseUrl: process.env.IYZICO_BASE_URL || DEFAULT_BASE_URL,
  };
}

export function isIyzicoConfigured(): boolean {
  const { apiKey, secretKey } = readConfig();
  return Boolean(apiKey && secretKey && !apiKey.includes('your_'));
}

/** True when payments go to iyzico's sandbox (no real money). The default URL is the sandbox. */
/** The payment simulator runs only when explicitly enabled (PAYMENT_MODE=simulator) and never in production,
 *  so a staging or preview server without iyzico keys cannot hand out free "paid" orders. */
export function isPaymentSimulatorEnabled(): boolean {
  return process.env.NODE_ENV !== 'production' && process.env.PAYMENT_MODE === 'simulator';
}

export function isIyzicoSandbox(): boolean {
  return readConfig().baseUrl.includes('sandbox');
}

export type IyzipayCallback = (err: unknown, result: Record<string, any>) => void;

/** The two SDK resources this module uses — narrow on purpose so tests can substitute them. */
export interface IyzipayClient {
  checkoutFormInitialize: { create(request: object, cb: IyzipayCallback): void };
  checkoutForm: { retrieve(request: object, cb: IyzipayCallback): void };
  cancel?: { create(request: object, cb: IyzipayCallback): void };
  refund?: { create(request: object, cb: IyzipayCallback): void };
}

let testClient: IyzipayClient | null = null;
let sdkClient: { key: string; client: IyzipayClient } | null = null;

export function __setIyzipayClientForTests(client: IyzipayClient | null): void {
  testClient = client;
}

function getClient(): IyzipayClient {
  if (testClient) return testClient;
  const { apiKey, secretKey, baseUrl } = readConfig();
  const key = `${apiKey}|${baseUrl}`;
  if (!sdkClient || sdkClient.key !== key) {
    const client = new Iyzipay({ apiKey, secretKey, uri: baseUrl }) as unknown as IyzipayClient;
    sdkClient = { key, client };
  }
  return sdkClient.client;
}

/** iyzico amounts arrive as numbers or numeric strings; anything else is unknown, never 0. */
function toAmount(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * iyzico signs the checkout-form result: HMAC-SHA256 (hex, merchant secret key) over
 * paymentStatus:paymentId:currency:basketId:conversationId:paidPrice:price:token, with the amounts as
 * iyzico sent them (numbers, no trailing zeros). A missing or wrong signature means the answer did not
 * come from iyzico for this merchant and is treated as a failed payment.
 */
/** iyzico signs prices without trailing zeros (10.50 → "10.5"); numbers and numeric strings both normalise. */
const signedPrice = (value: unknown) => {
  const n = Number(value);
  return value === '' || value === null || value === undefined || !Number.isFinite(n) ? undefined : String(n);
};

function hmacHex(fields: unknown[], secretKey: string) {
  return crypto.createHmac('sha256', secretKey).update(fields.join(':')).digest('hex');
}

function signatureMatches(signature: unknown, fields: unknown[], secretKey: string) {
  if (typeof signature !== 'string' || !secretKey) return false;
  if (fields.some((value) => value === undefined || value === null)) return false;
  return safeEqual(hmacHex(fields, secretKey), signature.toLowerCase());
}

export function checkoutFormSignatureValid(data: Record<string, any>, secretKey: string): boolean {
  return signatureMatches(
    data.signature,
    [data.paymentStatus, data.paymentId, data.currency, data.basketId, data.conversationId, signedPrice(data.paidPrice), signedPrice(data.price), data.token],
    secretKey,
  );
}

/** Checkout-form initialize response: HMAC-SHA256 over conversationId:token. */
export function initializeSignatureValid(data: Record<string, any>, secretKey: string): boolean {
  return signatureMatches(data.signature, [data.conversationId, data.token], secretKey);
}

/** Cancel / refund response: HMAC-SHA256 over paymentId:price:currency:conversationId. */
export function refundSignatureValid(data: Record<string, any>, secretKey: string): boolean {
  return signatureMatches(data.signature, [data.paymentId, signedPrice(data.price), data.currency, data.conversationId], secretKey);
}

/**
 * iyzico server notification (webhook) for checkout-form payments, header `X-IYZ-SIGNATURE-V3`:
 * HMAC-SHA256 (hex) keyed with the merchant secret over
 * secretKey + iyziEventType + iyziPaymentId + token + paymentConversationId + status (no separator).
 */
export function webhookSignatureValid(payload: Record<string, any>, signature: string | null, secretKey = readConfig().secretKey): boolean {
  if (!signature || !secretKey) return false;
  const fields = [payload.iyziEventType, payload.iyziPaymentId, payload.token, payload.paymentConversationId, payload.status];
  if (fields.some((value) => value === undefined || value === null || value === '')) return false;
  const expected = crypto.createHmac('sha256', secretKey).update(`${secretKey}${fields.join('')}`).digest('hex');
  return safeEqual(expected, signature.trim().toLowerCase());
}

function callSdk(run: (cb: IyzipayCallback) => void): Promise<Record<string, any>> {
  return new Promise((resolve, reject) => {
    run((err, result) => (err ? reject(err) : resolve(result ?? {})));
  });
}

/**
 * Initialize iyzico Checkout Form (3D Secure)
 */
export async function initializeIyzicoCheckout(
  params: InitCheckoutParams
): Promise<CheckoutFormResult> {
  if (!isIyzicoConfigured()) {
    if (!isPaymentSimulatorEnabled()) {
      return {
        status: 'failure',
        errorMessage: 'Ödeme altyapısı yapılandırılmamıştır. Şu an ödeme alınamıyor.',
        isMock: false,
      };
    }

    // Development simulator: only without keys and outside production.
    const mockToken = `MOCK_IYZICO_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const amount = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(params.paidPrice);
    const scriptContent = `
      <div class="payment-simulator">
        <p class="payment-simulator__title">Geliştirme simülasyonu</p>
        <p class="payment-simulator__text">iyzico anahtarı tanımlı olmadığı için gerçek ödeme formu yerine bu simülasyon gösteriliyor; kart bilgisi istenmez ve tahsilat yapılmaz. Düğme, başarılı bir ödeme dönüşünü taklit eder.</p>
        <p class="payment-simulator__amount">Tutar: <strong>${amount}</strong></p>
        <form method="POST" action="${params.callbackUrl}">
          <input type="hidden" name="token" value="${mockToken}" />
          <input type="hidden" name="conversationId" value="${params.conversationId}" />
          <button type="submit" class="btn btn--primary btn--lg btn--block">Başarılı ödemeyi simüle et</button>
        </form>
      </div>
    `;

    return {
      status: 'success',
      token: mockToken,
      checkoutFormContent: scriptContent,
      isMock: true,
    };
  }

  if (process.env.NODE_ENV === 'production' && isIyzicoSandbox()) {
    return {
      status: 'failure',
      errorMessage: 'Ödeme altyapısı test ortamına bağlı; canlı ortamda işlem yapılamaz.',
      isMock: false,
    };
  }

  try {
    const request = {
      locale: params.locale || 'tr',
      conversationId: params.conversationId,
      price: params.price.toFixed(2),
      paidPrice: params.paidPrice.toFixed(2),
      currency: params.currency || 'TRY',
      basketId: params.basketId,
      paymentGroup: 'PRODUCT',
      callbackUrl: params.callbackUrl,
      enabledInstallments: [1, 2, 3, 6],
      buyer: {
        id: params.buyer.id,
        name: params.buyer.name,
        surname: params.buyer.surname,
        gsmNumber: params.buyer.phone,
        email: params.buyer.email,
        identityNumber: params.buyer.identityNumber || '11111111110',
        registrationAddress: params.buyer.address,
        ip: params.buyer.ip && params.buyer.ip !== 'unknown' ? params.buyer.ip : '127.0.0.1',
        city: params.buyer.city,
        country: 'Turkey',
      },
      shippingAddress: {
        contactName: params.shippingAddress.contactName,
        city: params.shippingAddress.city,
        country: 'Turkey',
        address: params.shippingAddress.address,
        zipCode: params.shippingAddress.zipCode || '34000',
      },
      billingAddress: {
        contactName: params.billingAddress.contactName,
        city: params.billingAddress.city,
        country: 'Turkey',
        address: params.billingAddress.address,
        zipCode: params.billingAddress.zipCode || '34000',
      },
      basketItems: params.basketItems.map((item) => ({
        id: item.id,
        name: item.name,
        category1: item.category1 || 'Giyim',
        itemType: 'PHYSICAL',
        price: item.price.toFixed(2),
      })),
    };

    const client = getClient();
    const data = await callSdk((cb) => client.checkoutFormInitialize.create(request, cb));

    if (data.status === 'success') {
      if (data.signature === undefined) {
        console.warn('iyzico initialize: response has no signature');
      } else if (!initializeSignatureValid(data, readConfig().secretKey) || data.conversationId !== params.conversationId) {
        console.error('iyzico initialize: response signature or conversationId does not match');
        return { status: 'failure', errorMessage: 'Ödeme formu doğrulanamadı. Lütfen tekrar deneyin.', isMock: false };
      }
      return {
        status: 'success',
        token: data.token,
        checkoutFormContent: data.checkoutFormContent,
        paymentPageUrl: data.paymentPageUrl,
        isMock: false,
      };
    }
    return {
      status: 'failure',
      errorMessage: data.errorMessage || 'iyzico ödeme formu başlatılamadı.',
      isMock: false,
    };
  } catch (error) {
    console.error('iyzico initialization error:', error);
    return {
      status: 'failure',
      errorMessage: 'Ödeme sağlayıcısına bağlanırken hata oluştu.',
      isMock: false,
    };
  }
}

/**
 * Retrieve & Verify iyzico Checkout Form Result after 3DS Callback
 */
export async function retrieveIyzicoPayment(
  token: string,
  conversationId?: string
): Promise<RetrievePaymentResult> {
  // Handle Mock simulator token
  if (token.startsWith('MOCK_IYZICO_')) {
    if (!isPaymentSimulatorEnabled()) {
      return {
        status: 'failure',
        paymentStatus: 'FAILURE',
        errorMessage: 'Üretim ortamında simülatör ödemeleri kabul edilmez.',
      };
    }
    return {
      status: 'success',
      paymentStatus: 'SUCCESS',
      paymentId: `MOCK_PAY_${Date.now()}`,
      installment: 1,
      currency: 'TRY',
      cardType: 'CREDIT_CARD',
      cardAssociation: 'MASTER_CARD',
      cardFamily: 'Bonus',
      binNumber: '540061',
      lastFourDigits: '1024',
      rawResponse: JSON.stringify({ mock: true, token, timestamp: new Date().toISOString() }),
    };
  }

  try {
    const request = {
      locale: 'tr',
      conversationId: conversationId || `ret_${Date.now()}`,
      token,
    };
    const client = getClient();
    const data = await callSdk((cb) => client.checkoutForm.retrieve(request, cb));

    if (data.status === 'success' && data.paymentStatus === 'SUCCESS') {
      if (!checkoutFormSignatureValid(data, readConfig().secretKey)) {
        console.error('iyzico retrieve: response signature missing or invalid');
        return {
          status: 'failure',
          paymentStatus: 'FAILURE',
          signatureInvalid: true,
          errorMessage: 'Ödeme sonucu doğrulanamadı.',
          rawResponse: JSON.stringify(data),
        };
      }
      if (conversationId && data.conversationId !== conversationId) {
        console.error('iyzico retrieve: conversationId does not match the transaction');
        return {
          status: 'failure',
          paymentStatus: 'FAILURE',
          signatureInvalid: true,
          errorMessage: 'Ödeme sonucu doğrulanamadı.',
          rawResponse: JSON.stringify(data),
        };
      }
      return {
        status: 'success',
        paymentStatus: 'SUCCESS',
        paymentId: data.paymentId,
        price: toAmount(data.price),
        paidPrice: toAmount(data.paidPrice),
        installment: toAmount(data.installment) ?? 1,
        currency: data.currency || 'TRY',
        basketId: data.basketId,
        cardType: data.cardType,
        cardAssociation: data.cardAssociation,
        cardFamily: data.cardFamily,
        binNumber: data.binNumber,
        lastFourDigits: data.lastFourDigits,
        rawResponse: JSON.stringify(data),
      };
    }
    return {
      status: 'failure',
      paymentStatus: 'FAILURE',
      errorMessage: data.errorMessage || 'Ödeme banka tarafından onaylanmadı.',
      rawResponse: JSON.stringify(data),
    };
  } catch (error) {
    console.error('iyzico retrieve error:', error);
    return {
      status: 'failure',
      paymentStatus: 'FAILURE',
      errorMessage: 'Ödeme sonucu doğrulanırken bağlantı hatası oluştu.',
    };
  }
}

export interface RefundLine {
  /** iyzico itemTransactions[].paymentTransactionId of the paid basket item. */
  paymentTransactionId: string;
  /** What was charged for that item (itemTransactions[].paidPrice), TL. */
  amount: number;
}

export type ReturnPaymentResult =
  | { ok: true; method: 'cancel' | 'refund'; refunded: number; raw: string[] }
  | { ok: false; refunded: number; errorMessage: string; raw: string[] };

/**
 * Gives the whole payment back. A same-day payment is cancelled (no bank fee, all-or-nothing); when iyzico
 * refuses the cancel (the day was settled), every paid basket item is refunded for what it was charged.
 * Every answer must carry a valid iyzico signature. On a partial failure the amount already refunded is
 * reported so the order can be finished by hand. The development simulator answers success without
 * calling iyzico and is impossible in production.
 */
export async function returnIyzicoPayment(input: { paymentId: string; token: string | null; lines: RefundLine[]; conversationId: string; ip: string }): Promise<ReturnPaymentResult> {
  const raw: string[] = [];
  if (input.token?.startsWith('MOCK_IYZICO_')) {
    if (!isPaymentSimulatorEnabled()) return { ok: false, refunded: 0, errorMessage: 'Simülatör ödemesi üretimde iade edilemez.', raw };
    return { ok: true, method: 'cancel', refunded: input.lines.reduce((sum, line) => sum + line.amount, 0), raw: ['{"mock":true}'] };
  }
  if (!isIyzicoConfigured()) return { ok: false, refunded: 0, errorMessage: 'iyzico anahtarları tanımlı değil.', raw };
  const { secretKey } = readConfig();
  const client = getClient();
  const cancelApi = client.cancel;
  const refundApi = client.refund;
  if (!cancelApi || !refundApi) return { ok: false, refunded: 0, errorMessage: 'iyzico iade servisi kullanılamıyor.', raw };

  try {
    const cancel = await callSdk((cb) => cancelApi.create({ locale: 'tr', conversationId: input.conversationId, paymentId: input.paymentId, ip: input.ip }, cb));
    raw.push(JSON.stringify(cancel));
    if (cancel.status === 'success') {
      if (!refundSignatureValid(cancel, secretKey)) {
        return { ok: false, refunded: 0, errorMessage: 'İptal yanıtının imzası doğrulanamadı; iyzico panelinden kontrol edin.', raw };
      }
      return { ok: true, method: 'cancel', refunded: Number(cancel.price) || 0, raw };
    }
  } catch (error) {
    console.error('iyzico cancel error:', error instanceof Error ? error.message : error);
  }

  let refunded = 0;
  for (const line of input.lines) {
    try {
      const refund = await callSdk((cb) =>
        refundApi.create(
          { locale: 'tr', conversationId: input.conversationId, paymentTransactionId: line.paymentTransactionId, price: line.amount.toFixed(2), currency: 'TRY', ip: input.ip },
          cb,
        ),
      );
      raw.push(JSON.stringify(refund));
      if (refund.status !== 'success') {
        return { ok: false, refunded, errorMessage: refund.errorMessage || 'iyzico iadeyi reddetti.', raw };
      }
      if (!refundSignatureValid(refund, secretKey)) {
        return { ok: false, refunded, errorMessage: 'İade yanıtının imzası doğrulanamadı; iyzico panelinden kontrol edin.', raw };
      }
      refunded += Number(refund.price) || line.amount;
    } catch (error) {
      console.error('iyzico refund error:', error instanceof Error ? error.message : error);
      return { ok: false, refunded, errorMessage: 'iyzico iade servisine bağlanılamadı.', raw };
    }
  }
  return { ok: true, method: 'refund', refunded, raw };
}
