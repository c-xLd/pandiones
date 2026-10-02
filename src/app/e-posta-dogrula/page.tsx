'use client';

import React, { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import MfaStep from '@/components/auth/MfaStep';
import '@/styles/pages/auth.css';

type State = { kind: 'working' } | { kind: 'done' } | { kind: 'mfa'; setup: boolean } | { kind: 'error'; message: string };

/**
 * Opened from the verification e-mail. The token is read once, removed from the address bar, and sent
 * with POST (a link scanner that only GETs the page cannot use it up).
 */
function VerifyContent() {
  const params = useSearchParams();
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [state, setState] = useState<State>({ kind: 'working' });
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    const token = params.get('token') ?? '';
    window.history.replaceState(null, '', '/e-posta-dogrula');
    if (!token) {
      setState({ kind: 'error', message: 'Bağlantı eksik. E-postadaki bağlantıyı yeniden açın.' });
      return;
    }
    fetch('/api/auth/verify-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Doğrulama tamamlanamadı.');
        if (data.mfaRequired) setState({ kind: 'mfa', setup: Boolean(data.setup) });
        else {
          await refreshUser();
          setState({ kind: 'done' });
        }
      })
      .catch((err) => setState({ kind: 'error', message: err instanceof Error ? err.message : 'Doğrulama tamamlanamadı.' }));
  }, [params, refreshUser]);

  if (state.kind === 'mfa') {
    return <MfaStep mode={state.setup ? 'setup' : 'verify'} onDone={async () => { await refreshUser(); router.replace('/hesabim'); }} onCancel={() => router.replace('/giris-yap')} />;
  }

  return (
    <>
      <h1 className="auth-title">{state.kind === 'done' ? 'Hesabınız hazır' : state.kind === 'error' ? 'Doğrulanamadı' : 'Doğrulanıyor'}</h1>
      <div className="auth-done" role={state.kind === 'error' ? 'alert' : 'status'} aria-busy={state.kind === 'working'}>
        {state.kind === 'working' ? <div className="skeleton-block auth-skeleton auth-skeleton--short" aria-hidden="true" /> : null}
        {state.kind === 'done' ? (
          <>
            <p>E-posta adresiniz doğrulandı ve giriş yaptınız.</p>
            <Link href="/hesabim" className="btn btn--primary">
              Hesabıma git
            </Link>
          </>
        ) : null}
        {state.kind === 'error' ? (
          <>
            <p>{state.message}</p>
            <Link href="/giris-yap" className="btn btn--secondary">
              Giriş sayfasına git
            </Link>
          </>
        ) : null}
      </div>
    </>
  );
}

export default function EmailVerifyPage() {
  return (
    <main id="main" className="padded-main">
      <div className="auth-page">
        <p className="status-panel__eyebrow">Pandiones</p>
        <Suspense fallback={<div className="skeleton-block auth-skeleton" aria-hidden="true" />}>
          <VerifyContent />
        </Suspense>
      </div>
    </main>
  );
}
