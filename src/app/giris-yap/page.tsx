'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { defaultPathForRole, safeRedirectPath } from '@/lib/auth/safe-redirect';
import type { AuthFormValues, AuthMode } from '@/lib/auth/form-validation';
import AuthForm from './_components/AuthForm';
import MfaStep from '@/components/auth/MfaStep';
// Route stylesheet: loaded only where this page or component is used.
import '@/styles/pages/auth.css';

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
  const { user, loading, login, register, refreshUser } = useAuth();
  const [mode, setMode] = useState<AuthMode>('login');
  const [mfa, setMfa] = useState<'verify' | 'setup' | null>(null);
  const [registered, setRegistered] = useState<string | null>(null);
  const redirectTo = safeRedirectPath(searchParams.get('redirect'));

  useEffect(() => {
    if (!loading && user) router.replace(redirectTo ?? defaultPathForRole(user.role));
  }, [loading, user, redirectTo, router]);

  if (loading || user) return <AuthLoading />;

  const handleSubmit = async (submitMode: AuthMode, values: AuthFormValues, turnstileToken: string | null): Promise<string | null> => {
    if (submitMode === 'login') {
      const res = await login(values.email.trim(), values.password);
      if (!res.success) return res.error || 'Giriş yapılamadı. Lütfen tekrar deneyin.';
      if (res.mfaRequired) setMfa(res.setup ? 'setup' : 'verify');
      return null; // otherwise the effect above navigates once `user` is set
    }
    const res = await register(values.name.trim(), values.email.trim(), values.password, values.phone.trim() || undefined, turnstileToken);
    if (!res.success) return res.error || 'Kayıt tamamlanamadı. Lütfen tekrar deneyin.';
    setRegistered(res.message || 'Doğrulama bağlantısını e-posta adresinize gönderdik.');
    return null;
  };

  if (mfa) {
    return (
      <div className="auth-page">
        <p className="status-panel__eyebrow">Pandiones</p>
        <MfaStep mode={mfa} onDone={() => void refreshUser()} onCancel={() => setMfa(null)} />
      </div>
    );
  }

  if (registered) {
    return (
      <div className="auth-page">
        <p className="status-panel__eyebrow">Pandiones</p>
        <h1 className="auth-title">E-postanızı kontrol edin</h1>
        <div className="auth-done" role="status">
          <p>{registered}</p>
          <p>Bağlantı 24 saat geçerlidir. Gelmediyse gereksiz klasörünü kontrol edin ya da birkaç dakika sonra giriş yapmayı deneyin; yeni bağlantı göndeririz.</p>
          <button type="button" className="btn btn--secondary" onClick={() => { setRegistered(null); setMode('login'); }}>
            Giriş sayfasına dön
          </button>
        </div>
      </div>
    );
  }

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
