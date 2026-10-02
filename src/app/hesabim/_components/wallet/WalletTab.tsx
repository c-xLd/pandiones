'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import FormField from '@/components/ui/FormField';
import Notice from '@/components/ui/Notice';
import { formatTRY } from '@/lib/format/money';
import StatusTag from '@/components/ui/StatusTag';
import { useCopy } from '@/lib/hooks/useCopy';
import { formatDate } from '../lib';

export type WalletCard = {
  id: string;
  code: string;
  initialBalance: number;
  currentBalance: number;
  recipientName: string;
  recipientEmail: string;
  senderName?: string | null;
  giftNote?: string | null;
  isActive: boolean;
  isDelivered?: boolean;
  expiresAt: string;
  createdAt: string;
};

export type WalletData = { receivedCards: WalletCard[]; purchasedCards: WalletCard[]; totalActiveBalance: number };
export type WalletState = { status: 'loading' | 'ready' | 'error'; data: WalletData | null };

type BalanceResult = { code: string; currentBalance: number; initialBalance: number; expiresAt: string; senderName?: string | null };

const cardState = (card: WalletCard) => {
  if (new Date(card.expiresAt) < new Date()) return { tone: 'neutral' as const, label: 'Süresi doldu' };
  if (!card.isActive) return { tone: 'neutral' as const, label: 'Pasif' };
  if (card.currentBalance <= 0) return { tone: 'neutral' as const, label: 'Bakiye kullanıldı' };
  return { tone: 'success' as const, label: 'Kullanılabilir' };
};

