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
