'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { isValidAlertEmail } from '@/lib/products/stock-alert';

/** Event the purchase panel / size sheet sends when a sold-out size is chosen. */
export const STOCK_ALERT_EVENT = 'pdp:stock-alert';
export const STOCK_ALERT_ANCHOR = 'stok-bildirimi';

/** Ask the stock-alert form to preselect `size` and scroll it into view. */
export function requestStockAlert(size: string) {
  window.dispatchEvent(new CustomEvent(STOCK_ALERT_EVENT, { detail: { size } }));
}

type Status =
  | { kind: 'idle' }
  | { kind: 'sending' }
  | { kind: 'done'; message: string }
  | { kind: 'error'; message: string };

/** "Stok gelince haber ver": shown only when the product has sold-out sizes. Records the request via
 *  /api/stock-alert; the email itself goes out when the size is restocked. */
export default function StockAlertForm({ productId, productName, soldOutSizes }: {
  productId: string;
  productName: string;
  soldOutSizes: string[];
}) {
  const [size, setSize] = useState(soldOutSizes[0] ?? '');
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const sectionRef = useRef<HTMLElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const emailId = useId();
  const errorId = useId();
  const statusId = useId();

  useEffect(() => {
    const onRequest = (event: Event) => {
      const requested = (event as CustomEvent<{ size?: string }>).detail?.size;
      if (requested && soldOutSizes.includes(requested)) setSize(requested);
      setStatus({ kind: 'idle' });
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      sectionRef.current?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
      window.setTimeout(() => emailRef.current?.focus({ preventScroll: true }), reduced ? 0 : 450);
    };
    window.addEventListener(STOCK_ALERT_EVENT, onRequest);
    return () => window.removeEventListener(STOCK_ALERT_EVENT, onRequest);
  }, [soldOutSizes]);

  if (soldOutSizes.length === 0) return null;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (status.kind === 'sending') return;
    if (!isValidAlertEmail(email)) {
      setEmailError('Lütfen geçerli bir e-posta adresi yaz.');
      emailRef.current?.focus();
      return;
    }
    setEmailError(null);
    setStatus({ kind: 'sending' });
    try {
      const res = await fetch('/api/stock-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, size, email }),
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
      if (!res.ok) {
        setStatus({ kind: 'error', message: data.error ?? 'Talebin kaydedilemedi. Lütfen tekrar dene.' });
        return;
      }
      setStatus({ kind: 'done', message: data.message ?? 'Talebin kaydedildi.' });
    } catch {
      setStatus({ kind: 'error', message: 'Bağlantı kurulamadı. Lütfen tekrar dene.' });
    }
  };

  return (
    <section
      ref={sectionRef}
      id={STOCK_ALERT_ANCHOR}
      className="pdp-stock-alert"
      aria-labelledby="pdp-stock-alert-title"
    >
      <div className="pdp-lower-inner pdp-stock-alert__inner">
        <div className="pdp-stock-alert__intro">
          <span className="pdp-lower-eyebrow">Stok bildirimi</span>
          <h2 id="pdp-stock-alert-title">Bedenin tükendiyse haber verelim.</h2>
          <p>
            {productName} için tükenen bedeni seç, e-postanı bırak. Beden stoğa girdiğinde tek bir e-posta
            gönderiyoruz; başka bir şey için kullanmıyoruz.
          </p>
        </div>

        {status.kind === 'done' ? (
          <p className="pdp-stock-alert__done" role="status">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
            {status.message}
          </p>
        ) : (
          <form className="pdp-stock-alert__form" onSubmit={submit} noValidate aria-describedby={statusId}>
            <fieldset className="pdp-stock-alert__sizes">
              <legend>Tükenen beden</legend>
              <div className="pdp-stock-alert__size-row">
                {soldOutSizes.map((option) => (
                  <label key={option} className={option === size ? 'is-selected' : ''}>
                    <input
                      type="radio"
                      name="stock-alert-size"
                      value={option}
                      checked={option === size}
                      onChange={() => setSize(option)}
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="pdp-stock-alert__field">
              <label htmlFor={emailId}>E-posta</label>
              <div className="pdp-stock-alert__control">
                <input
                  ref={emailRef}
                  id={emailId}
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="ornek@eposta.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) setEmailError(null);
                  }}
                  aria-invalid={emailError ? true : undefined}
                  aria-describedby={emailError ? errorId : undefined}
                  required
                />
                <button type="submit" className="btn btn--primary pdp-stock-alert__submit" aria-busy={status.kind === 'sending'} disabled={status.kind === 'sending'}>
                  {status.kind === 'sending' ? 'Kaydediliyor…' : 'Haber ver'}
                </button>
              </div>
              {emailError ? (
                <p id={errorId} className="field__error">{emailError}</p>
              ) : null}
            </div>

            <p id={statusId} className="pdp-stock-alert__status" role={status.kind === 'error' ? 'alert' : undefined}>
              {status.kind === 'error' ? status.message : ''}
            </p>
          </form>
        )}
      </div>
    </section>
  );
}
