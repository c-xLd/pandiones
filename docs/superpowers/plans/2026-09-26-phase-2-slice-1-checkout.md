# Faz 2 · Dilim 1 — Ödeme Altyapısı, Ödeme ve Sipariş Onayı Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** iyzico istemcisini resmi `iyzipay` SDK'sına taşımak; `/odeme` sayfasında iyzico Ödeme Formunu sayfaya gömülü (responsive) ikinci adım olarak göstermek; test modunu görünür kılmak; `/odeme` ve `/siparis-onay/[id]` sayfalarını tasarım sistemine, eksiksiz form/durum/erişilebilirlik davranışlarıyla taşımak.

**Architecture:** `src/lib/payment/iyzico.ts` dış arayüzünü (`initializeIyzicoCheckout`, `retrieveIyzicoPayment`, `isIyzicoConfigured`) korur; içeride SDK istemcisini kullanır ve testler için enjekte edilebilir. Checkout API yanıtına `isTestMode` eklenir. UI tarafında üç primitif (`FormField`, `StatusPanel`, `Notice`), iki saf yardımcı (`validateCheckoutForm`, `describeOrderPayment`) ve `src/app/odeme/_components/` altında odaklı bileşenler eklenir. Stiller yalnız token kullanır.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, `iyzipay` 2.0.70 (+ `@types/iyzipay` 2.0.3), düz CSS (`src/styles`), `node --test` + `tsx`, `react-dom/server` markup testleri.

