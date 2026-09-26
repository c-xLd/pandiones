# Faz 2 · Dilim 2a — Giriş sayfası Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/giris-yap` sayfasını tasarım sistemine taşımak, görünür test şifrelerini kaldırmak, güvenli `?redirect=` desteği eklemek ve form durumlarını (alan hatası, sunucu hatası, bekleme, zaten oturum açık) tamamlamak.

**Architecture:** Saf yardımcılar `safeRedirectPath` (açık yönlendirme koruması) ve `validateAuthForm` test edilir. Form mantığı ve işaretlemesi `src/app/giris-yap/_components/AuthForm.tsx` bileşenine taşınır (context'siz, props ile; markup testi yazılabilir). Sayfa yalnız `useAuth`, `useRouter`, `useSearchParams` bağlantısını ve yönlendirmeyi yapar. Stiller `src/styles/pages/auth.css`.

**Tech Stack:** Next.js 15, React 19, TypeScript, düz CSS token'ları, `node --test` + `tsx`, `react-dom/server`.

**Spec:** `docs/superpowers/specs/2026-09-26-design-phase-2-pages-design.md` (Dilim 2, 2a); sayfa sözleşmesi `docs/pages/ACCOUNT.md` (Giriş).

## Global Constraints

- Auth API ve `AuthContext` (`login`, `register`) değişmez. Sunucu kuralı: kayıt şifresi en az 6 karakter (`src/app/api/auth/register/route.ts:19`); istemci aynı kuralı kullanır, daha sıkı değil.
- `?redirect=` yalnız `/` ile başlayan, `//` veya `/\` ile başlamayan, boşluk/kontrol karakteri içermeyen site içi yol kabul eder; aksi halde varsayılan hedef: ADMIN → `/yonetim`, diğerleri → `/hesabim`. Geçerli `redirect` her iki rol için de önceliklidir.
- "HIZLI TEST HESAPLARI" bloğu ve `fillQuickLogin` tamamen kaldırılır (kullanıcı kararı).
- Oturum açık kullanıcı formda kalmaz: yönlendirme render sırasında değil `useEffect` içinde; auth yüklenirken form gösterilmez (iskelet/status).
- Ağ hatasında alanlar korunur; hata `.form-alert--error` + `role="alert"`; gönderim `aria-busy` ve çift gönderim engeli.
- Yalnız token'lı CSS (`tests/design-tokens.test.ts`). Yeni CSS `globals.css` import listesine.
- Görev sonu: `npx tsc --noEmit`, `npm test` yeşil. Build yalıtılmış worktree'de (`../pandiones-verify`, bkz. ledger Task 1 ruling) alınır; çalışma kopyasındaki yabancı dosyalar build'i bozabilir.
- Commit'ler yalnız açık dosya yollarıyla (`git add <yol>`); paralel çalışmanın dosyalarına dokunulmaz.

## Review Focus

- **`redirect=https://evil.test`, `//evil.test`, `/\evil.test`, `/%09/evil`, `javascript:`**: hepsi varsayılana düşmeli (Task 1 testleri).
- **`redirect=/siparis-onay/PND-1?token=abc`**: sorgu dizesiyle birlikte korunmalı (Task 1 testi).
- **Kayıtta 5 karakterli şifre**: istemci alan hatası vermeli, istek gitmemeli (Task 1 testi + Task 2 tarayıcı adımı).
- **Sekme değişince eski hata** görünmemeli (Task 2 markup/tarayıcı).
- **Auth yüklenirken** form parlayıp kaybolmamalı (Task 2 tarayıcı adımı).

---

### Task 1: Güvenli yönlendirme ve form doğrulaması

**Files:**
- Create: `src/lib/auth/safe-redirect.ts`, `src/lib/auth/form-validation.ts`
- Test: `tests/auth-form-helpers.test.ts`

**Interfaces:**
- Produces:
  - `safeRedirectPath(raw: string | null | undefined): string | null` — geçerliyse yolu, değilse `null`.
  - `defaultPathForRole(role: string | undefined): '/yonetim' | '/hesabim'`
  - `type AuthMode = 'login' | 'register'`
  - `type AuthFormValues = { name: string; email: string; password: string; phone: string }`
  - `type AuthFieldErrors = Partial<Record<keyof AuthFormValues, string>>`
  - `validateAuthForm(mode: AuthMode, values: AuthFormValues): AuthFieldErrors`
  - `AUTH_FIELD_ORDER: (keyof AuthFormValues)[]` = `['name', 'email', 'password', 'phone']`
  - `MIN_PASSWORD_LENGTH = 6`

- [ ] **Step 1: Write the failing test** — `tests/auth-form-helpers.test.ts`:

```ts
import assert from 'node:assert/strict';
import test from 'node:test';
import { defaultPathForRole, safeRedirectPath } from '../src/lib/auth/safe-redirect';
import { AUTH_FIELD_ORDER, MIN_PASSWORD_LENGTH, validateAuthForm } from '../src/lib/auth/form-validation';

test('same-site paths are allowed, including query strings', () => {
  assert.equal(safeRedirectPath('/hesabim#siparisler'), '/hesabim#siparisler');
  assert.equal(safeRedirectPath('/siparis-onay/PND-1?token=abc'), '/siparis-onay/PND-1?token=abc');
});

test('anything that could leave the site is rejected', () => {
  for (const raw of ['https://evil.test', '//evil.test', '/\\evil.test', '/\t/evil.test', ' /hesabim', 'javascript:alert(1)', 'hesabim', '', null, undefined]) {
    assert.equal(safeRedirectPath(raw), null, String(raw));
  }
});

test('default destination depends on role', () => {
  assert.equal(defaultPathForRole('ADMIN'), '/yonetim');
  assert.equal(defaultPathForRole('CUSTOMER'), '/hesabim');
  assert.equal(defaultPathForRole(undefined), '/hesabim');
});

const empty = { name: '', email: '', password: '', phone: '' };

test('login needs a valid email and a password', () => {
  assert.deepEqual(validateAuthForm('login', empty), {
    email: 'E-posta adresinizi girin.',
    password: 'Şifrenizi girin.',
  });
  assert.equal(validateAuthForm('login', { ...empty, email: 'asli@', password: 'x' }).email, 'Geçerli bir e-posta adresi girin.');
  assert.deepEqual(validateAuthForm('login', { ...empty, email: 'asli@example.com', password: 'x' }), {}, 'login does not enforce length');
});

test('register enforces the server password rule and optional valid phone', () => {
  const base = { name: 'Aslı Yılmaz', email: 'asli@example.com', password: '123456', phone: '' };
  assert.deepEqual(validateAuthForm('register', base), {});
  assert.equal(MIN_PASSWORD_LENGTH, 6);
  assert.equal(validateAuthForm('register', { ...base, password: '12345' }).password, 'Şifre en az 6 karakter olmalı.');
  assert.equal(validateAuthForm('register', { ...base, name: '  ' }).name, 'Ad ve soyadınızı girin.');
  assert.equal(validateAuthForm('register', { ...base, phone: '0532' }).phone, 'Cep telefonunuzu 05XX XXX XX XX biçiminde girin.');
  assert.deepEqual(validateAuthForm('register', { ...base, phone: '0532 123 45 67' }), {});
});

test('field order follows the form', () => {
  assert.deepEqual(AUTH_FIELD_ORDER, ['name', 'email', 'password', 'phone']);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --import tsx --test tests/auth-form-helpers.test.ts`
Expected: FAIL — `Cannot find module '../src/lib/auth/safe-redirect'`.

- [ ] **Step 3: Implement**

`src/lib/auth/safe-redirect.ts`:
```ts
/** Only same-site absolute paths; anything that a browser could read as another origin is refused. */
export function safeRedirectPath(raw: string | null | undefined): string | null {
  if (!raw) return null;
  if (!raw.startsWith('/')) return null;
  if (raw.startsWith('//') || raw.startsWith('/\\')) return null;
  // Browsers drop tabs/newlines and treat backslashes like slashes; refuse them anywhere.
  if (/[\s\\]/.test(raw) || /[\u0000-\u001f\u007f]/.test(raw)) return null;
  return raw;
}

export function defaultPathForRole(role: string | undefined): '/yonetim' | '/hesabim' {
  return role === 'ADMIN' ? '/yonetim' : '/hesabim';
}
```

`src/lib/auth/form-validation.ts`:
```ts
import { isValidTurkishMobile } from '@/lib/checkout/form-validation';

export type AuthMode = 'login' | 'register';
export type AuthFormValues = { name: string; email: string; password: string; phone: string };
export type AuthFieldErrors = Partial<Record<keyof AuthFormValues, string>>;

/** Mirrors src/app/api/auth/register/route.ts. */
export const MIN_PASSWORD_LENGTH = 6;
export const AUTH_FIELD_ORDER: (keyof AuthFormValues)[] = ['name', 'email', 'password', 'phone'];

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateAuthForm(mode: AuthMode, values: AuthFormValues): AuthFieldErrors {
  const errors: AuthFieldErrors = {};
  const email = values.email.trim();

  if (mode === 'register' && !values.name.trim()) errors.name = 'Ad ve soyadınızı girin.';

  if (!email) errors.email = 'E-posta adresinizi girin.';
  else if (!EMAIL.test(email)) errors.email = 'Geçerli bir e-posta adresi girin.';

  if (!values.password) errors.password = 'Şifrenizi girin.';
  else if (mode === 'register' && values.password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `Şifre en az ${MIN_PASSWORD_LENGTH} karakter olmalı.`;
  }

  if (mode === 'register' && values.phone.trim() && !isValidTurkishMobile(values.phone)) {
    errors.phone = 'Cep telefonunuzu 05XX XXX XX XX biçiminde girin.';
  }

  return errors;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `node --import tsx --test tests/auth-form-helpers.test.ts`
Expected: 6 PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth/safe-redirect.ts src/lib/auth/form-validation.ts tests/auth-form-helpers.test.ts
git commit -m "feat(auth): safe redirect paths and login/register validation"
```

---

### Task 2: AuthForm bileşeni ve giriş sayfası

**Files:**
- Create: `src/app/giris-yap/_components/AuthForm.tsx`, `src/styles/pages/auth.css`
- Modify: `src/app/giris-yap/page.tsx` (tamamen), `src/app/globals.css` (import)
- Test: `tests/auth-form.test.tsx`

**Interfaces:**
- Consumes: Task 1 (`validateAuthForm`, `AUTH_FIELD_ORDER`, `MIN_PASSWORD_LENGTH`, tipler, `safeRedirectPath`, `defaultPathForRole`); `FormField` (`src/components/ui/FormField.tsx`); `useAuth().{user, loading, login, register}`.
- Produces: `AuthForm({ mode: AuthMode; onModeChange: (mode: AuthMode) => void; onSubmit: (mode: AuthMode, values: AuthFormValues) => Promise<string | null> })` — `onSubmit` hata metni ya da başarıda `null` döner.

- [ ] **Step 1: Write the failing test** — `tests/auth-form.test.tsx`:

```tsx
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
  assert.match(html, /<form id="auth-panel" role="tabpanel" aria-labelledby="auth-tab-login" class="auth-form" novalidate="">/);
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
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --import tsx --test tests/auth-form.test.tsx`
Expected: FAIL — `Cannot find module '../src/app/giris-yap/_components/AuthForm'`.

- [ ] **Step 3: Implement `AuthForm.tsx`**

```tsx
'use client';

import React, { useState } from 'react';
import FormField from '@/components/ui/FormField';
import {
  AUTH_FIELD_ORDER,
  MIN_PASSWORD_LENGTH,
  validateAuthForm,
  type AuthFieldErrors,
  type AuthFormValues,
  type AuthMode,
} from '@/lib/auth/form-validation';

type Props = {
  mode: AuthMode;
  onModeChange: (mode: AuthMode) => void;
  /** Resolves to an error message, or null on success (the page navigates away). */
  onSubmit: (mode: AuthMode, values: AuthFormValues) => Promise<string | null>;
};

const FIELD_IDS: Record<keyof AuthFormValues, string> = {
  name: 'authName',
  email: 'authEmail',
  password: 'authPassword',
  phone: 'authPhone',
};

export default function AuthForm({ mode, onModeChange, onSubmit }: Props) {
  const [values, setValues] = useState<AuthFormValues>({ name: '', email: '', password: '', phone: '' });
  const [errors, setErrors] = useState<AuthFieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const isLogin = mode === 'login';

  const switchMode = (next: AuthMode) => {
    if (next === mode) return;
    setErrors({});
    setServerError(null);
    onModeChange(next);
  };

  const update = (field: keyof AuthFormValues) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setValues((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    setServerError(null);

    const found = validateAuthForm(mode, values);
    const first = AUTH_FIELD_ORDER.find((field) => found[field]);
    if (first) {
      setErrors(found);
      document.getElementById(FIELD_IDS[first])?.focus();
      return;
    }

    setSubmitting(true);
    const message = await onSubmit(mode, values);
    if (message) {
      setServerError(message);
      setSubmitting(false);
    }
  };

  const tab = (value: AuthMode, label: string) => (
    <button
      type="button"
      role="tab"
      id={`auth-tab-${value}`}
      aria-selected={mode === value}
      aria-controls="auth-panel"
      className={mode === value ? 'auth-tab is-active' : 'auth-tab'}
      onClick={() => switchMode(value)}
    >
      {label}
    </button>
  );

  return (
    <>
      <div className="auth-tabs" role="tablist" aria-label="Giriş veya kayıt">
        {tab('login', 'Giriş yap')}
        {tab('register', 'Üye ol')}
      </div>

      <form id="auth-panel" role="tabpanel" aria-labelledby={`auth-tab-${mode}`} className="auth-form" onSubmit={submit} noValidate>
        {!isLogin ? (
          <FormField id="authName" label="Ad soyad" required error={errors.name}>
            <input name="name" autoComplete="name" value={values.name} onChange={update('name')} />
          </FormField>
        ) : null}

        <FormField id="authEmail" label="E-posta adresi" required error={errors.email}>
          <input name="email" type="email" inputMode="email" autoComplete="email" placeholder="ornek@pandiones.com" value={values.email} onChange={update('email')} />
        </FormField>

        <FormField
          id="authPassword"
          label="Şifre"
          required
          hint={isLogin ? undefined : `En az ${MIN_PASSWORD_LENGTH} karakter.`}
          error={errors.password}
        >
          <input
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete={isLogin ? 'current-password' : 'new-password'}
            value={values.password}
            onChange={update('password')}
          />
        </FormField>
        <button
          type="button"
          className="btn btn--link auth-reveal"
          aria-pressed={showPassword}
          aria-controls="authPassword"
          onClick={() => setShowPassword((v) => !v)}
        >
          {showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
        </button>

        {!isLogin ? (
          <FormField id="authPhone" label="Cep telefonu" optional error={errors.phone}>
            <input name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="05XX XXX XX XX" value={values.phone} onChange={update('phone')} />
          </FormField>
        ) : null}

        {serverError ? <div className="form-alert form-alert--error" role="alert">{serverError}</div> : null}

        <button type="submit" className="btn btn--primary btn--lg btn--block auth-submit" disabled={submitting} aria-busy={submitting || undefined}>
          {submitting ? (isLogin ? 'Giriş yapılıyor' : 'Hesap oluşturuluyor') : isLogin ? 'Giriş yap' : 'Hesabı oluştur'}
        </button>
      </form>
    </>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `node --import tsx --test tests/auth-form.test.tsx`
Expected: 3 PASS. (Not: `autocomplete` React tarafından küçük harfle `autocomplete` olarak basılır; testler `i` bayrağıyla eşleşir.)

- [ ] **Step 5: Rewrite `src/app/giris-yap/page.tsx`**

```tsx
'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { defaultPathForRole, safeRedirectPath } from '@/lib/auth/safe-redirect';
import type { AuthFormValues, AuthMode } from '@/lib/auth/form-validation';
import AuthForm from './_components/AuthForm';

function AuthLoading() {
  return (
    <div className="auth-page" role="status" aria-busy="true">
      <span className="visually-hidden">Oturum bilgisi kontrol ediliyor</span>
      <div className="skeleton-block auth-skeleton" aria-hidden="true" />
    </div>
  );
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading, login, register } = useAuth();
  const [mode, setMode] = useState<AuthMode>('login');
  const redirectTo = safeRedirectPath(searchParams.get('redirect'));

  useEffect(() => {
    if (!loading && user) router.replace(redirectTo ?? defaultPathForRole(user.role));
  }, [loading, user, redirectTo, router]);

  if (loading || user) return <AuthLoading />;

  const handleSubmit = async (submitMode: AuthMode, values: AuthFormValues): Promise<string | null> => {
    const res = submitMode === 'login'
      ? await login(values.email.trim(), values.password)
      : await register(values.name.trim(), values.email.trim(), values.password, values.phone.trim() || undefined);
    if (!res.success) {
      return res.error || (submitMode === 'login' ? 'Giriş yapılamadı. Lütfen tekrar deneyin.' : 'Kayıt tamamlanamadı. Lütfen tekrar deneyin.');
    }
    return null; // the effect above navigates once `user` is set
  };

  return (
    <div className="auth-page">
      <p className="status-panel__eyebrow">Pandiones</p>
      <h1 className="auth-title">{mode === 'login' ? 'Hoş geldiniz' : 'Hesap oluşturun'}</h1>
      <AuthForm mode={mode} onModeChange={setMode} onSubmit={handleSubmit} />
    </div>
  );
}

