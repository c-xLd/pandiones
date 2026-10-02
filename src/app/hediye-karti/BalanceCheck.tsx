'use client';

import React, { useRef, useState } from 'react';
import Link from 'next/link';
import FormField from '@/components/ui/FormField';
import Notice from '@/components/ui/Notice';
import StatusTag from '@/components/ui/StatusTag';
import { formatTRY } from '@/lib/format/money';
import { formatDate } from '@/lib/orders';

type Balance = {
  code: string;
  recipientName: string;
  initialBalance: number;
  currentBalance: number;
  expiresAt: string;
};

type Failure = { message: string; retryable: boolean } | null;

const CODE_PATTERN = /^PND-GC-[A-Z0-9]{4}-[A-Z0-9]{4}$/;

export default function BalanceCheck() {
  const [code, setCode] = useState('');
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [failure, setFailure] = useState<Failure>(null);
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState<Balance | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const lookup = async () => {
    const clean = code.trim().toUpperCase();
    if (!clean) return (setFieldError('Kart kodunu yazın.'), inputRef.current?.focus());
    if (!CODE_PATTERN.test(clean)) return (setFieldError('Kod PND-GC-XXXX-XXXX biçimindedir.'), inputRef.current?.focus());
    if (loading) return;
    setFieldError(undefined);
    setFailure(null);
    setBalance(null);
    setLoading(true);
    try {
      const res = await fetch('/api/gift-cards/balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: clean }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 404 || res.status === 400) {
        setFailure({ message: data.error || 'Bu kodla bir hediye kartı bulamadık.', retryable: false });
      } else if (!res.ok) {
        setFailure({ message: data.error || 'Bakiye sorgulanamadı.', retryable: true });
      } else {
        setBalance(data);
      }
    } catch {
      setFailure({ message: 'Bağlantı kurulamadı. İnternet bağlantınızı kontrol edip tekrar deneyin.', retryable: true });
    } finally {
      setLoading(false);
    }
  };

  const used = balance ? balance.initialBalance - balance.currentBalance : 0;
  const ratio = balance && balance.initialBalance > 0 ? balance.currentBalance / balance.initialBalance : 0;

  return (
    <div className="balance">
      <form
        className="balance__form"
        noValidate
        aria-busy={loading}
        onSubmit={(event) => {
          event.preventDefault();
          void lookup();
        }}
      >
        <FormField id="gift-balance-code" label="Kart kodu" hint="Hediye kartı e-postasında yazar." error={fieldError}>
          <input
            ref={inputRef}
            type="text"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            placeholder="PND-GC-XXXX-XXXX"
            className="balance__code"
            value={code}
            onChange={(event) => {
              setCode(event.target.value.toUpperCase());
              setFieldError(undefined);
            }}
          />
        </FormField>
        <button type="submit" className="btn btn--secondary btn--lg balance__submit" disabled={loading} aria-busy={loading}>
          {loading ? 'Sorgulanıyor…' : 'Bakiyeyi gör'}
        </button>
      </form>

      {failure ? (
        <Notice tone="danger" role="alert">
          <p>{failure.message}</p>
          {failure.retryable ? (
            <button type="button" className="btn btn--link" onClick={() => void lookup()} disabled={loading}>Tekrar dene</button>
          ) : null}
        </Notice>
      ) : null}

      {balance ? (
        <section className="balance-result" aria-labelledby="balance-result-title" aria-live="polite">
          <div className="balance-result__head">
            <p className="orders-label">{balance.code}</p>
            <StatusTag tone={balance.currentBalance > 0 ? 'success' : 'neutral'}>
              {balance.currentBalance > 0 ? 'Kullanılabilir' : 'Bakiye kalmadı'}
            </StatusTag>
          </div>
          <h3 id="balance-result-title" className="balance-result__amount">
            <span className="visually-hidden">Kalan bakiye: </span>
            {formatTRY(balance.currentBalance)}
          </h3>
          <div className="balance-result__meter" aria-hidden="true">
            <span style={{ '--ratio': ratio } as React.CSSProperties} />
          </div>
          <dl className="balance-result__facts">
            <div><dt>Başlangıç</dt><dd>{formatTRY(balance.initialBalance)}</dd></div>
            <div><dt>Kullanılan</dt><dd>{formatTRY(used)}</dd></div>
            <div><dt>Son kullanma</dt><dd>{formatDate(balance.expiresAt)}</dd></div>
          </dl>
          {balance.currentBalance > 0 ? (
            <p className="balance-result__hint">
              Ödeme adımında kodu “Kupon veya hediye kartı” alanına yazın. <Link href="/yeni-gelenler">Yeni gelenlere göz at</Link>
            </p>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
