# Faz 2 · Dilim 1 — Ödeme ve Sipariş Onayı Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/odeme` ve `/siparis-onay/[id]` sayfalarını tasarım sistemine taşımak, sahte adres aramasını kaldırmak, test ödeme modunu görünür kılmak ve eksik form/durum/erişilebilirlik davranışlarını tamamlamak.

**Architecture:** Yeniden kullanılabilir üç UI parçası (`FormField`, `StatusPanel`, `Notice`) ve iki saf yardımcı (`validateCheckoutForm`, `describeOrderPayment`) eklenir. Ödeme sayfası `src/app/odeme/_components/` altındaki odaklı bileşenlere bölünür; iş mantığı (API çağrıları, 3DS HTML enjeksiyonu, sepet) değişmez. Stiller yalnız token kullanır.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, düz CSS (`src/styles`), `node --test` + `tsx`, `react-dom/server` ile markup testleri.

**Spec:** `docs/superpowers/specs/2026-09-26-design-phase-2-pages-design.md`

## Global Constraints

- İş mantığı değişmez: API uçları, istek gövdeleri, sunucu doğrulaması, yetki kontrolleri, 3DS HTML'inin script'leri yeniden çalıştırma mantığı aynı kalır.
- Stil dosyalarında yalnız token: `tests/design-tokens.test.ts` geçmeli (hex/rgb yok, `font-size` yalnız `var(--text-*)`, `letter-spacing` yalnız `var(--tracking-*)`, `font-weight` yalnız `var(--weight-*)`, px radius yok, gölge yalnız `var(--shadow-*)`, 20+ z-index yalnız `var(--z-*)`).
- Yeni CSS dosyaları `src/app/globals.css` import listesine eklenir; `globals.css` yalnız `@import` satırı içerir.
- Sahte adres araması tamamen kaldırılır: `GOOGLE_PLACES_CATALOG`, arama kutusu, açılır liste, "powered by Google".
- Test modu: checkout API `isMock: true` döndürdüğünde sayfada ve 3DS modalında metin: **"Test modu — gerçek ödeme alınmaz."**
- Kargo takip numarası tıklanabilir görünmez (gerçek taşıyıcı linki yok).
- Giriş bağlantısı `?redirect=/siparis-onay/<id>` taşır; giriş sayfası parametreyi Dilim 2'de destekleyecek.
- Metinler Türkçe; butonlar `.btn` primitifi; formlar `.field` primitifi.
- Her görev sonunda `npx tsc --noEmit` ve `npm test` çalışır. Bilinen, bu işten bağımsız 2 hata: `tests/collection-category.test.tsx` içindeki iki test (kategori navigasyonu SSR'da yok). Bunlar dışında yeni hata kabul edilmez.
- Build yalıtılmış klasörde alınır (paralel süreç `.next` kullanıyor): `PANDIONES_LAN_PREVIEW=1 npx next build`. Tarayıcı kontrolü `.claude/launch.json` içindeki `dev-isolated` sunucusuyla (port 3001).

## Review Focus

- **Sepet henüz localStorage'dan okunmamışken** ödeme sayfası "Çantanız Boş" göstermemeli; iskelet göstermeli (Task 4, `isLoaded` testi yok → tarayıcı adımı ile doğrulanır; `CheckoutSkeleton` markup testi Task 3'te).
- **Telefon `+90 5xx`, `05xx`, `5xx` ve boşluklu/tireli biçimleri** geçerli sayılmalı; 9 haneli veya `4` ile başlayan numara reddedilmeli (Task 2 testleri).
- **Yalnız boşluk içeren alanlar** boş sayılmalı (Task 2 testi).
- **3DS modalında Escape ve Tab** odağı panel içinde tutmalı, kapanınca odak gönder düğmesine dönmeli (Task 3 markup testi + Task 4 tarayıcı adımı).
- **Tutarı 0 olan sipariş** (hediye kartı tamamı karşıladı) onay sayfasında "kartla ödendi" dememeli (Task 1 `describeOrderPayment` testi).

---

## File Structure