export default function GirisYapPage() {
  return (
    <main id="main" className="padded-main">
      <Suspense fallback={<AuthLoading />}>
        <LoginContent />
      </Suspense>
    </main>
  );
}
```

Önce `login`/`register` imzalarını ve dönüş tipini doğrula: `grep -n "const login\|const register\|success" src/context/AuthContext.tsx`. `register(name, email, password, phone?)` ve `{ success: boolean; error?: string }` bekleniyor; farklıysa çağrıyı gerçek imzaya uydur ve ledger'a ruling yaz. Başarıdan sonra `user` güncellenmiyorsa (context `refreshUser` gerektiriyorsa) `handleSubmit` başarıda doğrudan `router.replace(redirectTo ?? defaultPathForRole(<dönen rol>))` yapar — bunu kodu okuyarak karar ver ve ledger'a yaz.

- [ ] **Step 6: Styles** — `src/styles/pages/auth.css`:

```css
/* Login / register page */
.auth-page {
  display: grid;
  gap: var(--space-2);
  max-width: 480px;
  margin: var(--space-8) auto var(--space-9);
  padding: 0 var(--space-5);
}

.auth-page > .status-panel__eyebrow {
  text-align: center;
}

.auth-title {
  margin: 0 0 var(--space-5);
  font: var(--weight-regular) var(--text-fluid-xl)/1.1 var(--font-display);
  letter-spacing: var(--tracking-tight);
  text-align: center;
}

