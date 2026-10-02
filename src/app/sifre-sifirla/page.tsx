'use client';

import React, { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import FormField from '@/components/ui/FormField';
import { MIN_PASSWORD_LENGTH } from '@/lib/auth/form-validation';
import { validateNewPassword } from '@/lib/auth/password-reset-client';
import '@/styles/pages/auth.css';

type Check = 'checking' | 'valid' | 'invalid' | 'error';

/**
 * Opened from the reset e-mail. The link is checked first (an expired one says so before anything is
 * typed); the token is then removed from the address bar so it does not stay in history or get shared.
 */
function ResetContent() {
  const params = useSearchParams();
  const token = useRef<string>('');
  const [check, setCheck] = useState<Check>('checking');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const passwordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (token.current) return;
    token.current = params.get('token') ?? '';
    window.history.replaceState(null, '', '/sifre-sifirla');
    if (!token.current) {
      setCheck('invalid');
      return;
    }
    fetch(`/api/auth/password/reset?token=${encodeURIComponent(token.current)}`, { cache: 'no-store' })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error();
        setCheck(data.valid ? 'valid' : 'invalid');
      })
      .catch(() => setCheck('error'));
  }, [params]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;
    setServerError(null);
    const problem = validateNewPassword(password, confirm);
    if (problem) {
      setFieldError(problem);
      passwordRef.current?.focus();
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/password/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token.current, password, passwordConfirm: confirm }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 410) {
        setCheck('invalid');
        return;
      }
      if (!res.ok) {
        if (data.field === 'password') {
          setFieldError(data.error);
          passwordRef.current?.focus();
        } else setServerError(data.error || 'Şifre güncellenemedi. Tekrar deneyin.');
        return;
      }
      setDone(true);
    } catch {
      setServerError('Bağlantı kurulamadı. Tekrar deneyin.');
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <>
        <h1 className="auth-title">Şifreniz yenilendi</h1>
        <div className="auth-done" role="status">
          <p>Yeni şifrenizle giriş yapabilirsiniz. Güvenliğiniz için tüm cihazlardaki açık oturumlar kapatıldı.</p>
          <Link href="/giris-yap" className="btn btn--primary">
            Giriş yap
          </Link>
        </div>
      </>
    );
  }

  if (check !== 'valid') {
    return (
      <>
        <h1 className="auth-title">{check === 'checking' ? 'Bağlantı kontrol ediliyor' : 'Bağlantı kullanılamıyor'}</h1>
        <div className="auth-done" role={check === 'checking' ? 'status' : 'alert'} aria-busy={check === 'checking'}>
          {check === 'checking' ? <div className="skeleton-block auth-skeleton auth-skeleton--short" aria-hidden="true" /> : null}
          {check === 'invalid' ? <p>Bu bağlantı geçersiz, kullanılmış ya da süresi dolmuş (bağlantılar 30 dakika geçerlidir).</p> : null}
          {check === 'error' ? <p>Bağlantı kontrol edilemedi. İnternet bağlantınızı kontrol edip sayfayı yeniden açın.</p> : null}
          {check !== 'checking' ? (
            <Link href="/sifremi-unuttum" className="btn btn--secondary">
              Yeni bağlantı iste
            </Link>
          ) : null}
        </div>
      </>
    );
  }

  return (
    <>
      <h1 className="auth-title">Yeni şifre belirleyin</h1>
      <p className="auth-lead">En az {MIN_PASSWORD_LENGTH} karakter. Başka sitelerde kullandığınız ya da bilinen sızıntılarda geçen şifreler kabul edilmez.</p>
      <form className="auth-form" onSubmit={submit} noValidate>
        <FormField id="resetPassword" label="Yeni şifre" required error={fieldError ?? undefined}>
          <input
            ref={passwordRef}
            name="password"
            type={show ? 'text' : 'password'}
            autoComplete="new-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (fieldError) setFieldError(null);
            }}
          />
        </FormField>
        <FormField id="resetPasswordConfirm" label="Yeni şifre (tekrar)" required>
          <input name="passwordConfirm" type={show ? 'text' : 'password'} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </FormField>
        <div className="auth-password-tools">
          <button type="button" className="btn btn--link auth-reveal" aria-pressed={show} onClick={() => setShow((v) => !v)}>
            {show ? 'Şifreyi gizle' : 'Şifreyi göster'}
          </button>
        </div>
        {serverError ? (
          <div className="form-alert form-alert--error" role="alert">
            {serverError}
          </div>
        ) : null}
        <button type="submit" className="btn btn--primary btn--lg btn--block auth-submit" disabled={submitting} aria-busy={submitting || undefined}>
          {submitting ? 'Kaydediliyor' : 'Şifreyi kaydet'}
        </button>
      </form>
    </>
  );
}

export default function PasswordResetPage() {
  return (
    <main id="main" className="padded-main">
      <div className="auth-page">
        <p className="status-panel__eyebrow">Pandiones</p>
        <Suspense fallback={<div className="skeleton-block auth-skeleton" aria-hidden="true" />}>
          <ResetContent />
        </Suspense>
      </div>
    </main>
  );
}
