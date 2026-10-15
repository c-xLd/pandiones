'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { REAUTH_OPEN_EVENT, finishReauth } from '../_lib/admin-fetch';

/** Asks for a current 2FA code before a sensitive action (settings, coupons, gift cards, bulk delete). */
export default function ReauthDialog() {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const cardRef = useRef<HTMLFormElement>(null);
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
    if (!open) return;
    requestAnimationFrame(() => inputRef.current?.focus());

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        close(false);
        return;
      }
      if (e.key !== 'Tab' || !cardRef.current) return;
      const focusable = Array.from(cardRef.current.querySelectorAll<HTMLElement>('input:not([disabled]), button:not([disabled])'));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        e.stopPropagation();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        e.stopPropagation();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
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

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className="adm-session" role="dialog" aria-modal="true" aria-labelledby="adm-reauth-title">
      <form ref={cardRef} className="adm-session__card" onSubmit={submit} noValidate>
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
    </div>,
    document.body
  );
}