.auth-tabs {
  display: flex;
  margin-bottom: var(--space-6);
  border-bottom: 1px solid var(--line);
}

.auth-tab {
  flex: 1;
  min-height: 48px;
  margin-bottom: -1px;
  border-bottom: 2px solid transparent;
  color: var(--muted);
  font-size: var(--text-base);
  transition: color var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out);
}

.auth-tab.is-active {
  border-bottom-color: var(--ink);
  color: var(--ink);
  font-weight: var(--weight-medium);
}

.auth-tab:focus-visible {
  outline: 2px solid var(--focus);
  outline-offset: -2px;
}

.auth-form {
  display: grid;
}

.auth-reveal {
  justify-self: end;
  margin: calc(var(--space-4) * -1) 0 var(--space-4);
  font-size: var(--text-xs);
}

.auth-form .form-alert {
  margin-bottom: var(--space-4);
}

.auth-submit {
  margin-top: var(--space-3);
}

.auth-skeleton {
  height: 420px;
}

.skeleton-block {
  border-radius: var(--radius-sm);
  background: var(--surface);
}
```

`src/app/globals.css` içinde `@import '../styles/pages/checkout.css';` satırından sonra ekle: `@import '../styles/pages/auth.css';`

Not: `.skeleton-block` Dilim 1 Task 6'da checkout.css'e de eklenecekti (ertelendi); tanım burada ortak kalır, Task 6 devam ettiğinde checkout.css'teki kopya eklenmez.

- [ ] **Step 7: Type check and tests**

Run: `npx tsc --noEmit && npm test`
Expected: tsc temiz, tüm testler yeşil.

- [ ] **Step 8: Browser verification (dev-isolated, port 3001)**

375 ve 1440 genişlikte:
1. `/giris-yap`: "HIZLI TEST" yok; sekmeler klavyeyle (Tab + Enter) değişir; `aria-selected` doğru.
2. Boş gönder → e-posta alanına odak, alan hataları; `[aria-invalid="true"]` sayısı ≥ 2.
3. "Üye ol": şifre ipucu "En az 6 karakter." görünür; `12345` → alan hatası, ağ isteği yok (`read_network_requests` ile `/api/auth/register` isteği olmadığını doğrula).
4. Yanlış şifreyle giriş → `role="alert"` sunucu mesajı; alanlar dolu kalır.
5. Seed müşteri hesabıyla (yerel dev DB; kimlik bilgisini yazmadan, `prisma/seed.ts` içinden okunur) `?redirect=/hesabim%23profil` ile giriş → `/hesabim#profil`.
6. `?redirect=//example.com` ile giriş → `/hesabim` (dış siteye gitmez).
7. Oturum açıkken `/giris-yap` → form görünmeden yönlendirilir.
8. Oturumu kapat (hesabım → çıkış) ve durumu eski haline getir.
9. Yatay taşma yok.

