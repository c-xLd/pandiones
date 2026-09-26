import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import AuthForm from '../src/app/giris-yap/_components/AuthForm';

const noop = async () => null;

test('login mode is a labelled tab with sign-in autocomplete', () => {
  const html = renderToStaticMarkup(<AuthForm mode="login" onModeChange={() => {}} onSubmit={noop} />);
  assert.match(html, /<div class="auth-tabs" role="tablist" aria-label="Giriş veya kayıt">/);
  assert.match(html, /<button type="button" role="tab" id="auth-tab-login" aria-selected="true" aria-controls="auth-panel" class="auth-tab is-active">Giriş yap<\/button>/);
  assert.match(html, /<form id="auth-panel" role="tabpanel" aria-labelledby="auth-tab-login" class="auth-form" novalidate="">/i);
  assert.match(html, /<input[^>]*name="email"[^>]*autoComplete="email"|<input[^>]*autocomplete="email"/i);
  assert.match(html, /autocomplete="current-password"/i);
  assert.doesNotMatch(html, /name="name"|name="phone"/);
  assert.doesNotMatch(html, /HIZLI TEST|Admin123|admin@pandiones/);
  assert.match(html, /<button type="submit" class="btn btn--primary btn--lg btn--block auth-submit">Giriş yap<\/button>/);
});

test('register mode shows the password rule before submit and optional phone', () => {
  const html = renderToStaticMarkup(<AuthForm mode="register" onModeChange={() => {}} onSubmit={noop} />);
  assert.match(html, /aria-selected="true"[^>]*class="auth-tab is-active">Üye ol<\/button>/);
  assert.match(html, /autocomplete="name"/i);
  assert.match(html, /autocomplete="new-password"/i);
  assert.match(html, /<p id="authPassword-hint" class="field__hint">En az 6 karakter\.<\/p>/);
  assert.match(html, /<span class="field__optional">isteğe bağlı<\/span>/);
  assert.match(html, /autocomplete="tel"/i);
});

test('password visibility is a real toggle button', () => {
  const html = renderToStaticMarkup(<AuthForm mode="login" onModeChange={() => {}} onSubmit={noop} />);
  assert.match(html, /<button type="button" class="btn btn--link auth-reveal" aria-pressed="false" aria-controls="authPassword">Şifreyi göster<\/button>/);
});
