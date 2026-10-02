'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Turnstile, { turnstileEnabled } from '@/components/security/Turnstile';
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
  onSubmit: (mode: AuthMode, values: AuthFormValues, turnstileToken: string | null) => Promise<string | null>;
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
  const [humanToken, setHumanToken] = useState<string | null>(null);
  const [humanReset, setHumanReset] = useState(0);
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
    const message = await onSubmit(mode, values, humanToken);
    if (message) {
      setServerError(message);
      setHumanReset((v) => v + 1);
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
        <div className="auth-password-tools">
          {isLogin ? (
            <Link href="/sifremi-unuttum" className="btn btn--link auth-forgot">
              Şifremi unuttum
            </Link>
          ) : null}
          <button
            type="button"
            className="btn btn--link auth-reveal"
            aria-pressed={showPassword}
            aria-controls="authPassword"
            onClick={() => setShowPassword((v) => !v)}
          >
            {showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
          </button>
        </div>

        {!isLogin ? (
          <FormField id="authPhone" label="Cep telefonu" optional error={errors.phone}>
            <input name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="05XX XXX XX XX" value={values.phone} onChange={update('phone')} />
          </FormField>
        ) : null}

        {serverError ? <div className="form-alert form-alert--error" role="alert">{serverError}</div> : null}

        {!isLogin ? <Turnstile action="register" onToken={setHumanToken} resetKey={humanReset} /> : null}
        <button type="submit" className="btn btn--primary btn--lg btn--block auth-submit" disabled={submitting || (!isLogin && turnstileEnabled && !humanToken)} aria-busy={submitting || undefined}>
          {submitting ? (isLogin ? 'Giriş yapılıyor' : 'Hesap oluşturuluyor') : isLogin ? 'Giriş yap' : 'Hesabı oluştur'}
        </button>
      </form>
    </>
  );
}