export default function WalletTab({ wallet, onRetry }: { wallet: WalletState; onRetry: () => void }) {
  const { copy, label } = useCopy();
  const [code, setCode] = useState('');
  const [inquiring, setInquiring] = useState(false);
  const [inquiryError, setInquiryError] = useState<string | null>(null);
  const [result, setResult] = useState<BalanceResult | null>(null);

  const inquire = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inquiring) return;
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) {
      setInquiryError('Hediye kartı kodunu girin.');
      return;
    }
    setInquiring(true);
    setInquiryError(null);
    setResult(null);
    try {
      const res = await fetch('/api/gift-cards/balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: trimmed }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.valid === false) {
        setInquiryError(data.error || 'Hediye kartı bulunamadı.');
      } else {
        setResult(data);
      }
    } catch {
      setInquiryError('Bağlantı kurulamadı. Tekrar deneyin.');
    } finally {
      setInquiring(false);
    }
  };

  const received = wallet.data?.receivedCards ?? [];
  const purchased = wallet.data?.purchasedCards ?? [];

  return (
    <div className="wallet">
      <div className="wallet-top">
        <section className="wallet-balance" aria-labelledby="wallet-balance-title">
          <p className="account-label" id="wallet-balance-title">Kullanılabilir bakiye</p>
          {wallet.status === 'loading' ? (
            <span className="skeleton-block wallet-balance__skeleton" aria-hidden="true" />
          ) : (
            <p className="wallet-balance__value account-num">
              {wallet.status === 'ready' ? formatTRY(wallet.data?.totalActiveBalance ?? 0) : '—'}
            </p>
          )}
          <p className="wallet-balance__hint">
            Hesabınıza gelen hediye kartlarının toplamı. Ödeme adımında kart kodunu girerek kullanabilirsiniz.
          </p>
          <Link href="/hediye-karti" className="btn btn--secondary btn--sm">Hediye kartı gönder</Link>
        </section>

        <section className="wallet-inquiry" aria-labelledby="wallet-inquiry-title">
          <h3 id="wallet-inquiry-title" className="account-section-title">Bakiye sorgula</h3>
          <form className="inline-form" onSubmit={inquire} noValidate>
            <FormField id="gift-card-code" label="Hediye kartı kodu" error={inquiryError ?? undefined}>
              <input
                type="text"
                placeholder="PND-GC-XXXX-XXXX"
                autoComplete="off"
                spellCheck={false}
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.toUpperCase());
                  if (inquiryError) setInquiryError(null);
                }}
              />
            </FormField>
            <button type="submit" className="btn btn--primary" aria-busy={inquiring || undefined} disabled={inquiring}>
              Sorgula
            </button>
          </form>
          {result ? (
            <dl className="wallet-result" role="status">
              <div>
                <dt>Kod</dt>
                <dd><code>{result.code}</code></dd>
              </div>
              <div>
                <dt>Kalan bakiye</dt>
                <dd className="account-num">{formatTRY(result.currentBalance)}</dd>
              </div>
              <div>
                <dt>İlk tutar</dt>
                <dd className="account-num">{formatTRY(result.initialBalance)}</dd>
              </div>
              <div>
                <dt>Son kullanma</dt>
                <dd>{formatDate(result.expiresAt)}</dd>
              </div>
              {result.senderName ? (
                <div>
                  <dt>Gönderen</dt>
                  <dd>{result.senderName}</dd>
                </div>
              ) : null}
            </dl>
          ) : null}
        </section>
      </div>

      {wallet.status === 'error' ? (
        <Notice tone="danger" role="alert" className="account-inline-error">
          <p>Hediye kartlarınız yüklenemedi.</p>
          <button type="button" className="btn btn--link" onClick={onRetry}>Tekrar dene</button>
        </Notice>
      ) : null}

      <section className="account-section" aria-labelledby="received-cards-title">
        <div className="account-section-head">
          <h3 id="received-cards-title" className="account-section-title">Hesabınızdaki kartlar</h3>
          <p className="account-section-desc">E-posta adresinize gönderilmiş hediye kartları.</p>
        </div>

        {wallet.status === 'loading' ? (
          <div className="gift-card-grid" aria-busy="true" aria-label="Kartlar yükleniyor">
            {[0, 1].map((i) => <span key={i} className="skeleton-block gift-card-skeleton" aria-hidden="true" />)}
          </div>
        ) : wallet.status === 'ready' && received.length === 0 ? (
          <div className="account-empty">
            <p className="account-empty__title">Hesabınıza tanımlı hediye kartı yok.</p>
            <p className="account-empty__desc">Size gönderilen bir kodun bakiyesini yukarıdan sorgulayabilirsiniz.</p>
          </div>
        ) : (
          <ul className="gift-card-grid">
            {received.map((card) => {
              const state = cardState(card);
              return (
                <li key={card.id} className={`gift-card${state.tone === 'success' ? '' : ' gift-card--inactive'}`}>
                  <div className="gift-card__top">
                    <span className="gift-card__brand" aria-hidden="true">P</span>
                    <StatusTag tone={state.tone}>{state.label}</StatusTag>
                  </div>
                  <p className="gift-card__balance account-num">
                    {formatTRY(card.currentBalance)}
                    <span> / {formatTRY(card.initialBalance)}</span>
                  </p>
                  {card.senderName ? (
                    <p className="gift-card__from">
                      {card.giftNote ? <>“{card.giftNote}” — </> : 'Gönderen: '}
                      {card.senderName}
                    </p>
                  ) : null}
                  <div className="gift-card__code">
                    <code>{card.code}</code>
                    <button type="button" className="account-text-btn" onClick={() => copy(card.code, `card-${card.id}`)}>
                      {label(`card-${card.id}`)}
                    </button>
                  </div>
                  <p className="gift-card__expiry">Son kullanma: {formatDate(card.expiresAt)}</p>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {purchased.length > 0 ? (
        <section className="account-section" aria-labelledby="purchased-cards-title">
          <div className="account-section-head">
            <h3 id="purchased-cards-title" className="account-section-title">Gönderdiğiniz kartlar</h3>
          </div>
          <ul className="account-rows">
            {purchased.map((card) => (
              <li key={card.id} className="account-row">
                <div>
                  <p className="account-row__title">{card.recipientName}</p>
                  <p className="account-row__meta">{card.recipientEmail} · {formatDate(card.createdAt)}</p>
                </div>
                <p className="account-num">{formatTRY(card.initialBalance)}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