**Spec:** `docs/superpowers/specs/2026-09-26-design-phase-2-pages-design.md`
**Kaynak:** iyzico Geliştirici Portalı — Ödeme Formu (CF) Entegrasyonu (https://docs.iyzico.com/odeme-metotlari/odeme-formu/cf-entegrasyonu), Sandbox (https://docs.iyzico.com/on-hazirliklar/sandbox); SDK https://github.com/iyzico/iyzipay-node

## Global Constraints

- Ödeme dış arayüzü değişmez: `initializeIyzicoCheckout(params: InitCheckoutParams): Promise<CheckoutFormResult>`, `retrieveIyzicoPayment(token, conversationId?): Promise<RetrievePaymentResult>`, `isIyzicoConfigured()`. Ortam değişkeni adları aynı kalır: `IYZICO_API_KEY`, `IYZICO_SECRET_KEY`, `IYZICO_BASE_URL` (varsayılan `https://sandbox-api.iyzipay.com`).
- İstek alanları birebir korunur (bugünkü değerler dahil): `enabledInstallments: [1, 2, 3, 6]`, `identityNumber` yoksa `'11111111110'`, `ip: '85.105.10.10'`, `country: 'Turkey'`, `zipCode` yoksa `'34000'`, `itemType: PHYSICAL`, `paymentGroup: PRODUCT`. Bu sabitlerin canlıya uygunluğu bu dilimde değişmez; `docs/QA.md`'ye açık iş olarak yazılır (Task 8).
- Simülatör yalnız anahtar yokken ve üretim dışındayken çalışır (bugünkü gibi); üretimde anahtar yoksa hata döner.
- Sahte adres araması tamamen kaldırılır: `GOOGLE_PLACES_CATALOG`, arama kutusu, açılır liste, "powered by Google".
- Test modu metni: **"Test modu — gerçek ödeme alınmaz."** — API `isTestMode: true` (simülatör **veya** base URL `sandbox` içeriyor) iken ödeme adımında görünür.
- iyzico formu **Responsive** modunda gömülür: `<div id="iyzipay-checkout-form" class="responsive"></div>`; `checkoutFormContent` script'leri yeniden oluşturularak çalıştırılır; yeni token öncesi `window.iyziInit` silinir. `checkoutFormContent` yoksa `paymentPageUrl`'e yönlendirme yedektir.
- İş mantığının geri kalanı değişmez: sipariş oluşturma, callback, stok/kupon, yetki.
- Stil dosyalarında yalnız token (`tests/design-tokens.test.ts`); yeni CSS dosyaları `src/app/globals.css` import listesine eklenir.
- Kargo takip numarası tıklanabilir görünmez; giriş bağlantısı `?redirect=/siparis-onay/<id>` taşır (desteği Dilim 2'de).
- Her görev sonunda `npx tsc --noEmit` ve `npm test`. Bilinen, bu işten bağımsız 2 hata: `tests/collection-category.test.tsx` (kategori navigasyonu SSR'da yok). Başka hata kabul edilmez.
- Build yalıtılmış: `PANDIONES_LAN_PREVIEW=1 npx next build`. Tarayıcı: `.claude/launch.json` → `dev-isolated` (port 3001).
- Her görev başında dokunulacak dosyalar için `git status --short <yol>` boş olmalı (paralel çalışma koruması); değilse dur ve kullanıcıya sor.

## Review Focus

- **Formu düzenleyip yeniden ödemeye geçmek**: ikinci token'la iyzico formu yeniden çizilmeli; eski `iyziInit` yüzünden boş kalmamalı (Task 5 testi `window.iyziInit` temizliğini doğrular; gerçek sandbox'ta Task 6 tarayıcı adımı, anahtar varsa).
- **SDK ağ hatası / geri çağrı hatası** (`err` dolu): kullanıcıya "Ödeme sağlayıcısına bağlanırken hata oluştu." dönmeli, istisna fırlamamalı (Task 1 testi).
- **iyzico `status: 'failure'` yanıtı**: `errorMessage` aynen iletilmeli (Task 1 testi).
- **Sepet henüz okunmamışken** "Çantanız boş" flaşı olmamalı; iskelet görünmeli (Task 5 markup testi + Task 6 tarayıcı adımı).
- **Telefon biçimleri** `+90 5xx`, `05xx`, `5xx`, boşluk/tire/parantez kabul; 9 hane veya `4` ile başlayan ret; **yalnız boşluk** içeren alan boş sayılır (Task 4 testleri).
- **Tutarı 0 olan sipariş** onay sayfasında "kartla ödendi" dememeli (Task 3 `describeOrderPayment` testi).

---

## File Structure

| Dosya | Sorumluluk |
| --- | --- |
| `package.json`, `package-lock.json` | `iyzipay@2.0.70`, `@types/iyzipay@2.0.3` (dev) |
| `next.config.mjs` | `serverExternalPackages: ['iyzipay']` (SDK kaynakları dinamik `require` ile yükler; bundle'a alınmaz) |
| `src/lib/payment/iyzico.ts` (değişir) | SDK tabanlı istemci; config ortamdan çağrı anında okunur; `isIyzicoSandbox()`; dürüst simülatör; test için istemci enjeksiyonu |
| `src/app/api/checkout/route.ts` (değişir, tek satır) | Yanıta `isTestMode` |
| `tests/iyzico-client.test.ts` (yeni) | SDK istek eşlemesi, başarı/hata/ağ hatası, sandbox tespiti, simülatör metni |
| `src/components/ui/FormField.tsx`, `StatusPanel.tsx`, `Notice.tsx` (yeni) | Paylaşılan UI |
| `src/styles/components/status.css`, `selection.css` (yeni); `form.css`, `base/base.css` (değişir) | Primitif stilleri |
| `src/lib/checkout/form-validation.ts` (yeni) | Ödeme formu istemci doğrulaması |
| `src/lib/payment/payment-display.ts` (yeni) | Onay sayfasında ödeme özeti türü |
| `src/app/odeme/_components/CheckoutStepper.tsx`, `SavedAddressPicker.tsx`, `CouponForm.tsx`, `PaymentStep.tsx`, `CheckoutSkeleton.tsx` (yeni) | Ödeme sayfası parçaları |
| `src/app/odeme/page.tsx` (değişir) | Birleştirme, iki adımlı akış |
| `src/styles/pages/checkout.css` (değişir) | Ödeme ve onay sınıfları |
| `src/app/siparis-onay/[id]/page.tsx`, `OrderPrintButton.tsx` (değişir) | Onay sayfası |
| `DESIGN.md`, `docs/QA.md`, `README.md` (değişir) | Belgeler |

---

### Task 1: iyzico istemcisini resmi SDK'ya taşı

**Files:**
- Modify: `package.json`, `package-lock.json` (npm ile), `next.config.mjs`
- Modify: `src/lib/payment/iyzico.ts`
- Test: `tests/iyzico-client.test.ts` (yeni); mevcut `tests/payment-callback-idempotency.test.ts` geçmeye devam etmeli

**Interfaces:**
- Produces (dış arayüz aynı; yeni eklemeler):
  - `isIyzicoSandbox(): boolean` — `IYZICO_BASE_URL` (varsayılan sandbox) `sandbox` içeriyorsa `true`.
  - `type IyzipayCallback = (err: unknown, result: Record<string, any>) => void`
  - `interface IyzipayClient { checkoutFormInitialize: { create(request: object, cb: IyzipayCallback): void }; checkoutForm: { retrieve(request: object, cb: IyzipayCallback): void } }`
  - `__setIyzipayClientForTests(client: IyzipayClient | null): void`
  - `isIyzicoConfigured()` artık ortamı **çağrı anında** okur.

- [ ] **Step 1: Install SDK and types**

```bash
git status --short src/lib/payment/iyzico.ts next.config.mjs package.json
npm install iyzipay@2.0.70 --save-exact --no-audit --no-fund
npm install -D @types/iyzipay@2.0.3 --save-exact --no-audit --no-fund
```
Expected: `package.json` dependencies'te `"iyzipay": "2.0.70"`, devDependencies'te `"@types/iyzipay": "2.0.3"`.

- [ ] **Step 2: Write the failing test**

`tests/iyzico-client.test.ts`:
```ts
import assert from 'node:assert/strict';
import test, { afterEach, beforeEach } from 'node:test';
import {
  __setIyzipayClientForTests,
  initializeIyzicoCheckout,
  isIyzicoConfigured,
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
  buyer: { id: 'u1', name: 'Aslı', surname: 'Yılmaz', email: 'asli@example.com', phone: '+905321234567', address: 'Cevdet Paşa Cad. 64', city: 'İstanbul', district: 'Beşiktaş' },
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
  assert.equal(calls.init.buyer.ip, '85.105.10.10');
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

test('retrieve maps a successful payment', async () => {
  const calls = fakeClient({ retrieve: [null, { status: 'success', paymentStatus: 'SUCCESS', paymentId: '22416035', price: 1890, paidPrice: 1790.5, installment: 3, currency: 'TRY', basketId: 'PND-1', cardType: 'CREDIT_CARD', cardAssociation: 'MASTER_CARD', cardFamily: 'Bonus', binNumber: '552879', lastFourDigits: '0006' }] });
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
```

- [ ] **Step 3: Run test to verify it fails**

Run: `node --import tsx --test tests/iyzico-client.test.ts`
Expected: FAIL — `__setIyzipayClientForTests` / `isIyzicoSandbox` export yok.

- [ ] **Step 4: Rewrite the client internals**

`src/lib/payment/iyzico.ts` — `import crypto` satırını, `IYZICO_*` sabitlerini, `isIyzicoConfigured`, `generateIyzwsHeader`, `generatePkiString` ve iki fonksiyonun "Live or Sandbox API Call" `try` bloklarını değiştir. Arayüz tipleri (`BuyerInfo` … `RetrievePaymentResult`) ve simülatör dalları (Task 2'de düzenlenir) aynen kalır.

Dosyanın başı:
```ts
import Iyzipay from 'iyzipay';
```

Tiplerden sonra, eski sabitler ve yardımcılar yerine:
```ts
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
export function isIyzicoSandbox(): boolean {
  return readConfig().baseUrl.includes('sandbox');
}

export type IyzipayCallback = (err: unknown, result: Record<string, any>) => void;

/** The two SDK resources this module uses — narrow on purpose so tests can substitute them. */
export interface IyzipayClient {
  checkoutFormInitialize: { create(request: object, cb: IyzipayCallback): void };
  checkoutForm: { retrieve(request: object, cb: IyzipayCallback): void };
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

function callSdk(run: (cb: IyzipayCallback) => void): Promise<Record<string, any>> {
  return new Promise((resolve, reject) => {
    run((err, result) => (err ? reject(err) : resolve(result ?? {})));
  });
}
```

`initializeIyzicoCheckout` içindeki canlı/sandbox `try` bloğu:
```ts
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
        ip: '85.105.10.10',
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
```

`retrieveIyzicoPayment` içindeki simülatör dalından sonraki `try` bloğu:
```ts
  try {
    const request = {
      locale: 'tr',
      conversationId: conversationId || `ret_${Date.now()}`,
      token,
    };
    const client = getClient();
    const data = await callSdk((cb) => client.checkoutForm.retrieve(request, cb));

    if (data.status === 'success' && data.paymentStatus === 'SUCCESS') {
      return {
        status: 'success',
        paymentStatus: 'SUCCESS',
        paymentId: data.paymentId,
        price: data.price !== undefined ? Number(data.price) : undefined,
        paidPrice: data.paidPrice !== undefined ? Number(data.paidPrice) : undefined,
        installment: data.installment ? Number(data.installment) : 1,
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
```

Simülatör dallarında `isIyzicoConfigured()` çağrısı zaten var; başka yerde `IYZICO_API_KEY` sabitine referans kalmadığını doğrula: `grep -n "IYZICO_API_KEY\|IYZICO_BASE_URL\|generatePkiString\|generateIyzwsHeader" src/lib/payment/iyzico.ts` yalnız `readConfig` içindeki `process.env` satırlarını göstermeli.

- [ ] **Step 5: Keep the SDK out of the bundle**

`next.config.mjs` içinde `nextConfig` nesnesine (ör. `reactStrictMode` satırından sonra) ekle:
```js
  // iyzipay loads its resources with dynamic require(); run it as a plain Node module.
  serverExternalPackages: ['iyzipay'],
```

- [ ] **Step 6: Run tests**

Run: `node --import tsx --test tests/iyzico-client.test.ts tests/payment-callback-idempotency.test.ts`
Expected: tüm testler PASS.

- [ ] **Step 7: Type check, build, commit**

```bash
npx tsc --noEmit
PANDIONES_LAN_PREVIEW=1 npx next build
git add package.json package-lock.json next.config.mjs src/lib/payment/iyzico.ts tests/iyzico-client.test.ts
git commit -m "refactor(payment): use the official iyzipay SDK for checkout form init and retrieve"
```
Build başarısız olur ve hata `iyzipay` modül çözümlemesiyse `serverExternalPackages` satırının yerini kontrol et; başka bir hataysa dur ve raporla.

---

### Task 2: Test modu bayrağı ve dürüst simülatör

**Files:**
- Modify: `src/lib/payment/iyzico.ts` (simülatör HTML'i)
- Modify: `src/app/api/checkout/route.ts` (yanıt nesnesi)
- Test: `tests/iyzico-client.test.ts` (ekle)

**Interfaces:**
- Consumes: `isIyzicoSandbox()` (Task 1).
- Produces: `/api/checkout` başarılı yanıtında `isTestMode: boolean`. Simülatör HTML'i `.payment-simulator` kökü, `.btn` düğme kullanır (CSS Task 6'da).

- [ ] **Step 1: Write the failing test** — `tests/iyzico-client.test.ts` sonuna ekle:

```ts
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
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --import tsx --test tests/iyzico-client.test.ts`
Expected: yeni test FAIL (`payment-simulator` yok).

- [ ] **Step 3: Replace the simulator markup** in `initializeIyzicoCheckout` (the `const scriptContent = \`...\`` template) with:

```ts
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
```

- [ ] **Step 4: Add the flag to the checkout response**

`src/app/api/checkout/route.ts`: import satırına `isIyzicoSandbox` ekle (dosyada `initializeIyzicoCheckout`'un import edildiği satır), ve başarılı `NextResponse.json({...})` içinde `isMock: paymentResult.isMock,` satırından sonra:
```ts
      isTestMode: paymentResult.isMock || isIyzicoSandbox(),
```

- [ ] **Step 5: Run tests, type check, commit**

```bash
node --import tsx --test tests/iyzico-client.test.ts tests/payment-callback-idempotency.test.ts tests/checkout-integrity.test.ts
npx tsc --noEmit
git add src/lib/payment/iyzico.ts src/app/api/checkout/route.ts tests/iyzico-client.test.ts
git commit -m "feat(payment): expose test mode and make the dev simulator honest"
```

---

### Task 3: Paylaşılan UI primitifleri ve ödeme gösterimi yardımcısı

**Files:**
- Create: `src/components/ui/FormField.tsx`, `src/components/ui/StatusPanel.tsx`, `src/components/ui/Notice.tsx`
- Create: `src/styles/components/status.css`, `src/styles/components/selection.css`
- Create: `src/lib/payment/payment-display.ts`
- Modify: `src/styles/components/form.css` (sona ekle), `src/styles/base/base.css` (sona ekle), `src/app/globals.css` (import)
- Test: `tests/ui-primitives.test.tsx`, `tests/payment-display.test.ts`

**Interfaces:**
- Produces:
  - `FormField({ id: string; label: string; required?: boolean; optional?: boolean; hint?: string; error?: string; className?: string; children: React.ReactElement })` — çocuğa `id`, `required`, `aria-invalid`, `aria-describedby` ve `field__control` sınıfını ekler.
  - `StatusPanel({ tone?: 'neutral'|'success'|'warning'|'danger'; icon?: React.ReactNode; eyebrow?: string; title: string; headingLevel?: 1|2; children?: React.ReactNode; actions?: React.ReactNode })`
  - `Notice({ tone?: 'info'|'success'|'warning'|'danger'; title?: string; role?: 'status'|'alert'; className?: string; children: React.ReactNode })`
  - `describeOrderPayment(totalAmount: number | null, tx: { paymentId?: string | null; token?: string | null; lastFourDigits?: string | null } | null | undefined): 'test' | 'card' | 'no-charge' | 'unknown'`
  - CSS: `.status-panel(--success|--warning|--danger)`, `.status-panel__icon|__eyebrow|__title|__body|__actions`, `.notice(--info|--success|--warning|--danger)`, `.notice__title`, `.choice-group`, `.choice-group__legend`, `.choice-card`, `.choice-card__input`, `.choice-card__title`, `.choice-card__meta`, `.choice-card__check`, `.chip`, `.field__optional`, `.visually-hidden`, `.print-hide`

- [ ] **Step 1: Write the failing tests**

`tests/payment-display.test.ts`:
```ts
import assert from 'node:assert/strict';
import test from 'node:test';
import { describeOrderPayment } from '../src/lib/payment/payment-display';

test('simulator payments are reported as test payments', () => {
  assert.equal(describeOrderPayment(1890, { paymentId: 'MOCK_PAY_1726', token: 'MOCK_IYZICO_1_abc' }), 'test');
  assert.equal(describeOrderPayment(1890, { paymentId: null, token: 'MOCK_IYZICO_1_abc' }), 'test');
});

test('real card payments are reported as card payments', () => {
  assert.equal(describeOrderPayment(1890, { paymentId: '22416035', token: 'b1c2', lastFourDigits: '0006' }), 'card');
});

test('fully discounted orders are not reported as card payments', () => {
  assert.equal(describeOrderPayment(0, null), 'no-charge');
  assert.equal(describeOrderPayment(0, undefined), 'no-charge');
});

test('paid orders without a transaction record stay unknown', () => {
  assert.equal(describeOrderPayment(1890, null), 'unknown');
  assert.equal(describeOrderPayment(null, null), 'unknown');
});
```

`tests/ui-primitives.test.tsx`:
```tsx
import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import FormField from '../src/components/ui/FormField';
import StatusPanel from '../src/components/ui/StatusPanel';
import Notice from '../src/components/ui/Notice';

test('FormField links label, hint and error to the control', () => {
  const html = renderToStaticMarkup(
    <FormField id="customerEmail" label="E-posta" required hint="Sipariş özeti gönderilir." error="Geçerli bir e-posta adresi girin.">
      <input type="email" name="customerEmail" />
    </FormField>,
  );
  assert.match(html, /<label class="field__label" for="customerEmail">E-posta<span aria-hidden="true"> \*<\/span><\/label>/);
  assert.match(html, /<input[^>]*id="customerEmail"/);
  assert.match(html, /<input[^>]*required=""/);
  assert.match(html, /<input[^>]*aria-invalid="true"/);
  assert.match(html, /<input[^>]*aria-describedby="customerEmail-hint customerEmail-error"/);
  assert.match(html, /<input[^>]*class="field__control"/);
  assert.match(html, /<p id="customerEmail-error" class="field__error">Geçerli bir e-posta adresi girin\.<\/p>/);
});

test('FormField without error does not mark the control invalid', () => {
  const html = renderToStaticMarkup(
    <FormField id="shippingNotes" label="Teslimat notu" optional>
      <input name="shippingNotes" className="extra" />
    </FormField>,
  );
  assert.doesNotMatch(html, /aria-invalid/);
  assert.doesNotMatch(html, /aria-describedby/);
  assert.match(html, /class="field__control extra"/);
  assert.match(html, /<span class="field__optional">isteğe bağlı<\/span>/);
});

test('StatusPanel renders a labelled region with heading level and actions', () => {
  const html = renderToStaticMarkup(
    <StatusPanel tone="danger" icon="✕" eyebrow="Pandiones" title="Ödeme Onaylanamadı" actions={<a href="/odeme">Tekrar dene</a>}>
      <p>Bankadan onay alınamadı.</p>
    </StatusPanel>,
  );
  assert.match(html, /<section class="status-panel status-panel--danger" aria-labelledby="[^"]+">/);
  assert.match(html, /<span class="status-panel__icon" aria-hidden="true">✕<\/span>/);
  assert.match(html, /<h1 id="[^"]+" class="status-panel__title">Ödeme Onaylanamadı<\/h1>/);
  assert.match(html, /<div class="status-panel__actions"><a href="\/odeme">Tekrar dene<\/a><\/div>/);
});

test('Notice carries tone class and optional live-region role', () => {
  const html = renderToStaticMarkup(<Notice tone="warning" role="status" title="Test modu">Gerçek ödeme alınmaz.</Notice>);
  assert.match(html, /<div class="notice notice--warning" role="status"><p class="notice__title">Test modu<\/p>/);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --import tsx --test tests/payment-display.test.ts tests/ui-primitives.test.tsx`
Expected: FAIL — `Cannot find module '../src/lib/payment/payment-display'` / `../src/components/ui/FormField`.

- [ ] **Step 3: Implement the helper and components**

`src/lib/payment/payment-display.ts`:
```ts
/** How a paid order's payment should be described to the customer. */
export type OrderPaymentKind = 'test' | 'card' | 'no-charge' | 'unknown';

type TransactionLike = {
  paymentId?: string | null;
  token?: string | null;
  lastFourDigits?: string | null;
} | null | undefined;

const isSimulatorTransaction = (tx: NonNullable<TransactionLike>) =>
  Boolean(tx.paymentId?.startsWith('MOCK_PAY_') || tx.token?.startsWith('MOCK_IYZICO_'));

export function describeOrderPayment(totalAmount: number | null, tx: TransactionLike): OrderPaymentKind {
  if (tx && isSimulatorTransaction(tx)) return 'test';
  if (tx?.paymentId) return 'card';
  if (totalAmount === 0) return 'no-charge';
  return 'unknown';
}
```

`src/components/ui/FormField.tsx`:
```tsx
import React from 'react';

type ControlProps = {
  id?: string;
  className?: string;
  required?: boolean;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
};

type FormFieldProps = {
  id: string;
  label: string;
  required?: boolean;
  optional?: boolean;
  hint?: string;
  error?: string;
  className?: string;
  children: React.ReactElement<ControlProps>;
};

/** Persistent label, control, hint and field-level error — see DESIGN.md "Form alanı". */
export default function FormField({ id, label, required, optional, hint, error, className, children }: FormFieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  const control = React.cloneElement(children, {
    id,
    required: required || undefined,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': describedBy,
    className: ['field__control', children.props.className].filter(Boolean).join(' '),
  });

  return (
    <div className={['field', className].filter(Boolean).join(' ')}>
      <label className="field__label" htmlFor={id}>
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
        {!required && optional ? <> <span className="field__optional">isteğe bağlı</span></> : null}
      </label>
      {control}
      {hint ? <p id={hintId} className="field__hint">{hint}</p> : null}
      {error ? <p id={errorId} className="field__error">{error}</p> : null}
    </div>
  );
}
```

`src/components/ui/StatusPanel.tsx`:
```tsx
import React, { useId } from 'react';

type Tone = 'neutral' | 'success' | 'warning' | 'danger';

type StatusPanelProps = {
  tone?: Tone;
  icon?: React.ReactNode;
  eyebrow?: string;
  title: string;
  headingLevel?: 1 | 2;
  children?: React.ReactNode;
  actions?: React.ReactNode;
};

/** Centred full-page state: unauthorized, pending, failed, empty. */
export default function StatusPanel({ tone = 'neutral', icon, eyebrow, title, headingLevel = 1, children, actions }: StatusPanelProps) {
  const titleId = useId();
  const Heading = headingLevel === 1 ? 'h1' : 'h2';
  const className = tone === 'neutral' ? 'status-panel' : `status-panel status-panel--${tone}`;
  return (
    <section className={className} aria-labelledby={titleId}>
      {icon ? <span className="status-panel__icon" aria-hidden="true">{icon}</span> : null}
      {eyebrow ? <p className="status-panel__eyebrow">{eyebrow}</p> : null}
      <Heading id={titleId} className="status-panel__title">{title}</Heading>
      {children ? <div className="status-panel__body">{children}</div> : null}
      {actions ? <div className="status-panel__actions">{actions}</div> : null}
    </section>
  );
}
```

`src/components/ui/Notice.tsx`:
```tsx
import React from 'react';

type NoticeProps = {
  tone?: 'info' | 'success' | 'warning' | 'danger';
  title?: string;
  role?: 'status' | 'alert';
  className?: string;
  children: React.ReactNode;
};

/** Inline information box. Use role="alert" only for errors the user must act on. */
export default function Notice({ tone = 'info', title, role, className, children }: NoticeProps) {
  return (
    <div className={['notice', `notice--${tone}`, className].filter(Boolean).join(' ')} role={role}>
      {title ? <p className="notice__title">{title}</p> : null}
      {children}
    </div>
  );
}
```

- [ ] **Step 4: Add the CSS**

`src/styles/components/status.css`:
```css
/* Full-page state panel and inline notices. Tone colours come from semantic tokens. */

.status-panel {
  display: grid;
  justify-items: center;
  gap: var(--space-3);
  max-width: 580px;
  margin: var(--space-9) auto;
  padding: 0 var(--space-5);
  text-align: center;
}

.status-panel__icon {
  display: grid;
  place-items: center;
  width: 64px;
  height: 64px;
  margin-bottom: var(--space-2);
  border: 1px solid var(--line-strong);
  border-radius: var(--radius-round);
  color: var(--ink);
  font-size: var(--text-3xl);
}

.status-panel--success .status-panel__icon { border-color: var(--success); color: var(--success); }
.status-panel--warning .status-panel__icon { border-color: var(--warning); color: var(--warning); }
.status-panel--danger .status-panel__icon { border-color: var(--danger); color: var(--danger); }

.status-panel__eyebrow {
  margin: 0;
  color: var(--muted);
  font-size: var(--text-xs);
  font-weight: var(--weight-semibold);
  letter-spacing: var(--tracking-display);
  text-transform: uppercase;
}

.status-panel__title {
  margin: 0;
  font: var(--weight-regular) var(--text-fluid-lg)/1.15 var(--font-display);
  letter-spacing: var(--tracking-tight);
}

.status-panel__body {
  max-width: 46ch;
  color: var(--muted);
  font-size: var(--text-base);
  line-height: 1.7;
}

.status-panel__body > * { margin: 0; }

.status-panel__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--space-3);
  margin-top: var(--space-4);
}

.notice {
  --notice-fg: var(--ink);
  --notice-bg: var(--surface-soft);
  --notice-line: var(--line);
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--notice-line);
  border-radius: var(--radius-sm);
  background: var(--notice-bg);
  color: var(--notice-fg);
  font-size: var(--text-md);
  line-height: 1.6;
}

.notice > p { margin: 0; }
.notice > * + * { margin-top: var(--space-1); }

.notice--success { --notice-fg: var(--success); --notice-bg: var(--success-surface); --notice-line: var(--success); }
.notice--warning { --notice-fg: var(--warning); --notice-bg: var(--warning-surface); --notice-line: var(--warning); }
.notice--danger { --notice-fg: var(--danger); --notice-bg: var(--danger-surface); --notice-line: var(--danger-line); }

.notice__title {
  font-weight: var(--weight-semibold);
}
```

`src/styles/components/selection.css`:
```css
/* Selectable cards (radio groups) and small chips. */

.choice-group {
  margin: 0 0 var(--space-5);
  padding: 0;
  border: 0;
}

.choice-group__legend {
  margin-bottom: var(--space-2);
  padding: 0;
  color: var(--ink-soft);
  font-size: var(--text-xs);
  font-weight: var(--weight-medium);
  letter-spacing: var(--tracking-wider);
  text-transform: uppercase;
}

.choice-group__options {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: var(--space-3);
}

.choice-card {
  position: relative;
  display: grid;
  gap: var(--space-1);
  min-width: 0;
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--line-strong);
  border-radius: var(--radius-sm);
  background: var(--paper);
  cursor: pointer;
  transition: border-color var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out);
}

@media (hover: hover) and (pointer: fine) {
  .choice-card:hover { border-color: var(--muted-soft); }
}

.choice-card:has(.choice-card__input:checked) {
  border-color: var(--ink);
  box-shadow: 0 0 0 1px var(--ink);
}

.choice-card:has(.choice-card__input:focus-visible) {
  outline: 2px solid var(--focus);
  outline-offset: 3px;
}

.choice-card__input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.choice-card__title {
  display: flex;
  justify-content: space-between;
  gap: var(--space-2);
  color: var(--ink);
  font-size: var(--text-md);
  font-weight: var(--weight-semibold);
}

.choice-card__check {
  display: none;
  color: var(--ink);
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
}

.choice-card:has(.choice-card__input:checked) .choice-card__check { display: inline; }

.choice-card__meta {
  overflow: hidden;
  color: var(--muted);
  font-size: var(--text-sm);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1) var(--space-2);
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  background: var(--paper);
  color: var(--ink);
  font-size: var(--text-xs);
  font-weight: var(--weight-medium);
  line-height: 1.4;
}
```

Append to `src/styles/components/form.css`:
```css
.field__optional {
  color: var(--muted);
  font-weight: var(--weight-regular);
  letter-spacing: var(--tracking-normal);
  text-transform: none;
}
```

Append to `src/styles/base/base.css`:
```css
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

@media print {
  header,
  footer,
  nav,
  .print-hide {
    display: none !important;
  }

  main {
    margin: 0 !important;
    padding: 0 !important;
  }
}
```

In `src/app/globals.css`, after `@import '../styles/components/form.css';` add:
```css
@import '../styles/components/status.css';
@import '../styles/components/selection.css';
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `node --import tsx --test tests/payment-display.test.ts tests/ui-primitives.test.tsx tests/design-tokens.test.ts`
Expected: all PASS.

- [ ] **Step 6: Type check and commit**

```bash
npx tsc --noEmit
git add src/components/ui src/lib/payment/payment-display.ts src/styles/components/status.css src/styles/components/selection.css src/styles/components/form.css src/styles/base/base.css src/app/globals.css tests/ui-primitives.test.tsx tests/payment-display.test.ts
git commit -m "feat(ui): add FormField, StatusPanel, Notice and payment display helper"
```

---

### Task 4: Ödeme formu istemci doğrulaması

**Files:**
- Create: `src/lib/checkout/form-validation.ts`
- Test: `tests/checkout-form-validation.test.ts`

**Interfaces:**
- Produces:
  - `type CheckoutFormData = { customerName: string; customerEmail: string; customerPhone: string; shippingCity: string; shippingDistrict: string; shippingAddress: string; shippingNotes: string }`
  - `type CheckoutFieldErrors = Partial<Record<keyof CheckoutFormData, string>>`
  - `CHECKOUT_FIELD_ORDER: (keyof CheckoutFormData)[]` — DOM sırası; ilk hatalı alana odak için.
  - `validateCheckoutForm(data: CheckoutFormData): CheckoutFieldErrors`
  - `isValidTurkishMobile(value: string): boolean`

- [ ] **Step 1: Write the failing test**

`tests/checkout-form-validation.test.ts`:
```ts
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CHECKOUT_FIELD_ORDER,
  isValidTurkishMobile,
  validateCheckoutForm,
  type CheckoutFormData,
} from '../src/lib/checkout/form-validation';

const valid: CheckoutFormData = {
  customerName: 'Aslı Yılmaz',
  customerEmail: 'asli@example.com',
  customerPhone: '0532 123 45 67',
  shippingCity: 'İstanbul',
  shippingDistrict: 'Beşiktaş',
  shippingAddress: 'Cevdet Paşa Cad. No: 64 D: 3',
  shippingNotes: '',
};

test('a complete form has no errors', () => {
  assert.deepEqual(validateCheckoutForm(valid), {});
});

test('whitespace-only required fields are empty', () => {
  const errors = validateCheckoutForm({ ...valid, customerName: '   ', shippingCity: '\t', shippingDistrict: ' ' });
  assert.equal(errors.customerName, 'Ad ve soyadınızı girin.');
  assert.equal(errors.shippingCity, 'Şehir girin.');
  assert.equal(errors.shippingDistrict, 'İlçe girin.');
});

test('email must look like an address', () => {
  assert.equal(validateCheckoutForm({ ...valid, customerEmail: 'asli@' }).customerEmail, 'Geçerli bir e-posta adresi girin.');
  assert.equal(validateCheckoutForm({ ...valid, customerEmail: '' }).customerEmail, 'E-posta adresinizi girin.');
});

test('Turkish mobile numbers are accepted in common formats', () => {
  for (const phone of ['05321234567', '5321234567', '+90 532 123 45 67', '0 (532) 123-45-67', '905321234567']) {
    assert.equal(isValidTurkishMobile(phone), true, phone);
  }
});

test('short or non-mobile numbers are rejected', () => {
  for (const phone of ['053212345', '04321234567', '2121234567', 'abc']) {
    assert.equal(isValidTurkishMobile(phone), false, phone);
  }
  assert.equal(
    validateCheckoutForm({ ...valid, customerPhone: '053212345' }).customerPhone,
    'Cep telefonunuzu 05XX XXX XX XX biçiminde girin.',
  );
});

test('address needs enough detail and notes stay optional', () => {
  assert.equal(
    validateCheckoutForm({ ...valid, shippingAddress: 'Kadıköy' }).shippingAddress,
    'Mahalle, cadde/sokak ve kapı numarasıyla açık adres girin.',
  );
  assert.equal(validateCheckoutForm({ ...valid, shippingNotes: '' }).shippingNotes, undefined);
});

test('field order follows the form layout', () => {
  assert.deepEqual(CHECKOUT_FIELD_ORDER, [
    'customerName', 'customerEmail', 'customerPhone',
    'shippingCity', 'shippingDistrict', 'shippingAddress', 'shippingNotes',
  ]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --import tsx --test tests/checkout-form-validation.test.ts`
Expected: FAIL — `Cannot find module '../src/lib/checkout/form-validation'`.

- [ ] **Step 3: Implement**

`src/lib/checkout/form-validation.ts`:
```ts
/** Client-side checks for the checkout form. The server remains the authority. */

export type CheckoutFormData = {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingCity: string;
  shippingDistrict: string;
  shippingAddress: string;
  shippingNotes: string;
};

export type CheckoutFieldErrors = Partial<Record<keyof CheckoutFormData, string>>;

export const CHECKOUT_FIELD_ORDER: (keyof CheckoutFormData)[] = [
  'customerName', 'customerEmail', 'customerPhone',
  'shippingCity', 'shippingDistrict', 'shippingAddress', 'shippingNotes',
];

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MIN_ADDRESS_LENGTH = 10;

/** 5XXXXXXXXX with an optional 0 / 90 / +90 prefix; spaces, dashes and brackets ignored. */
export function isValidTurkishMobile(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  const national = digits.startsWith('90') && digits.length === 12
    ? digits.slice(2)
    : digits.startsWith('0') && digits.length === 11
      ? digits.slice(1)
      : digits;
  return national.length === 10 && national.startsWith('5');
}

export function validateCheckoutForm(data: CheckoutFormData): CheckoutFieldErrors {
  const errors: CheckoutFieldErrors = {};
  const name = data.customerName.trim();
  const email = data.customerEmail.trim();
  const phone = data.customerPhone.trim();

  if (!name) errors.customerName = 'Ad ve soyadınızı girin.';

  if (!email) errors.customerEmail = 'E-posta adresinizi girin.';
  else if (!EMAIL.test(email)) errors.customerEmail = 'Geçerli bir e-posta adresi girin.';

  if (!phone || !isValidTurkishMobile(phone)) {
    errors.customerPhone = 'Cep telefonunuzu 05XX XXX XX XX biçiminde girin.';
  }

  if (!data.shippingCity.trim()) errors.shippingCity = 'Şehir girin.';
  if (!data.shippingDistrict.trim()) errors.shippingDistrict = 'İlçe girin.';

  if (data.shippingAddress.trim().length < MIN_ADDRESS_LENGTH) {
    errors.shippingAddress = 'Mahalle, cadde/sokak ve kapı numarasıyla açık adres girin.';
  }

  return errors;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --import tsx --test tests/checkout-form-validation.test.ts`
Expected: 7 PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/checkout/form-validation.ts tests/checkout-form-validation.test.ts
git commit -m "feat(checkout): client-side form validation with field messages"
```

---

### Task 5: Ödeme sayfası alt bileşenleri

**Files:**
- Create: `src/app/odeme/_components/CheckoutStepper.tsx`, `SavedAddressPicker.tsx`, `CouponForm.tsx`, `PaymentStep.tsx`, `CheckoutSkeleton.tsx`
- Test: `tests/checkout-components.test.tsx`

**Interfaces:**
- Consumes: `Notice` (Task 3).
- Produces:
  - `CheckoutStepper({ current: 1 | 2 | 3 })`
  - `type SavedAddress = { id: string; title: string; recipient?: string | null; phone?: string | null; address: string; district: string; city: string; isDefault?: boolean }`
  - `SavedAddressPicker({ addresses: SavedAddress[]; selectedId: string | null; onSelect: (address: SavedAddress) => void })`
  - `type AppliedCoupon = { code: string; discountType: string; discountValue: number; discountAmount: number; isGiftCard?: boolean; remainingGiftCardBalance?: number }`
  - `CouponForm({ applied: AppliedCoupon | null; error: string | null; loading: boolean; onApply: (code: string) => Promise<boolean>; onRemove: () => void; formatMoney: (n: number) => string })`
  - `PaymentStep({ html: string; isTestMode: boolean; recipient: string; addressLine: string; onEdit: () => void })`
  - `mountProviderContent(host: HTMLElement, html: string): void` (exported from `PaymentStep.tsx`)
  - `CheckoutSkeleton()`

- [ ] **Step 1: Write the failing test**

`tests/checkout-components.test.tsx`:
```tsx
import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import CheckoutStepper from '../src/app/odeme/_components/CheckoutStepper';
import SavedAddressPicker from '../src/app/odeme/_components/SavedAddressPicker';
import CouponForm from '../src/app/odeme/_components/CouponForm';
import PaymentStep, { mountProviderContent } from '../src/app/odeme/_components/PaymentStep';
import CheckoutSkeleton from '../src/app/odeme/_components/CheckoutSkeleton';

const money = (n: number) => `${n} ₺`;

test('stepper marks only the current step', () => {
  const html = renderToStaticMarkup(<CheckoutStepper current={2} />);
  assert.match(html, /<ol class="checkout-stepper" aria-label="Ödeme adımları">/);
  assert.equal((html.match(/aria-current="step"/g) || []).length, 1);
  assert.match(html, /<li class="checkout-step is-done">/);
  assert.match(html, /<li class="checkout-step is-current" aria-current="step">/);
});

test('saved addresses are a keyboard-operable radio group', () => {
  const html = renderToStaticMarkup(
    <SavedAddressPicker
      addresses={[
        { id: 'a1', title: 'Ev', address: 'Cevdet Paşa Cad. 64', district: 'Beşiktaş', city: 'İstanbul' },
        { id: 'a2', title: 'İş', address: 'Tunalı Hilmi Cad. 88', district: 'Çankaya', city: 'Ankara' },
      ]}
      selectedId="a2"
      onSelect={() => {}}
    />,
  );
  assert.match(html, /<fieldset class="choice-group"><legend class="choice-group__legend">Kayıtlı adreslerinizden seçin<\/legend>/);
  assert.equal((html.match(/type="radio"/g) || []).length, 2);
  assert.match(html, /<input type="radio" class="choice-card__input" name="savedAddress" value="a2" checked=""/);
});

test('coupon form labels its input and links its error', () => {
  const html = renderToStaticMarkup(
    <CouponForm applied={null} error="Geçersiz kupon." loading={false} onApply={async () => false} onRemove={() => {}} formatMoney={money} />,
  );
  assert.match(html, /<form class="coupon-form"/);
  assert.match(html, /<label class="field__label" for="couponCode">Kupon veya hediye kartı<\/label>/);
  assert.match(html, /<input[^>]*id="couponCode"[^>]*aria-invalid="true"[^>]*aria-describedby="couponCode-error"/);
  assert.match(html, /<p id="couponCode-error" class="field__error" aria-live="polite">Geçersiz kupon\.<\/p>/);
  assert.match(html, /<button type="submit" class="btn btn--secondary coupon-form__submit"/);
});

test('applied gift card shows balance and a real remove button', () => {
  const html = renderToStaticMarkup(
    <CouponForm
      applied={{ code: 'PND-GC-1', discountType: 'FIXED', discountValue: 500, discountAmount: 500, isGiftCard: true, remainingGiftCardBalance: 250 }}
      error={null} loading={false} onApply={async () => true} onRemove={() => {}} formatMoney={money}
    />,
  );
  assert.match(html, /class="notice notice--success coupon-applied"/);
  assert.match(html, /Kartta kalan bakiye: 250 ₺/);
  assert.match(html, /<button type="button" class="btn btn--link coupon-applied__remove">Kaldır<\/button>/);
});

test('payment step hosts the iyzico responsive form and shows test mode', () => {
  const html = renderToStaticMarkup(
    <PaymentStep html="<script></script>" isTestMode recipient="Aslı Yılmaz" addressLine="Beşiktaş / İstanbul" onEdit={() => {}} />,
  );
  assert.match(html, /<section class="checkout-section payment-step" aria-labelledby="payment-step-title">/);
  assert.match(html, /<h2 id="payment-step-title" tabindex="-1" class="checkout-section-title">2\. Güvenli ödeme<\/h2>/);
  assert.match(html, /Aslı Yılmaz · Beşiktaş \/ İstanbul/);
  assert.match(html, /<button type="button" class="btn btn--link">Bilgileri düzenle<\/button>/);
  assert.match(html, /Test modu — gerçek ödeme alınmaz\./);
  assert.match(html, /<div id="iyzipay-checkout-form" class="responsive"><\/div>/);
});

test('payment step hides the test notice for live payments', () => {
  const html = renderToStaticMarkup(
    <PaymentStep html="" isTestMode={false} recipient="A" addressLine="B" onEdit={() => {}} />,
  );
  assert.doesNotMatch(html, /Test modu/);
});

test('mounting provider content clears the previous iyzico bootstrap and re-creates scripts', () => {
  const created: { attrs: Record<string, string>; text: string }[] = [];
  const oldScript = {
    attributes: [{ name: 'type', value: 'text/javascript' }],
    innerHTML: 'var iyziInit = {token: "tok_2"};',
    parentNode: { replaceChild: (next: unknown) => { created.push(next as never); } },
  };
  const host = {
    innerHTML: '',
    querySelectorAll: () => [oldScript],
  };
  const target = { innerHTML: '<form>old</form>' };
  const fakeDocument = {
    getElementById: (id: string) => (id === 'iyzipay-checkout-form' ? target : null),
    createElement: () => {
      const el = { attrs: {} as Record<string, string>, text: '', setAttribute(n: string, v: string) { el.attrs[n] = v; }, appendChild(node: { text: string }) { el.text = node.text; } };
      return el;
    },
    createTextNode: (text: string) => ({ text }),
  };
  const g = globalThis as Record<string, unknown>;
  const savedDocument = g.document;
  const savedWindow = g.window;
  g.document = fakeDocument;
  g.window = { iyziInit: { token: 'tok_1' } };
  try {
    mountProviderContent(host as unknown as HTMLElement, '<script>var iyziInit = {token: "tok_2"};</script>');
    assert.equal((g.window as Record<string, unknown>).iyziInit, undefined);
    assert.equal(target.innerHTML, '');
    assert.equal(host.innerHTML, '<script>var iyziInit = {token: "tok_2"};</script>');
    assert.equal(created.length, 1);
    assert.deepEqual(created[0].attrs, { type: 'text/javascript' });
    assert.equal(created[0].text, 'var iyziInit = {token: "tok_2"};');
  } finally {
    g.document = savedDocument;
    g.window = savedWindow;
  }
});

test('checkout skeleton announces loading without fake content', () => {
  const html = renderToStaticMarkup(<CheckoutSkeleton />);
  assert.match(html, /role="status"/);
  assert.match(html, /aria-busy="true"/);
  assert.match(html, /<span class="visually-hidden">Ödeme sayfası yükleniyor<\/span>/);
  assert.doesNotMatch(html, /₺/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --import tsx --test tests/checkout-components.test.tsx`
Expected: FAIL — `Cannot find module '../src/app/odeme/_components/CheckoutStepper'`.

- [ ] **Step 3: Implement the components**

`src/app/odeme/_components/CheckoutStepper.tsx`:
```tsx
import React from 'react';

const STEPS = ['İletişim ve adres', 'Güvenli ödeme', 'Sipariş onayı'] as const;

export default function CheckoutStepper({ current }: { current: 1 | 2 | 3 }) {
  return (
    <ol className="checkout-stepper" aria-label="Ödeme adımları">
      {STEPS.map((label, index) => {
        const step = index + 1;
        const state = step === current ? 'is-current' : step < current ? 'is-done' : '';
        return (
          <li
            key={label}
            className={['checkout-step', state].filter(Boolean).join(' ')}
            aria-current={step === current ? 'step' : undefined}
          >
            <span className="checkout-step__index" aria-hidden="true">{step < current ? '✓' : step}</span>
            <span className="checkout-step__label">{label}</span>
          </li>
        );
      })}
    </ol>
  );
}
```

`src/app/odeme/_components/SavedAddressPicker.tsx`:
```tsx
import React from 'react';

export type SavedAddress = {
  id: string;
  title: string;
  recipient?: string | null;
  phone?: string | null;
  address: string;
  district: string;
  city: string;
  isDefault?: boolean;
};

type Props = {
  addresses: SavedAddress[];
  selectedId: string | null;
  onSelect: (address: SavedAddress) => void;
};

export default function SavedAddressPicker({ addresses, selectedId, onSelect }: Props) {
  return (
    <fieldset className="choice-group">
      <legend className="choice-group__legend">Kayıtlı adreslerinizden seçin</legend>
      <div className="choice-group__options">
        {addresses.map((address) => (
          <label key={address.id} className="choice-card">
            <input
              type="radio"
              className="choice-card__input"
              name="savedAddress"
              value={address.id}
              checked={selectedId === address.id}
              onChange={() => onSelect(address)}
            />
            <span className="choice-card__title">
              {address.title}
              <span className="choice-card__check">Seçili</span>
            </span>
            <span className="choice-card__meta">{address.address}</span>
            <span className="choice-card__meta">{address.district} / {address.city}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
```

`src/app/odeme/_components/CouponForm.tsx`:
```tsx
'use client';

import React, { useState } from 'react';
import Notice from '@/components/ui/Notice';

export type AppliedCoupon = {
  code: string;
  discountType: string;
  discountValue: number;
  discountAmount: number;
  isGiftCard?: boolean;
  remainingGiftCardBalance?: number;
};

type Props = {
  applied: AppliedCoupon | null;
  error: string | null;
  loading: boolean;
  onApply: (code: string) => Promise<boolean>;
  onRemove: () => void;
  formatMoney: (n: number) => string;
};

export default function CouponForm({ applied, error, loading, onApply, onRemove, formatMoney }: Props) {
  const [code, setCode] = useState('');

  if (applied) {
    return (
      <Notice tone="success" className="coupon-applied">
        <p>
          <strong>{applied.code}</strong> {applied.isGiftCard ? 'hediye kartı' : 'kuponu'} uygulandı
          {' '}(−{formatMoney(applied.discountAmount)})
        </p>
        {applied.isGiftCard && typeof applied.remainingGiftCardBalance === 'number' ? (
          <p className="coupon-applied__balance">Kartta kalan bakiye: {formatMoney(applied.remainingGiftCardBalance)}</p>
        ) : null}
        <button type="button" className="btn btn--link coupon-applied__remove" onClick={onRemove}>Kaldır</button>
      </Notice>
    );
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = code.trim();
    if (!trimmed || loading) return;
    if (await onApply(trimmed)) setCode('');
  };

  return (
    <form className="coupon-form" onSubmit={submit} noValidate>
      <label className="field__label" htmlFor="couponCode">Kupon veya hediye kartı</label>
      <div className="coupon-form__row">
        <input
          id="couponCode"
          className="field__control coupon-form__input"
          name="couponCode"
          autoComplete="off"
          spellCheck={false}
          placeholder="Örn: PANDIONES10"
          value={code}
          onChange={(event) => setCode(event.target.value.toUpperCase())}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'couponCode-error' : undefined}
        />
        <button type="submit" className="btn btn--secondary coupon-form__submit" disabled={loading || !code.trim()} aria-busy={loading || undefined}>
          Uygula
        </button>
      </div>
      {error ? <p id="couponCode-error" className="field__error" aria-live="polite">{error}</p> : null}
    </form>
  );
}
```

`src/app/odeme/_components/PaymentStep.tsx`:
```tsx
'use client';

import React, { useEffect, useRef } from 'react';
import Notice from '@/components/ui/Notice';

type Props = {
  /** `checkoutFormContent` from iyzico (a bootstrap script) or the dev simulator markup. */
  html: string;
  isTestMode: boolean;
  recipient: string;
  addressLine: string;
  onEdit: () => void;
};

/**
 * Put provider content into `host` and make its scripts run. iyzico's bootstrap skips
 * itself when `window.iyziInit` exists, so a second token (after "Bilgileri düzenle")
 * needs the previous bootstrap and rendered form cleared first.
 */
export function mountProviderContent(host: HTMLElement, html: string): void {
  delete (window as unknown as { iyziInit?: unknown }).iyziInit;
  const target = document.getElementById('iyzipay-checkout-form');
  if (target) target.innerHTML = '';

  host.innerHTML = html;
  host.querySelectorAll('script').forEach((oldScript) => {
    const script = document.createElement('script');
    Array.from(oldScript.attributes).forEach((attr) => script.setAttribute(attr.name, attr.value));
    script.appendChild(document.createTextNode(oldScript.innerHTML));
    oldScript.parentNode?.replaceChild(script, oldScript);
  });
}

export default function PaymentStep({ html, isTestMode, recipient, addressLine, onEdit }: Props) {
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    mountProviderContent(host, html);
    return () => {
      host.innerHTML = '';
    };
  }, [html]);

  return (
    <section className="checkout-section payment-step" aria-labelledby="payment-step-title">
      <h2 id="payment-step-title" ref={headingRef} tabIndex={-1} className="checkout-section-title">2. Güvenli ödeme</h2>
      <div className="payment-step__summary">
        <p>
          <span className="payment-step__label">Teslimat</span>
          {recipient} · {addressLine}
        </p>
        <button type="button" className="btn btn--link" onClick={onEdit}>Bilgileri düzenle</button>
      </div>
      {isTestMode ? (
        <Notice tone="warning" role="status" className="payment-step__notice">
          <p>Test modu — gerçek ödeme alınmaz.</p>
        </Notice>
      ) : null}
      <div id="iyzipay-checkout-form" className="responsive" />
      <div ref={hostRef} className="payment-step__host" />
    </section>
  );
}
```

`src/app/odeme/_components/CheckoutSkeleton.tsx`:
```tsx
import React from 'react';

/** Geometry of the checkout layout while the cart is read from storage. No fake values. */
export default function CheckoutSkeleton() {
  return (
    <div className="checkout-container checkout-skeleton" role="status" aria-busy="true">
      <span className="visually-hidden">Ödeme sayfası yükleniyor</span>
      <div aria-hidden="true">
        <div className="skeleton-block checkout-skeleton__title" />
        <div className="skeleton-block checkout-skeleton__field" />
        <div className="skeleton-block checkout-skeleton__field" />
        <div className="skeleton-block checkout-skeleton__field" />
        <div className="skeleton-block checkout-skeleton__area" />
      </div>
      <div aria-hidden="true" className="skeleton-block checkout-skeleton__summary" />
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --import tsx --test tests/checkout-components.test.tsx`
Expected: 8 PASS.

- [ ] **Step 5: Commit**

```bash
npx tsc --noEmit
git add src/app/odeme/_components tests/checkout-components.test.tsx
git commit -m "feat(checkout): stepper, address picker, coupon form and embedded iyzico payment step"
```

---

### Task 6: Ödeme sayfasını birleştir (iki adımlı akış), sahte aramayı kaldır, stilleri taşı

**Files:**
- Modify: `src/app/odeme/page.tsx` (tamamı yeniden düzenlenir; API çağrıları korunur)
- Modify: `src/styles/pages/checkout.css`, `src/styles/layout/responsive.css`

**Interfaces:**
- Consumes: Task 3 `FormField`, `Notice`, `StatusPanel`; Task 4 `validateCheckoutForm`, `CHECKOUT_FIELD_ORDER`, `CheckoutFormData`, `CheckoutFieldErrors`; Task 5 bileşenleri ve tipleri; `useCart().isLoaded`; `/api/checkout` yanıtındaki `isTestMode` (Task 2).

- [ ] **Step 1: Confirm nobody else changed the file**

Run: `git status --short src/app/odeme/page.tsx`
Expected: boş.

- [ ] **Step 2: Rewrite `src/app/odeme/page.tsx`**

API çağrıları, istek gövdesi, adres ön doldurma ve kupon uç noktası öncekiyle aynıdır. Değişenler: sahte arama kaldırıldı; form doğrulaması; iyzico formu 2. adım olarak gömülü (redirect yalnız `checkoutFormContent` yoksa); `isTestMode`; `isLoaded` iskeleti; `autoComplete`; bileşenler.

```tsx
'use client';

import React, { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import FormField from '@/components/ui/FormField';
import Notice from '@/components/ui/Notice';
import StatusPanel from '@/components/ui/StatusPanel';
import {
  CHECKOUT_FIELD_ORDER,
  validateCheckoutForm,
  type CheckoutFieldErrors,
  type CheckoutFormData,
} from '@/lib/checkout/form-validation';
import CheckoutStepper from './_components/CheckoutStepper';
import SavedAddressPicker, { type SavedAddress } from './_components/SavedAddressPicker';
import CouponForm, { type AppliedCoupon } from './_components/CouponForm';
import PaymentStep from './_components/PaymentStep';
import CheckoutSkeleton from './_components/CheckoutSkeleton';

const money = (n: number) =>
  new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(n);

const EMPTY_FORM: CheckoutFormData = {
  customerName: '',
  customerEmail: '',
  customerPhone: '',
  shippingCity: '',
  shippingDistrict: '',
  shippingAddress: '',
  shippingNotes: '',
};

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { cart, cartTotal, isLoaded } = useCart();
  const { user } = useAuth();

  const [formData, setFormData] = useState<CheckoutFormData>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<CheckoutFieldErrors>({});
  const [dbAddresses, setDbAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);

  const urlError = searchParams.get('error');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(urlError ? decodeURIComponent(urlError) : null);

  const [paymentHtml, setPaymentHtml] = useState<string | null>(null);
  const [isTestMode, setIsTestMode] = useState(false);
  const submitRef = useRef<HTMLButtonElement | null>(null);

  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    setFormData((prev) => ({
      ...prev,
      customerName: prev.customerName || user.name,
      customerEmail: prev.customerEmail || user.email,
      customerPhone: prev.customerPhone || user.phone || '',
    }));

    fetch('/api/auth/addresses')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { addresses?: SavedAddress[] } | null) => {
        const addresses = data?.addresses ?? [];
        if (addresses.length === 0) return;
        setDbAddresses(addresses);
        const def = addresses.find((a) => a.isDefault) || addresses[0];
        setSelectedAddressId(def.id);
        setFormData((prev) => ({
          ...prev,
          customerName: def.recipient || prev.customerName || user.name,
          customerPhone: def.phone || prev.customerPhone || user.phone || '',
          shippingAddress: def.address,
          shippingDistrict: def.district,
          shippingCity: def.city,
        }));
      })
      .catch(() => {});
  }, [user]);

  const handleSelectSavedAddress = (addr: SavedAddress) => {
    setSelectedAddressId(addr.id);
    setFieldErrors({});
    setFormData((prev) => ({
      ...prev,
      customerName: addr.recipient || prev.customerName,
      customerPhone: addr.phone || prev.customerPhone,
      shippingAddress: addr.address,
      shippingDistrict: addr.district,
      shippingCity: addr.city,
    }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const name = e.target.name as keyof CheckoutFormData;
    setFormData((prev) => ({ ...prev, [name]: e.target.value }));
    if (fieldErrors[name]) setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleApplyCoupon = async (code: string): Promise<boolean> => {
    setCouponError(null);
    setCouponLoading(true);
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, subtotal: cartTotal }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCouponError(data.error || 'Geçersiz kupon.');
        setAppliedCoupon(null);
        return false;
      }
      setAppliedCoupon(data);
      return true;
    } catch {
      setCouponError('Kupon doğrulanırken bir hata oluştu. Lütfen tekrar deneyin.');
      return false;
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponError(null);
  };

  const finalTotal = Math.max(0, cartTotal - (appliedCoupon?.discountAmount || 0));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError(null);

    if (cart.length === 0) {
      setError('Çantanızda ürün bulunmamaktadır.');
      return;
    }

    const errors = validateCheckoutForm(formData);
    const firstInvalid = CHECKOUT_FIELD_ORDER.find((field) => errors[field]);
    if (firstInvalid) {
      setFieldErrors(errors);
      document.getElementById(firstInvalid)?.focus();
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, couponCode: appliedCoupon?.code || null, cart }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ödeme oturumu başlatılırken bir hata oluştu.');

      if (data.checkoutFormContent) {
        setIsTestMode(Boolean(data.isTestMode));
        setPaymentHtml(data.checkoutFormContent);
        setLoading(false);
        window.scrollTo({ top: 0 });
        return;
      }

      if (data.paymentPageUrl) {
        window.location.href = data.paymentPageUrl;
        return;
      }

      const tokenQuery = data.guestToken ? `?token=${encodeURIComponent(data.guestToken)}` : '';
      router.push(`/siparis-onay/${data.orderNumber}${tokenQuery}`);
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : 'Bir hata oluştu. Lütfen tekrar deneyin.');
      setLoading(false);
    }
  };

  const editDetails = () => {
    setPaymentHtml(null);
    requestAnimationFrame(() => submitRef.current?.focus());
  };

  if (!isLoaded) return <CheckoutSkeleton />;

  if (cart.length === 0 && !paymentHtml) {
    return (
      <main id="main" className="padded-main">
        <StatusPanel
          icon="◌"
          eyebrow="Pandiones"
          title="Çantanız boş"
          actions={<Link href="/koleksiyon" className="btn btn--primary btn--lg">Koleksiyonu keşfet ↗</Link>}
        >
          <p>Ödeme adımına geçmek için koleksiyondan bir parça seçin.</p>
        </StatusPanel>
      </main>
    );
  }

  const field = (name: keyof CheckoutFormData) => ({
    name,
    value: formData[name],
    onChange: handleChange,
  });

  return (
    <main id="main" className="padded-main">
      <div className="checkout-page">
        <CheckoutStepper current={paymentHtml ? 2 : 1} />

        <div className="checkout-container">
          <div>
            {paymentHtml ? (
              <PaymentStep
                html={paymentHtml}
                isTestMode={isTestMode}
                recipient={formData.customerName}
                addressLine={`${formData.shippingDistrict} / ${formData.shippingCity}`}
                onEdit={editDetails}
              />
            ) : (
              <form onSubmit={handleSubmit} noValidate>
                <section className="checkout-section" aria-labelledby="checkout-contact-title">
                  <h2 id="checkout-contact-title" className="checkout-section-title">1. İletişim bilgileri</h2>
                  <FormField id="customerName" label="Ad soyad" required error={fieldErrors.customerName}>
                    <input {...field('customerName')} autoComplete="name" placeholder="Örn: Aslı Yılmaz" />
                  </FormField>
                  <div className="form-row">
                    <FormField id="customerEmail" label="E-posta adresi" required error={fieldErrors.customerEmail}>
                      <input {...field('customerEmail')} type="email" inputMode="email" autoComplete="email" placeholder="ornek@pandiones.com" />
                    </FormField>
                    <FormField id="customerPhone" label="Cep telefonu" required error={fieldErrors.customerPhone}>
                      <input {...field('customerPhone')} type="tel" inputMode="tel" autoComplete="tel" placeholder="05XX XXX XX XX" />
                    </FormField>
                  </div>
                </section>

                <section className="checkout-section" aria-labelledby="checkout-address-title">
                  <div className="checkout-section-head">
                    <h2 id="checkout-address-title" className="checkout-section-title">Teslimat adresi</h2>
                    {user ? <Link href="/hesabim#adresler" className="btn btn--link">Adreslerimi yönet</Link> : null}
                  </div>

                  {user && dbAddresses.length > 0 ? (
                    <SavedAddressPicker addresses={dbAddresses} selectedId={selectedAddressId} onSelect={handleSelectSavedAddress} />
                  ) : null}

                  <div className="form-row">
                    <FormField id="shippingCity" label="Şehir" required error={fieldErrors.shippingCity}>
                      <input {...field('shippingCity')} autoComplete="address-level1" placeholder="İstanbul" />
                    </FormField>
                    <FormField id="shippingDistrict" label="İlçe" required error={fieldErrors.shippingDistrict}>
                      <input {...field('shippingDistrict')} autoComplete="address-level2" placeholder="Beşiktaş" />
                    </FormField>
                  </div>
                  <FormField id="shippingAddress" label="Açık adres" required hint="Mahalle, cadde/sokak, bina ve daire numarası." error={fieldErrors.shippingAddress}>
                    <textarea {...field('shippingAddress')} rows={3} autoComplete="street-address" />
                  </FormField>
                  <FormField id="shippingNotes" label="Kurye / teslimat notu" optional>
                    <input {...field('shippingNotes')} autoComplete="off" placeholder="Örn: Zili çalmayın, kapıya bırakın." />
                  </FormField>
                </section>

                <Notice className="checkout-payment-info" title="Sonraki adım: iyzico ile güvenli ödeme">
                  <p>Kart bilgilerinizi bir sonraki adımda iyzico'nun güvenli formuna girersiniz; Pandiones kart bilgisi saklamaz. Ödeme bankanızın 3D Secure SMS doğrulamasıyla tamamlanır.</p>
                  <ul className="checkout-cards" aria-label="Desteklenen kartlar">
                    <li className="chip">Troy</li>
                    <li className="chip">Mastercard</li>
                    <li className="chip">Visa</li>
                  </ul>
                </Notice>

                {error ? <div className="form-alert form-alert--error" role="alert">{error}</div> : null}

                <button
                  ref={submitRef}
                  className="btn btn--primary btn--lg btn--block btn--split submit-order-btn"
                  type="submit"
                  disabled={loading}
                  aria-busy={loading || undefined}
                >
                  <span>
                    {loading ? 'Ödeme hazırlanıyor' : finalTotal === 0 ? 'Siparişi onayla ↗' : 'Ödeme adımına geç ↗'}
                  </span>
                  <span>{money(finalTotal)}</span>
                </button>
              </form>
            )}
          </div>

          <aside className="checkout-summary" aria-labelledby="checkout-summary-title">
            <h2 id="checkout-summary-title" className="summary-title">Sipariş özeti</h2>

            <ul className="checkout-items">
              {cart.map((item) => (
                <li key={`${item.slug}-${item.size}`} className="checkout-item">
                  <img src={item.image} alt="" width={65} height={87} />
                  <div>
                    <p className="checkout-item-title">{item.name}</p>
                    <p className="checkout-item-meta">{item.color} · Beden {item.size} × {item.quantity}</p>
                  </div>
                  <span className="price">{money(item.price * item.quantity)}</span>
                </li>
              ))}
            </ul>

            {paymentHtml ? null : (
              <div className="checkout-coupon">
                <CouponForm
                  applied={appliedCoupon}
                  error={couponError}
                  loading={couponLoading}
                  onApply={handleApplyCoupon}
                  onRemove={handleRemoveCoupon}
                  formatMoney={money}
                />
              </div>
            )}

            <dl className="checkout-totals">
              <div className="summary-row"><dt>Ara toplam</dt><dd className="price">{money(cartTotal)}</dd></div>
              {appliedCoupon ? (
                <div className="summary-row summary-row--discount">
                  <dt>İndirim ({appliedCoupon.code})</dt>
                  <dd className="price">−{money(appliedCoupon.discountAmount)}</dd>
                </div>
              ) : null}
              <div className="summary-row"><dt>Sigortalı kurye</dt><dd>Ücretsiz</dd></div>
              <div className="summary-total"><dt>Genel toplam</dt><dd className="price">{money(finalTotal)}</dd></div>
            </dl>

            <p className="checkout-summary-note">Siparişiniz gizli ve mühürlü ambalajla teslim edilir.</p>
          </aside>
        </div>
      </div>
    </main>
  );
}

export default function OdemePage() {
  return (
    <Suspense fallback={<CheckoutSkeleton />}>
      <CheckoutContent />
    </Suspense>
  );
}
```

Notlar:
- Ödeme adımında kupon formu gizlenir: kupon sipariş oluşturulurken sunucuda uygulandı; o adımda değiştirmek yeni sipariş gerektirir ("Bilgileri düzenle" ile dönülür).
- Önceki "BDDK lisanslı / PCI-DSS Seviye 1", "Taksit Seçenekleri" ve "özel siyah lüks kutu" ifadeleri doğrulanmamış ticari iddialar olduğundan (DESIGN.md) sadeleşti — son raporda belirt.

- [ ] **Step 3: Replace checkout styles**

`src/styles/pages/checkout.css` içinde `/* ==================== CHECKOUT PAGE ==================== */` başlığından `/* ==================== ORDER SUCCESS PAGE ==================== */` başlığına kadar olan bölümü şu içerikle değiştir:

```css
/* ==================== CHECKOUT PAGE ==================== */
.checkout-page {
  padding-top: var(--space-8);
}

.checkout-stepper {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--space-4);
  margin: 0 auto var(--space-6);
  padding: 0 var(--site-gutter);
  list-style: none;
}

.checkout-step {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--muted);
  font-size: var(--text-md);
}

.checkout-step + .checkout-step::before {
  content: '';
  width: var(--space-6);
  height: 1px;
  margin-right: var(--space-2);
  background: var(--line);
}

.checkout-step__index {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border: 1px solid var(--line-strong);
  border-radius: var(--radius-round);
  background: var(--paper);
  font-size: var(--text-xs);
  font-variant-numeric: tabular-nums;
}

.checkout-step.is-current,
.checkout-step.is-done {
  color: var(--ink);
  font-weight: var(--weight-semibold);
}

.checkout-step.is-current .checkout-step__index,
.checkout-step.is-done .checkout-step__index {
  border-color: var(--ink);
  background: var(--ink);
  color: var(--paper);
}

.checkout-container {
  max-width: var(--site-max-width);
  margin: 0 auto;
  padding: 0 var(--site-gutter) var(--space-8);
  display: grid;
  grid-template-columns: 1.3fr 0.9fr;
  align-items: start;
  gap: clamp(40px, 5vw, 90px);
}

.checkout-section {
  margin-bottom: var(--space-7);
}

.checkout-section-head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-2);
  margin-bottom: var(--space-5);
  border-bottom: 1px solid var(--line);
}

.checkout-section-title {
  margin: 0 0 var(--space-5);
  padding-bottom: var(--space-4);
  border-bottom: 1px solid var(--line);
  font: var(--weight-regular) var(--text-4xl)/1.2 var(--font-display);
}

.checkout-section-title:focus {
  outline: none;
}

.checkout-section-head .checkout-section-title {
  margin-bottom: 0;
  border-bottom: 0;
}

.checkout-payment-info {
  margin-bottom: var(--space-5);
}

.checkout-payment-info .notice__title {
  color: var(--ink);
}

.checkout-cards {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin: var(--space-3) 0 0;
  padding: var(--space-3) 0 0;
  border-top: 1px solid var(--line);
  list-style: none;
}

.checkout-summary {
  position: sticky;
  top: 110px;
  padding: var(--space-6) var(--space-5);
  background: var(--surface);
}

.summary-title {
  margin: 0 0 var(--space-5);
  padding-bottom: var(--space-3);
  border-bottom: 1px solid var(--line);
  font: var(--weight-regular) var(--text-2xl) var(--font-display);
}

.checkout-items {
  max-height: 350px;
  margin: 0 0 var(--space-5);
  padding: 0;
  overflow-y: auto;
  list-style: none;
}

.checkout-item {
  display: grid;
  grid-template-columns: 65px 1fr auto;
  gap: var(--space-4);
  margin-bottom: var(--space-4);
  padding-bottom: var(--space-4);
  border-bottom: 1px solid var(--ink-a06);
  font-size: var(--text-md);
}

.checkout-item img {
  width: 65px;
  height: auto;
  aspect-ratio: 3 / 4;
}

.checkout-item-title {
  margin: 0 0 var(--space-1);
}

.checkout-item-meta {
  margin: 0;
  color: var(--muted);
  font-size: var(--text-sm);
}

.checkout-coupon {
  margin-bottom: var(--space-5);
  padding-bottom: var(--space-4);
  border-bottom: 1px solid var(--line);
}

.coupon-form {
  display: grid;
  gap: var(--space-2);
}

.coupon-form__row {
  display: flex;
  gap: var(--space-2);
}

.coupon-form__input {
  flex: 1;
  min-width: 0;
  letter-spacing: var(--tracking-wide);
  text-transform: uppercase;
}

.coupon-applied {
  display: grid;
  gap: var(--space-1);
}

.coupon-applied__balance {
  font-size: var(--text-sm);
}

.coupon-applied__remove {
  justify-self: start;
  color: var(--danger);
}

.checkout-totals {
  margin: 0;
}

.checkout-totals dd {
  margin: 0;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: var(--space-3);
  font-size: var(--text-base);
}

.summary-row--discount {
  color: var(--success);
}

.summary-total {
  display: flex;
  justify-content: space-between;
  margin-top: var(--space-5);
  padding-top: var(--space-4);
  border-top: 1px solid var(--line);
  font-size: var(--text-xl);
  font-weight: var(--weight-medium);
}

.checkout-summary-note {
  margin: var(--space-5) 0 0;
  color: var(--muted);
  font-size: var(--text-sm);
  line-height: 1.6;
}

.submit-order-btn {
  margin-top: var(--space-5);
}

.checkout-page .form-alert {
  margin-bottom: var(--space-4);
}

/* Step 2: embedded iyzico checkout form (responsive mode) */
.payment-step__summary {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-2);
  margin-bottom: var(--space-4);
  font-size: var(--text-base);
}

.payment-step__summary p {
  margin: 0;
}

.payment-step__label {
  margin-right: var(--space-2);
  color: var(--muted);
  font-size: var(--text-xs);
  font-weight: var(--weight-medium);
  letter-spacing: var(--tracking-wider);
  text-transform: uppercase;
}

.payment-step__notice {
  margin-bottom: var(--space-4);
}

#iyzipay-checkout-form.responsive {
  min-height: 0;
}

/* Development simulator markup (src/lib/payment/iyzico.ts) */
.payment-simulator {
  display: grid;
  gap: var(--space-3);
  padding: var(--space-5);
  border: 1px dashed var(--warning);
  border-radius: var(--radius-sm);
  background: var(--paper);
}

.payment-simulator p {
  margin: 0;
}

.payment-simulator__title {
  color: var(--warning);
  font-size: var(--text-xs);
  font-weight: var(--weight-semibold);
  letter-spacing: var(--tracking-wider);
  text-transform: uppercase;
}

.payment-simulator__text {
  color: var(--muted);
  font-size: var(--text-md);
  line-height: 1.6;
}

.payment-simulator__amount {
  font-size: var(--text-base);
}

/* Loading skeleton */
.skeleton-block {
  border-radius: var(--radius-sm);
  background: var(--surface);
}

.checkout-skeleton {
  padding-top: calc(var(--space-8) + var(--space-9));
}

.checkout-skeleton__title { height: 36px; width: 60%; margin-bottom: var(--space-5); }
.checkout-skeleton__field { height: 48px; margin-bottom: var(--space-4); }
.checkout-skeleton__area { height: 96px; }
.checkout-skeleton__summary { min-height: 360px; }
```

`src/styles/layout/responsive.css` içindeki `.checkout-container { grid-template-columns: 1fr; padding-top: 90px; ... }` kuralından `padding-top: 90px;` satırını sil (üst boşluk artık `.checkout-page`'de).

- [ ] **Step 4: Type check, tests**

Run: `npx tsc --noEmit && npm test`
Expected: tsc temiz; yalnız bilinen 2 `collection-category` hatası.

- [ ] **Step 5: Browser verification (dev-isolated, port 3001)**

375×812 ve 1440×900'de:
1. Sepet doluyken `/odeme`'yi yenile: önce iskelet, sonra form; "Çantanız boş" flaşı yok. Sepet boşken: "Çantanız boş" paneli.
2. Formu boş gönder → odak "Ad soyad"a gider; her zorunlu alan altında hata; `document.querySelectorAll('[aria-invalid="true"]').length` ≥ 6.
3. Telefonu `053212345` → telefon hatası; `05321234567` → hata kalkar.
4. Kupon `YANLIS` + Enter → alan altında hata; buton beklemede iken `aria-busy="true"`.
5. Geçerli form gönder → adım göstergesi 2'ye geçer, "2. Güvenli ödeme" başlığı odaklı (`document.activeElement.id === 'payment-step-title'`), "Test modu — gerçek ödeme alınmaz." görünür, `#iyzipay-checkout-form.responsive` sayfada; anahtar yoksa simülatör kutusu (kesikli çerçeve) görünür.
6. "Bilgileri düzenle" → form geri gelir, alanlar dolu, odak gönder düğmesinde. Tekrar gönder → 2. adım yeniden çizilir.
7. Simülatörde "Başarılı ödemeyi simüle et" → `/siparis-onay/<no>` (Task 7'de incelenir).
8. `document.documentElement.scrollWidth - innerWidth === 0`.
9. `.env`'de iyzico Sandbox anahtarları (kullanıcı tarafından) tanımlıysa: 5. adımda iyzico'nun responsive formu `#iyzipay-checkout-form` içinde çizilmeli; sandbox test kartı ve SMS `123456` ile ödeme tamamlanmalı; 6. adımdaki ikinci deneme de formu çizmeli. Anahtar yoksa bu adımı "anahtar olmadığı için doğrulanmadı" diye raporla.

- [ ] **Step 6: Commit**

```bash
git add src/app/odeme/page.tsx src/styles/pages/checkout.css src/styles/layout/responsive.css
git commit -m "feat(checkout): two-step checkout with embedded iyzico form, validation and visible test mode"
```

---

### Task 7: Sipariş onay sayfası

**Files:**
- Modify: `src/app/siparis-onay/[id]/page.tsx`
- Modify: `src/app/siparis-onay/[id]/OrderPrintButton.tsx`
- Modify: `src/styles/pages/checkout.css` (ORDER SUCCESS bölümü)
- Test: `tests/payment-display.test.ts` (Task 3'te yazıldı; burada kullanılır)

**Interfaces:**
- Consumes: `StatusPanel`, `Notice`, `describeOrderPayment` (Task 3).

- [ ] **Step 1: Confirm nobody else changed the files**

Run: `git status --short "src/app/siparis-onay"`
Expected: boş.

- [ ] **Step 2: Rewrite `OrderPrintButton.tsx`**

```tsx
'use client';

import React from 'react';

export default function OrderPrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="btn btn--secondary btn--sm print-hide">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
        <path d="M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6" />
        <rect width="12" height="8" x="6" y="14" rx="1" />
      </svg>
      <span>Makbuzu yazdır</span>
    </button>
  );
}
```

- [ ] **Step 3: Rewrite the page's render branches**

Veri erişimi ve yetki kısmı (satır 1–47: import'lar, `prisma.order.findFirst`, `notFound`, `getCurrentUser`, `isAdmin/isOwner/isVerifiedGuest`) ve `isPaymentConfirmed` hesabı aynen kalır. Import'lara ekle:
```tsx
import StatusPanel from '@/components/ui/StatusPanel';
import Notice from '@/components/ui/Notice';
import { describeOrderPayment } from '@/lib/payment/payment-display';
```

Yetkisiz dal:
```tsx
  if (!isAdmin && !isOwner && !isVerifiedGuest) {
    return (
      <main id="main" className="padded-main">
        <StatusPanel
          icon="🔒"
          eyebrow="Pandiones"
          title="Erişim yetkisi gerekli"
          actions={
            <>
              <Link href={`/giris-yap?redirect=${encodeURIComponent(`/siparis-onay/${order.orderNumber}`)}`} className="btn btn--primary btn--lg">Giriş yap</Link>
              <Link href="/koleksiyon" className="btn btn--secondary btn--lg">Koleksiyona dön</Link>
            </>
          }
        >
          <p>Bu siparişin teslimat bilgilerini görmek için siparişi veren hesapla giriş yapın veya e-postanızdaki sipariş bağlantısını kullanın.</p>
        </StatusPanel>
      </main>
    );
  }
```

Bekleyen/başarısız dal:
```tsx
  if (!isPaymentConfirmed) {
    const isFailed = order.status === 'ODEME_BASARISIZ';
    return (
      <main id="main" className="padded-main">
        <StatusPanel
          tone={isFailed ? 'danger' : 'warning'}
          icon={isFailed ? '✕' : '…'}
          eyebrow={`Sipariş ${order.orderNumber}`}
          title={isFailed ? 'Ödeme onaylanamadı' : 'Ödeme bekleniyor'}
          actions={
            <>
              <Link href="/odeme" className="btn btn--primary btn--lg">{isFailed ? 'Ödemeyi tekrar dene' : 'Ödeme adımına git'}</Link>
              <Link href="/siparis-takip" className="btn btn--secondary btn--lg">Sipariş durumunu sorgula</Link>
            </>
          }
        >
          <p>
            {isFailed
              ? 'Bankanızdan ödeme onayı alınamadı. Kart bilgilerinizi kontrol edip tekrar deneyin; çantanızdaki ürünler korunur.'
              : 'Ödeme doğrulaması henüz tamamlanmadı. Birkaç dakika sonra sipariş durumunu sorgulayabilir veya ödeme adımına dönebilirsiniz.'}
          </p>
        </StatusPanel>
      </main>
    );
  }
```

Önce `/siparis-takip` rotasının var olduğunu doğrula: `ls src/app/siparis-takip/page.tsx`.

Başarı dalı (`latestTransaction` ve `money` tanımlarından sonra):
```tsx
  const paymentKind = describeOrderPayment(order.totalAmount, latestTransaction);
  const addressLine = `${order.shippingAddress}, ${order.shippingDistrict} / ${order.shippingCity}`;
  const mapsQuery = encodeURIComponent(`${order.shippingAddress}, ${order.shippingDistrict}, ${order.shippingCity}`);
  const statusLabel =
    order.status === 'KARGODA' ? 'Kargoya verildi' : order.status === 'TESLIM_EDILDI' ? 'Teslim edildi' : 'Ödeme onaylandı';

  return (
    <main id="main" className="padded-main">
      <OrderSuccessClearCart />
      <div className="order-success-page">
        <span className="order-success-seal" aria-hidden="true">✓</span>
        <p className="status-panel__eyebrow">Pandiones</p>
        <h1>Siparişiniz alındı</h1>
        <p className="order-success-desc">
          Teşekkür ederiz{order.customerName ? `, ${order.customerName}` : ''}. Siparişiniz onaylandı ve hazırlanmaya başladı.
        </p>

        <article className="order-receipt-box" aria-labelledby="order-receipt-title">
          <h2 id="order-receipt-title" className="visually-hidden">Sipariş makbuzu</h2>
          <dl className="receipt-header">
            <div><dt>Sipariş no</dt><dd>{order.orderNumber}</dd></div>
            <div><dt>Durum</dt><dd>{statusLabel}</dd></div>
          </dl>

          {paymentKind === 'test' ? (
            <Notice tone="warning" title="Test ödemesi">
              <p>Bu sipariş test modunda oluşturuldu; gerçek tahsilat yapılmadı.</p>
            </Notice>
          ) : paymentKind === 'card' ? (
            <Notice tone="success" title="iyzico 3D Secure ile ödendi">
              {latestTransaction?.lastFourDigits ? (
                <p>
                  {latestTransaction.cardFamily || latestTransaction.cardAssociation || 'Kart'} ···· {latestTransaction.lastFourDigits}
                  {latestTransaction.installment > 1 ? ` · ${latestTransaction.installment} taksit` : ' · Tek çekim'}
                </p>
              ) : null}
            </Notice>
          ) : paymentKind === 'no-charge' ? (
            <Notice title="Ödeme gerekmedi"><p>Tutarın tamamı kupon veya hediye kartıyla karşılandı.</p></Notice>
          ) : null}

          {order.trackingCode ? (
            <Notice title="Kargo bilgisi">
              <p>{order.trackingCompany || 'Kargo firması'} · Takip no: <code>{order.trackingCode}</code></p>
            </Notice>
          ) : null}

          <section className="order-receipt__section" aria-labelledby="order-delivery-title">
            <div className="order-receipt__section-head">
              <h3 id="order-delivery-title" className="order-receipt__heading">Teslimat bilgileri</h3>
              <div className="order-receipt__links print-hide">
                <a href={`https://www.google.com/maps/dir/?api=1&destination=${mapsQuery}`} target="_blank" rel="noopener noreferrer" className="btn btn--link">Yol tarifi ↗</a>
                <a href={`https://www.google.com/maps/search/?api=1&query=${mapsQuery}`} target="_blank" rel="noopener noreferrer" className="btn btn--link">Haritada gör ↗</a>
              </div>
            </div>
            <p className="order-receipt__strong">{order.customerName}{order.customerPhone ? ` · ${order.customerPhone}` : ''}</p>
            <p className="order-receipt__text">{addressLine}</p>
          </section>

          {order.items && order.items.length > 0 ? (
            <section className="order-receipt__section" aria-labelledby="order-items-title">
              <h3 id="order-items-title" className="order-receipt__heading">Satın alınan parçalar</h3>
              <ul className="order-items">
                {order.items.map((item) => (
                  <li key={item.id} className="order-item">
                    <span>
                      <span className="order-product-name">{item.productName}</span>{' '}
                      <span className="order-item__meta">Beden {item.size} × {item.quantity}</span>
                    </span>
                    <span className="price">{money(item.price * item.quantity)}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <div className="order-total">
            <span>Ödenen tutar</span>
            <span className="price">{typeof order.totalAmount === 'number' ? money(order.totalAmount) : '—'}</span>
          </div>

          <div className="order-receipt__footer print-hide">
            <p className="order-receipt__note">Sigortalı kurye ile teslimat</p>
            <OrderPrintButton />
          </div>
        </article>

        <Link href="/koleksiyon" className="btn btn--primary btn--lg print-hide">Koleksiyonu keşfetmeye devam et ↗</Link>
      </div>
    </main>
  );
```
Eski satır içi `<style>{`@media print ...`}</style>` bloğunu sil (Task 3'te `base.css`'e taşındı). Eski "Sigortalı VIP Kurye Teslimatı (2-3 İş Günü)" metnindeki süre vaadi doğrulanmamış olduğundan sadeleşti — son raporda belirt.

- [ ] **Step 4: Replace order success styles**

`src/styles/pages/checkout.css` içinde `/* ==================== ORDER SUCCESS PAGE ==================== */` başlığından dosya sonuna kadar olan bölümü şu içerikle değiştir:

```css
/* ==================== ORDER SUCCESS PAGE ==================== */
.order-success-page {
  display: grid;
  justify-items: center;
  max-width: min(920px, 94vw);
  margin: 0 auto;
  padding: var(--space-9) 5% var(--space-9);
  text-align: center;
}

.order-success-seal {
  display: grid;
  place-items: center;
  width: 70px;
  height: 70px;
  margin-bottom: var(--space-5);
  border: 1px solid var(--ink);
  border-radius: var(--radius-round);
  font-size: var(--text-3xl);
}

.order-success-page h1 {
  margin: var(--space-2) 0 var(--space-4);
  font: var(--weight-regular) var(--text-fluid-xl)/1.1 var(--font-display);
}

.order-success-desc {
  max-width: 52ch;
  margin: 0 0 var(--space-7);
  color: var(--muted);
  font-size: var(--text-lg);
  line-height: 1.7;
}

.order-receipt-box {
  display: grid;
  gap: var(--space-4);
  width: 100%;
  margin-bottom: var(--space-7);
  padding: var(--space-6);
  background: var(--surface);
  text-align: left;
}

.receipt-header {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: var(--space-3);
  margin: 0;
  padding-bottom: var(--space-4);
  border-bottom: 1px solid var(--line);
}

.receipt-header dt {
  color: var(--muted);
  font-size: var(--text-xs);
  font-weight: var(--weight-medium);
  letter-spacing: var(--tracking-wider);
  text-transform: uppercase;
}

.receipt-header dd {
  margin: var(--space-1) 0 0;
  font-weight: var(--weight-semibold);
}

.order-receipt__section {
  padding: var(--space-4) var(--space-5);
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  background: var(--paper);
}

.order-receipt__section-head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
}

.order-receipt__heading {
  margin: 0 0 var(--space-3);
  color: var(--muted);
  font-size: var(--text-xs);
  font-weight: var(--weight-semibold);
  letter-spacing: var(--tracking-wider);
  text-transform: uppercase;
}

.order-receipt__section-head .order-receipt__heading {
  margin: 0;
}

.order-receipt__links {
  display: flex;
  gap: var(--space-4);
}

.order-receipt__strong {
  margin: 0 0 var(--space-1);
  font-size: var(--text-base);
  font-weight: var(--weight-semibold);
}

.order-receipt__text {
  margin: 0;
  font-size: var(--text-md);
  line-height: 1.5;
}

.order-items {
  display: grid;
  gap: var(--space-2);
  margin: 0;
  padding: 0;
  list-style: none;
}

.order-item {
  display: flex;
  justify-content: space-between;
  gap: var(--space-3);
  font-size: var(--text-md);
}

.order-item__meta {
  color: var(--muted);
}

.order-total {
  display: flex;
  justify-content: space-between;
  padding-top: var(--space-4);
  border-top: 1px solid var(--line);
  font-size: var(--text-lg);
  font-weight: var(--weight-medium);
}

.order-receipt__footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding-top: var(--space-4);
  border-top: 1px solid var(--line);
}

.order-receipt__note {
  margin: 0;
  color: var(--muted);
  font-size: var(--text-sm);
}

@media print {
  .order-receipt-box {
    border: 1px solid var(--line-strong);
    box-shadow: none;
  }
}
```

- [ ] **Step 5: Type check and tests**

Run: `npx tsc --noEmit && npm test`
Expected: tsc temiz; yalnız bilinen 2 hata.

- [ ] **Step 6: Browser verification (dev-isolated)**

1. Task 6 adım 7'de oluşan siparişin onay sayfası (misafir token'lı URL): "Test ödemesi" uyarısı görünür, "Banka onaylı" yazmaz.
2. Aynı sayfa token'sız (`/siparis-onay/<no>`) ve oturumsuz → "Erişim yetkisi gerekli"; "Giriş yap" linki `?redirect=%2Fsiparis-onay%2F<no>` taşır.
3. Geçersiz no `/siparis-onay/YOK-123` → 404.
4. Ödeme adımında "Bilgileri düzenle" ile bırakılan (PENDING) siparişin token'lı URL'i → "Ödeme bekleniyor" paneli, iki eylem.
5. Yazdırma önizlemesi: `document.querySelectorAll('.print-hide')` elemanlarının `@media print` altında gizlendiğini `window.matchMedia` yerine Chrome yazdırma emülasyonu olmadan doğrulamak mümkün değilse, `getComputedStyle` ile kuralın varlığını `document.styleSheets` üzerinde ara ve raporda "yazdırma elle doğrulanmadı" de.
6. 375 ve 1440'ta yatay taşma yok.

- [ ] **Step 7: Commit**

```bash
git add "src/app/siparis-onay/[id]" src/styles/pages/checkout.css
git commit -m "feat(orders): status panels, honest payment summary and design-system receipt"
```

---

### Task 8: Belgeler ve son doğrulama

**Files:**
- Modify: `DESIGN.md` (Bileşen sözleşmesi tablosu), `docs/QA.md`

- [ ] **Step 1: DESIGN.md bileşen tablosuna satırlar ekle**

`| Form alanı (\`.field\`) | ...` satırından sonra:
```markdown
| Durum paneli (`StatusPanel`, `.status-panel`) | `components/ui/StatusPanel.tsx`. Yetkisiz, bekliyor, başarısız, boş sayfa durumları: ikon (dekoratif), eyebrow, `h1`/`h2` başlık, açıklama, eylem satırı. Tonlar `--success/--warning/--danger` |
| Bilgi kutusu (`Notice`, `.notice`) | `components/ui/Notice.tsx`. `info/success/warning/danger`; yalnız kullanıcının eylem yapması gereken hatada `role="alert"`, bekleyen durum için `role="status"`. Test modu uyarısı `warning` tonudur |
| Seçim kartı (`.choice-card`) | `fieldset.choice-group` + `legend` içinde gizli radyo girdili `label`; seçili durumda mürekkep halka, klavye odağında focus halkası |
| Çip (`.chip`) | Kısa etiket/rozet (kart ağı, durum); bilgi yalnız renkle verilmez |
```

- [ ] **Step 2: docs/QA.md'ye sunucu doğrulama açığını ekle**

Önce `grep -n "e-posta\|telefon" docs/QA.md` ile mevcut bir madde olup olmadığını kontrol et. Yoksa "mevcut açıklar" listesinin sonuna ekle:
```markdown
- [ ] `/api/checkout` e-posta ve telefon biçimini sunucuda doğrulamıyor (yalnız boş alan kontrolü var). İstemci doğrulaması (`src/lib/checkout/form-validation.ts`) eklendi; sunucu kuralı aynı ölçütle eklenmeli.
- [ ] iyzico isteğinde sabitler: alıcı `identityNumber` yoksa `11111111110`, `ip` her zaman `85.105.10.10`. Canlıdan önce gerçek istemci IP'si (istek başlığından) gönderilmeli ve kimlik numarası politikası iyzico ile netleştirilmeli.
- [ ] iyzico `retrieve` yanıtındaki `signature` doğrulanmıyor; SDK'nın `calculateHmacSHA256Signature` yardımcısıyla doğrulama eklenmeli.
```

README'de ödeme paragrafına ("Ödeme için `IYZICO_API_KEY` ...") şu cümleleri ekle:
```markdown
İstemci resmi `iyzipay` SDK'sını kullanır. Geliştirme ve test için iyzico Sandbox hesabının `sandbox-` anahtarları kullanılır (SMS şifresi `123456`); `IYZICO_BASE_URL` sandbox iken ödeme adımında "Test modu" bandı görünür. Anahtar yoksa ve ortam üretim değilse yalnız geliştirme simülatörü açılır.
```

- [ ] **Step 3: Full verification**

```bash
npx tsc --noEmit
npm test
PANDIONES_LAN_PREVIEW=1 npx next build
```
Expected: tsc temiz; testlerde yalnız bilinen 2 hata; build başarılı. Ardından `grep -c "style={{" src/app/odeme/page.tsx "src/app/siparis-onay/[id]/page.tsx" "src/app/siparis-onay/[id]/OrderPrintButton.tsx"` → üçü de `0`.

- [ ] **Step 4: Commit**

```bash
git add DESIGN.md docs/QA.md README.md
git commit -m "docs: document status, notice and selection primitives; track checkout server validation gap"
```
