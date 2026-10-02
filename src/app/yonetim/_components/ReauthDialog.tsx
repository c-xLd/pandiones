'use client';

import React, { useEffect, useRef, useState } from 'react';
import { REAUTH_OPEN_EVENT, finishReauth } from '../_lib/admin-fetch';

/** Asks for a current 2FA code before a sensitive action (settings, coupons, gift cards). */
export default function ReauthDialog() {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const restore = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const onOpen = () => {
      restore.current = document.activeElement as HTMLElement | null;
      setCode('');
      setError(null);
      setOpen(true);
    };
    window.addEventListener(REAUTH_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(REAUTH_OPEN_EVENT, onOpen);
  }, []);

  useEffect(() => {
    if (open) requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  const close = (ok: boolean) => {
    setOpen(false);
    finishReauth(ok);
    restore.current?.focus?.();
  };

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/reauth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Kod doğrulanamadı.');
        setCode('');
        inputRef.current?.focus();
        return;
      }
      close(true);
    } catch {
      setError('Bağlantı kurulamadı. Tekrar deneyin.');
    } finally {
      setPending(false);
    }
  }

  if (!open) return null;
  return (
    <div className="adm-session" role="dialog" aria-modal="true" aria-labelledby="adm-reauth-title" onKeyDown={(e) => e.key === 'Escape' && close(false)}>
      <form className="adm-session__card" onSubmit={submit} noValidate>
        <span className="adm-eyebrow">Güvenlik</span>
        <h2 id="adm-reauth-title">Kimliğinizi doğrulayın</h2>
        <p>Bu işlem mağazanın tamamını ya da para değerini etkiliyor. Devam etmek için doğrulama uygulamanızdaki kodu girin.</p>
        <div className="adm-field">
          <label htmlFor="adm-reauth-code">6 haneli kod</label>
          <input
            ref={inputRef}
            id="adm-reauth-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={9}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? 'adm-reauth-error' : undefined}
          />
        </div>
        {error ? (
          <p id="adm-reauth-error" className="adm-field-error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="adm-session__actions">
          <button type="button" className="adm-btn" onClick={() => close(false)}>
            Vazgeç
          </button>
          <button type="submit" className="adm-btn adm-btn--primary" disabled={pending || !code.trim()}>
            {pending ? 'Doğrulanıyor' : 'Doğrula ve devam et'}
          </button>
        </div>
      </form>
    </div>
  );
}
