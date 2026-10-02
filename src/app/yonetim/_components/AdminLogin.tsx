'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import MfaStep from '@/components/auth/MfaStep';

/** Sign-in gate for /yonetim. A signed-in customer is told why they cannot enter instead of being
 *  shown a form that would fail. Credentials are never prefilled. */
export default function AdminLogin({ signedInAs, onSignOut, notice = null }: { signedInAs: string | null; onSignOut(): void; notice?: string | null }) {
  const { login, refreshUser } = useAuth();
  const [mfa, setMfa] = useState<'verify' | 'setup' | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;
    if (!email.trim() || !password) {
      setError('E-posta ve şifreyi girin.');
      return;
    }
    setPending(true);
    setError(null);
    const result = await login(email.trim(), password);
    setPending(false);
    if (!result.success) setError(result.error || 'Giriş yapılamadı.');
    else if (result.mfaRequired) {
      setPassword('');
      setMfa(result.setup ? 'setup' : 'verify');
    }
  }

  if (mfa) {
    return (
      <main id="main" className="adm-gate">
        <div className="adm-gate__card">
          <p className="adm-sidebar__logo">PANDIONES</p>
          <MfaStep mode={mfa} onDone={() => void refreshUser()} onCancel={() => setMfa(null)} />
        </div>
      </main>
    );
  }

  return (
    <main id="main" className="adm-gate">
      <div className="adm-gate__card">
        <p className="adm-sidebar__logo">PANDIONES</p>
        <h1>Yönetim girişi</h1>
        {notice && !signedInAs ? (
          <p className="adm-banner adm-banner--warning" role="status">
            {notice}
          </p>
        ) : null}
        {signedInAs ? (
          <div className="adm-gate__notice" role="alert">
            <p>
              <strong>{signedInAs}</strong> hesabının yönetim yetkisi yok.
            </p>
            <div className="adm-gate__actions">
              <button type="button" className="adm-btn" onClick={onSignOut}>
                Çıkış yap
              </button>
              <Link href="/" className="adm-btn">
                Mağazaya dön
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="adm-gate__form">
            <p className="adm-field__hint">Yönetim girişi iki adımlıdır (doğrulama uygulaması). Oturum en fazla 8 saat sürer; 30 dakika işlem yapılmazsa kapanır.</p>
            <div className="adm-field">
              <label htmlFor="adm-login-email">E-posta</label>
              <input id="adm-login-email" type="email" autoComplete="username" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="adm-field">
              <label htmlFor="adm-login-password">Şifre</label>
              <input id="adm-login-password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            {error ? (
              <p className="adm-field-error" role="alert">
                {error}
              </p>
            ) : null}
            <button type="submit" className="adm-btn adm-btn--primary adm-btn--block" disabled={pending}>
              {pending ? 'Giriş yapılıyor' : 'Giriş yap'}
            </button>
            <Link href="/sifremi-unuttum" className="adm-field__hint">
              Şifremi unuttum
            </Link>
          </form>
        )}
      </div>
    </main>
  );
}