| Dosya | Sorumluluk |
| --- | --- |
| `src/components/ui/FormField.tsx` (yeni) | Etiket + kontrol + ipucu + hata; `aria-invalid`/`aria-describedby` bağlantısı |
| `src/components/ui/StatusPanel.tsx` (yeni) | Ortalanmış durum ekranı (ikon, eyebrow, başlık, açıklama, eylemler) |
| `src/components/ui/Notice.tsx` (yeni) | Bilgi/başarı/uyarı/hata kutusu |
| `src/styles/components/status.css` (yeni) | `.status-panel`, `.notice` |
| `src/styles/components/selection.css` (yeni) | `.choice-group`, `.choice-card`, `.chip` |
| `src/styles/components/form.css` (değişir) | `.field__optional` |
| `src/styles/base/base.css` (değişir) | `.visually-hidden`, `.print-hide` ve `@media print` |
| `src/lib/checkout/form-validation.ts` (yeni) | Ödeme formu istemci doğrulaması (saf) |
| `src/lib/payment/payment-display.ts` (yeni) | Sipariş ödeme özetinin türü (test / kart / ücretsiz / bilinmiyor) |
| `src/app/odeme/_components/CheckoutStepper.tsx` (yeni) | Adım göstergesi |
| `src/app/odeme/_components/SavedAddressPicker.tsx` (yeni) | Kayıtlı adres radyo grubu |
| `src/app/odeme/_components/CouponForm.tsx` (yeni) | Kupon/hediye kartı formu |
| `src/app/odeme/_components/PaymentDialog.tsx` (yeni) | 3DS modal kabuğu: dialog semantiği, odak, Escape, script yeniden çalıştırma |
| `src/app/odeme/_components/CheckoutSkeleton.tsx` (yeni) | Yükleme iskeleti |
| `src/app/odeme/page.tsx` (değişir) | Bileşenleri birleştirir; doğrulama, test modu, iskelet |
| `src/styles/pages/checkout.css` (değişir) | Ödeme ve onay sayfası sınıfları |
| `src/app/siparis-onay/[id]/page.tsx` (değişir) | StatusPanel, Notice, sınıflar |
| `src/app/siparis-onay/[id]/OrderPrintButton.tsx` (değişir) | `.btn` |
| `tests/ui-primitives.test.tsx`, `tests/checkout-form-validation.test.ts`, `tests/payment-display.test.ts`, `tests/checkout-components.test.tsx` (yeni) | Testler |
| `DESIGN.md`, `docs/QA.md` (değişir) | Yeni primitifler; sunucu doğrulama açığı |

---

### Task 1: Paylaşılan UI primitifleri ve ödeme gösterimi yardımcısı

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

### Task 2: Ödeme formu istemci doğrulaması

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

### Task 3: Ödeme sayfası alt bileşenleri

**Files:**
- Create: `src/app/odeme/_components/CheckoutStepper.tsx`, `SavedAddressPicker.tsx`, `CouponForm.tsx`, `PaymentDialog.tsx`, `CheckoutSkeleton.tsx`
- Test: `tests/checkout-components.test.tsx`

**Interfaces:**
- Consumes: `Notice` (Task 1).
- Produces:
  - `CheckoutStepper({ current: 1 | 2 | 3 })`
  - `type SavedAddress = { id: string; title: string; recipient?: string | null; phone?: string | null; address: string; district: string; city: string; isDefault?: boolean }`
  - `SavedAddressPicker({ addresses: SavedAddress[]; selectedId: string | null; onSelect: (address: SavedAddress) => void })`
  - `type AppliedCoupon = { code: string; discountType: string; discountValue: number; discountAmount: number; isGiftCard?: boolean; remainingGiftCardBalance?: number }`
  - `CouponForm({ applied: AppliedCoupon | null; error: string | null; loading: boolean; onApply: (code: string) => Promise<boolean>; onRemove: () => void; formatMoney: (n: number) => string })`
  - `PaymentDialog({ html: string; isTestMode: boolean; onClose: () => void })`
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
import PaymentDialog from '../src/app/odeme/_components/PaymentDialog';
import CheckoutSkeleton from '../src/app/odeme/_components/CheckoutSkeleton';

const money = (n: number) => `${n} ₺`;

