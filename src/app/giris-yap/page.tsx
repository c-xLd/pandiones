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
