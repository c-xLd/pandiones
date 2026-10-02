'use client';

import React, { useRef, useState } from 'react';
import Link from 'next/link';
import FormField from '@/components/ui/FormField';
import Turnstile, { turnstileEnabled } from '@/components/security/Turnstile';
import { normalizeResetEmail } from '@/lib/auth/password-reset-client';
import '@/styles/pages/auth.css';

/** "Şifremi unuttum": asks for the account e-mail and sends a 30-minute, single-use reset link.
 *  The success message is the same whether or not the address has an account. */
export default function SifremiUnuttumPage() {
  const [email, setEmail] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [humanToken, setHumanToken] = useState<string | null>(null);
  const [humanReset, setHumanReset] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;
    setServerError(null);
    const normalized = normalizeResetEmail(email);
    if (!normalized) {
      setFieldError('Geçerli bir e-posta adresi girin.');
      inputRef.current?.focus();
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch('/api/auth/password/forgot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalized, turnstileToken: humanToken }),
      });
      setHumanReset((v) => v + 1);
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        if (data?.field === 'email') {
          setFieldError(data.error);
          inputRef.current?.focus();
        } else {
          setServerError(data?.error || 'İsteğiniz alınamadı. Lütfen tekrar deneyin.');
        }
        return;
      }
      setMessage(data.message);
      setSentTo(normalized);
    } catch {
      setServerError('Bağlantı kurulamadı. İnternet bağlantınızı kontrol edip tekrar deneyin.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main id="main" className="padded-main">
      <div className="auth-page">
        <p className="status-panel__eyebrow">Pandiones</p>
        <h1 className="auth-title">Şifremi unuttum</h1>

        {sentTo ? (
          <div className="auth-done" role="status">
            <p>{message}</p>
            <p>
              Bağlantı <strong>30 dakika</strong> geçerlidir ve yalnız bir kez kullanılabilir. Gelmediyse bir dakika sonra yeniden isteyebilirsiniz.
            </p>
            <button
              type="button"
              className="btn btn--secondary"
              onClick={() => {
                setSentTo(null);
                setMessage('');
              }}
            >
              Başka bir adres dene
            </button>
          </div>
        ) : (
          <>
            <p className="auth-lead">Hesabınızın e-posta adresini yazın; yeni şifre belirlemeniz için bir bağlantı gönderelim.</p>
            <form className="auth-form" onSubmit={submit} noValidate>
              <FormField id="resetEmail" label="E-posta adresi" required error={fieldError ?? undefined}>
                <input
                  ref={inputRef}
                  name="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="ornek@pandiones.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldError) setFieldError(null);
                  }}
                />
              </FormField>
              {serverError ? (
                <div className="form-alert form-alert--error" role="alert">
                  {serverError}
                </div>
              ) : null}
              <Turnstile action="forgot" onToken={setHumanToken} resetKey={humanReset} />
        <button type="submit" className="btn btn--primary btn--lg btn--block auth-submit" disabled={submitting || (turnstileEnabled && !humanToken)} aria-busy={submitting || undefined}>
                {submitting ? 'Gönderiliyor' : 'Sıfırlama bağlantısı gönder'}
              </button>
            </form>
          </>
        )}

        <Link href="/giris-yap" className="btn btn--link auth-back">
          Giriş sayfasına dön
        </Link>
      </div>
    </main>
  );
}