test('stepper marks only the current step', () => {
  const html = renderToStaticMarkup(<CheckoutStepper current={1} />);
  assert.match(html, /<ol class="checkout-stepper" aria-label="Ödeme adımları">/);
  assert.equal((html.match(/aria-current="step"/g) || []).length, 1);
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

test('payment dialog is a labelled modal and shows test mode', () => {
  const html = renderToStaticMarkup(<PaymentDialog html="<form></form>" isTestMode onClose={() => {}} />);
  assert.match(html, /role="dialog"/);
  assert.match(html, /aria-modal="true"/);
  assert.match(html, /aria-labelledby="payment-dialog-title"/);
  assert.match(html, /<h2 id="payment-dialog-title"/);
  assert.match(html, /Test modu — gerçek ödeme alınmaz\./);
  assert.match(html, /<button type="button" class="btn btn--icon btn--ghost payment-dialog__close" aria-label="Ödeme penceresini kapat">/);
});

test('payment dialog hides the test notice for real payments', () => {
  const html = renderToStaticMarkup(<PaymentDialog html="<form></form>" isTestMode={false} onClose={() => {}} />);
  assert.doesNotMatch(html, /Test modu/);
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
            <span className="checkout-step__index" aria-hidden="true">{step}</span>
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

`src/app/odeme/_components/PaymentDialog.tsx`:
```tsx
'use client';

import React, { useEffect, useRef } from 'react';
import Notice from '@/components/ui/Notice';

type Props = {
  /** Provider-supplied checkout form HTML. Its scripts are re-executed after mount. */
  html: string;
  isTestMode: boolean;
  onClose: () => void;
};

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])';

export default function PaymentDialog({ html, isTestMode, onClose }: Props) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Provider scripts do not run from innerHTML; clone them so the browser executes them.
  useEffect(() => {
    const container = contentRef.current;
    if (!container) return;
    container.querySelectorAll('script').forEach((oldScript) => {
      const script = document.createElement('script');
      Array.from(oldScript.attributes).forEach((attr) => script.setAttribute(attr.name, attr.value));
      script.appendChild(document.createTextNode(oldScript.innerHTML));
      oldScript.parentNode?.replaceChild(script, oldScript);
    });
  }, [html]);

  // Focus containment, Escape, background scroll lock, focus return.
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const previous = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panel.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusables = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (focusables.length === 0) {
        event.preventDefault();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === panel)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      previous?.focus();
    };
  }, []);

  return (
    <div className="payment-dialog">
      <div
        ref={panelRef}
        className="payment-dialog__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-dialog-title"
        aria-describedby="payment-dialog-desc"
        tabIndex={-1}
      >
        <button type="button" className="btn btn--icon btn--ghost payment-dialog__close" aria-label="Ödeme penceresini kapat" onClick={() => onCloseRef.current()}>
          <span aria-hidden="true">✕</span>
        </button>
        <header className="payment-dialog__header">
          <p className="status-panel__eyebrow">Pandiones</p>
          <h2 id="payment-dialog-title" className="payment-dialog__title">Güvenli 3D Secure doğrulama</h2>
          <p id="payment-dialog-desc" className="payment-dialog__desc">Bankanızın güvenlik adımını bu pencerede tamamlayın.</p>
        </header>
        {isTestMode ? (
          <Notice tone="warning" role="status" className="payment-dialog__notice">
            <p>Test modu — gerçek ödeme alınmaz.</p>
          </Notice>
        ) : null}
        <div ref={contentRef} className="payment-dialog__content" dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </div>
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
Expected: 7 PASS.

- [ ] **Step 5: Commit**

```bash
npx tsc --noEmit
git add src/app/odeme/_components tests/checkout-components.test.tsx
git commit -m "feat(checkout): accessible stepper, address picker, coupon form and payment dialog"
```

---

### Task 4: Ödeme sayfasını birleştir, sahte aramayı kaldır, stilleri taşı

**Files:**
- Modify: `src/app/odeme/page.tsx` (tamamı yeniden düzenlenir; iş mantığı korunur)
- Modify: `src/styles/pages/checkout.css`

**Interfaces:**
- Consumes: Task 1 `FormField`, `Notice`; Task 2 `validateCheckoutForm`, `CHECKOUT_FIELD_ORDER`, `CheckoutFormData`, `CheckoutFieldErrors`; Task 3 bütün bileşenler ve `SavedAddress`, `AppliedCoupon` tipleri; `useCart().isLoaded`.

- [ ] **Step 1: Confirm nobody else changed the file**

Run: `git status --short src/app/odeme/page.tsx`
Expected: boş çıktı (yalnız checkpoint'teki sürüm). Çıktı varsa dur ve kullanıcıya sor.

- [ ] **Step 2: Rewrite `src/app/odeme/page.tsx`**

Aşağıdaki sürüm; API çağrıları, istek gövdesi, 3DS akışı, adres ön doldurma ve kupon uç noktası öncekiyle aynıdır. Değişenler: sahte arama kaldırıldı, bileşenler kullanıldı, doğrulama, `isMock`, `isLoaded` iskeleti, `autoComplete`.

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
import PaymentDialog from './_components/PaymentDialog';
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

      if (data.paymentPageUrl) {
        window.location.href = data.paymentPageUrl;
        return;
      }

      if (data.checkoutFormContent) {
        setIsTestMode(Boolean(data.isMock));
        setPaymentHtml(data.checkoutFormContent);
        setLoading(false);
      } else {
        const tokenQuery = data.guestToken ? `?token=${encodeURIComponent(data.guestToken)}` : '';
        router.push(`/siparis-onay/${data.orderNumber}${tokenQuery}`);
      }
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : 'Bir hata oluştu. Lütfen tekrar deneyin.');
      setLoading(false);
    }
  };

  const closePaymentDialog = () => {
    setPaymentHtml(null);
    submitRef.current?.focus();
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
      {paymentHtml ? <PaymentDialog html={paymentHtml} isTestMode={isTestMode} onClose={closePaymentDialog} /> : null}

      <div className="checkout-page">
        <CheckoutStepper current={paymentHtml ? 2 : 1} />

        <div className="checkout-container">
          <div>
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
                  <h2 id="checkout-address-title" className="checkout-section-title">2. Teslimat adresi</h2>
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

              <section className="checkout-section" aria-labelledby="checkout-payment-title">
                <h2 id="checkout-payment-title" className="checkout-section-title">3. Güvenli ödeme</h2>
                <Notice className="checkout-payment-info" title="iyzico ve 3D Secure ile ödeme">
                  <p>Kart bilgileriniz Pandiones'ta saklanmaz. Ödeme, bankanızın gönderdiği SMS şifresiyle doğrulanır.</p>
                  <ul className="checkout-cards" aria-label="Desteklenen kartlar">
                    <li className="chip">Troy</li>
                    <li className="chip">Mastercard</li>
                    <li className="chip">Visa</li>
                  </ul>
                </Notice>
              </section>

              {error ? (
                <div className="form-alert form-alert--error" role="alert">{error}</div>
              ) : null}

              <button
                ref={submitRef}
                className="btn btn--primary btn--lg btn--block btn--split submit-order-btn"
                type="submit"
                disabled={loading}
                aria-busy={loading || undefined}
              >
                <span>
                  {loading ? 'Ödeme oturumu hazırlanıyor' : finalTotal === 0 ? 'Siparişi onayla ↗' : '3D Secure ile öde ↗'}
                </span>
                <span>{money(finalTotal)}</span>
              </button>
            </form>
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

Not: Önceki metindeki "BDDK lisanslı ve PCI-DSS Seviye 1 sertifikalı" ve "Taksit Seçenekleri" ifadeleri doğrulanmamış ticari iddialar olduğu için (DESIGN.md: "doğrulanmadan kesin vaat olarak yazılmaz") sade bir açıklamaya indirildi; "özel siyah lüks kutu" notu da "gizli ve mühürlü ambalaj" olarak sadeleşti. Kullanıcı gerçek iddiaları doğrularsa geri eklenebilir — son raporda belirt.

- [ ] **Step 3: Replace checkout styles**

`src/styles/pages/checkout.css` içindeki `/* ==================== CHECKOUT PAGE ==================== */` başlığından `/* ==================== ORDER SUCCESS PAGE ==================== */` başlığına kadar olan bölümü şu içerikle değiştir (onay sayfası bölümüne Task 5'te dokunulur):

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

.checkout-step.is-current .checkout-step__index {
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

.checkout-section-head .checkout-section-title {
  margin-bottom: 0;
  border-bottom: 0;
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

/* Payment dialog (3D Secure) */
.payment-dialog {
  position: fixed;
  inset: 0;
  z-index: var(--z-dialog);
  display: grid;
  place-items: center;
  padding: var(--space-5);
  background: var(--scrim);
  animation: fadeInSheetBackdrop var(--dur-base) var(--ease-out);
}

.payment-dialog__panel {
  position: relative;
  width: 100%;
  max-width: 540px;
  max-height: 90vh;
  overflow-y: auto;
  padding: var(--space-6) var(--space-5);
  border-radius: var(--radius-sm);
  background: var(--paper);
  box-shadow: var(--shadow-overlay);
}

.payment-dialog__panel:focus {
  outline: none;
}

.payment-dialog__close {
  position: absolute;
  top: var(--space-3);
  right: var(--space-3);
}

.payment-dialog__header {
  margin-bottom: var(--space-5);
  text-align: center;
}

.payment-dialog__title {
  margin: var(--space-1) 0;
  font: var(--weight-regular) var(--text-3xl) var(--font-display);
}

.payment-dialog__desc {
  margin: 0;
  color: var(--muted);
  font-size: var(--text-sm);
}

.payment-dialog__notice {
  margin-bottom: var(--space-4);
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

@media (prefers-reduced-motion: reduce) {
  .payment-dialog { animation: none; }
}
```

Önce `fadeInSheetBackdrop` animasyonunun var olduğunu doğrula: `grep -rn "@keyframes fadeInSheetBackdrop" src/styles` — yoksa `.payment-dialog` içindeki `animation` satırını kaldır.

`src/styles/layout/responsive.css` içindeki `.checkout-container { grid-template-columns: 1fr; padding-top: 90px; ... }` kuralında `padding-top: 90px;` satırını sil (üst boşluk artık `.checkout-page`'de).

- [ ] **Step 4: Type check, tests, token guard**

Run: `npx tsc --noEmit && npm test`
Expected: tsc temiz; testlerde yalnız bilinen 2 `collection-category` hatası.

- [ ] **Step 5: Browser verification (dev-isolated, port 3001)**

`.claude/launch.json` → `dev-isolated` ile başlat. 375×812 ve 1440×900'de:
1. Boş sepet: `/odeme` → iskelet kısa süre, sonra "Çantanız boş" paneli; yüklemede boş panel flaşı yok (sayfayı sepet doluyken yenile ve iskeletten sonra formun geldiğini gör).
2. Sepete bir ürün ekle (ürün sayfasından beden seç + "Çantaya Ekle").
3. Formu boş gönder → ilk alana (Ad soyad) odak; her alan altında hata; `aria-invalid="true"` (JS ile kontrol et).
4. Telefonu `053212345` yaz → telefon hatası; `05321234567` yaz → hata kalkar.
5. Geçersiz kupon `YANLIS` + Enter → alan altında hata; butonda bekleme.
6. Geçerli form gönder → 3DS dialog açılır; "Test modu — gerçek ödeme alınmaz." görünür; Tab odağı panel içinde döner; Escape kapatır ve odak "3D Secure ile öde" düğmesine döner.
7. Tekrar gönder ve simülatörde öde → `/siparis-onay/<no>` açılır (Task 5'te incelenecek).
8. `document.documentElement.scrollWidth - innerWidth === 0` (yatay taşma yok).

- [ ] **Step 6: Commit**

```bash
git add src/app/odeme/page.tsx src/styles/pages/checkout.css src/styles/layout/responsive.css
git commit -m "feat(checkout): design-system checkout, visible test mode, remove simulated address search"
```

---

### Task 5: Sipariş onay sayfası

**Files:**
- Modify: `src/app/siparis-onay/[id]/page.tsx`
- Modify: `src/app/siparis-onay/[id]/OrderPrintButton.tsx`
- Modify: `src/styles/pages/checkout.css` (ORDER SUCCESS bölümü)
- Test: `tests/payment-display.test.ts` (Task 1'de yazıldı; burada kullanılır)

**Interfaces:**
- Consumes: `StatusPanel`, `Notice`, `describeOrderPayment` (Task 1).

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
Eski satır içi `<style>{`@media print ...`}</style>` bloğunu sil (Task 1'de `base.css`'e taşındı). Eski "Sigortalı VIP Kurye Teslimatı (2-3 İş Günü)" metnindeki süre vaadi doğrulanmamış olduğundan sadeleşti — son raporda belirt.

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

1. Task 4 adım 7'de oluşan siparişin onay sayfası (misafir token'lı URL): "Test ödemesi" uyarısı görünür, "Banka onaylı" yazmaz.
2. Aynı sayfa token'sız (`/siparis-onay/<no>`) ve oturumsuz → "Erişim yetkisi gerekli"; "Giriş yap" linki `?redirect=%2Fsiparis-onay%2F<no>` taşır.
3. Geçersiz no `/siparis-onay/YOK-123` → 404.
4. Ödeme dialogunu kapatıp bırakılan (PENDING) siparişin token'lı URL'i → "Ödeme bekleniyor" paneli, iki eylem.
5. Yazdırma önizlemesi: `document.querySelectorAll('.print-hide')` elemanlarının `@media print` altında gizlendiğini `window.matchMedia` yerine Chrome yazdırma emülasyonu olmadan doğrulamak mümkün değilse, `getComputedStyle` ile kuralın varlığını `document.styleSheets` üzerinde ara ve raporda "yazdırma elle doğrulanmadı" de.
6. 375 ve 1440'ta yatay taşma yok.

- [ ] **Step 7: Commit**

```bash
git add "src/app/siparis-onay/[id]" src/styles/pages/checkout.css
git commit -m "feat(orders): status panels, honest payment summary and design-system receipt"
```

---

### Task 6: Belgeler ve son doğrulama

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
git add DESIGN.md docs/QA.md
git commit -m "docs: document status, notice and selection primitives; track checkout server validation gap"
```
