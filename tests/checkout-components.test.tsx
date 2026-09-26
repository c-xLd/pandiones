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
  assert.match(html, /<input type="radio" class="choice-card__input" name="savedAddress" checked="" value="a2"\/>/);
  assert.match(html, /<input type="radio" class="choice-card__input" name="savedAddress" value="a1"\/>/);
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