- [ ] **Step 9: Commit**

```bash
git add src/app/giris-yap src/styles/pages/auth.css src/app/globals.css tests/auth-form.test.tsx
git commit -m "feat(auth): accessible login/register form, safe redirect, remove visible test credentials"
```

---

### Task 3: Giriş bağlantılarına dönüş adresi ve belgeler

**Files:**
- Modify: `src/components/layout/Header.tsx` (hesap bağlantısı), `docs/pages/ACCOUNT.md`, `docs/QA.md`

**Interfaces:**
- Consumes: `?redirect=` desteği (Task 2).

- [ ] **Step 1: Header account link carries the current page**

`Header.tsx` içinde `href={user ? '/hesabim' : '/giris-yap'}` bağlantısını bul (satır ~150). Bileşende `usePathname` yoksa `import { usePathname } from 'next/navigation';` ekle ve bileşen gövdesinde `const pathname = usePathname();` tanımla. Bağlantıyı şöyle yap:
```tsx
href={user ? '/hesabim' : pathname && pathname !== '/' && pathname !== '/giris-yap' ? `/giris-yap?redirect=${encodeURIComponent(pathname)}` : '/giris-yap'}
```
Önce `git status --short src/components/layout/Header.tsx` boş olmalı.

- [ ] **Step 2: Docs**

`docs/pages/ACCOUNT.md` giriş bölümüne: "Test/seed hesapları arayüzde gösterilmez. `?redirect=` yalnız site içi yol kabul eder (`src/lib/auth/safe-redirect.ts`)." ekle. `docs/QA.md` P0 listesinde bu sayfa için açık bir madde varsa kapat (`[x]`), yoksa ekleme.

- [ ] **Step 3: Verify and commit**

```bash
npx tsc --noEmit && npm test
git add src/components/layout/Header.tsx docs/pages/ACCOUNT.md docs/QA.md
git commit -m "feat(auth): return users to the page they came from after login"
```
Tarayıcı: `/koleksiyon` sayfasında oturumsuz hesap ikonuna tıkla → URL `/giris-yap?redirect=%2Fkoleksiyon`.
