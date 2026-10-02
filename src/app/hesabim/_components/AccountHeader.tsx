import React from 'react';
import Link from 'next/link';
import type { AuthUser } from '@/context/AuthContext';
import { formatTRY } from '@/lib/format/money';
import { formatDate, monogram, type TabKey } from './lib';

type Metric = { label: string; value: string } & ({ tab: TabKey; href?: never } | { href: string; tab?: never });

type AccountHeaderProps = {
  user: AuthUser;
  metrics: { activeOrders: number; totalOrders: number; favorites: number; walletBalance: number | null };
  onSelectTab: (tab: TabKey) => void;
  onLogout: () => void;
  loggingOut: boolean;
};

export default function AccountHeader({ user, metrics, onSelectTab, onLogout, loggingOut }: AccountHeaderProps) {
  const firstName = user.name?.trim().split(/\s+/)[0] || 'Merhaba';
  const items: Metric[] = [
    { label: 'Aktif sipariş', value: String(metrics.activeOrders), href: '/siparislerim?filtre=devam' },
    { label: 'Toplam sipariş', value: String(metrics.totalOrders), href: '/siparislerim' },
    { label: 'Favori', value: String(metrics.favorites), tab: 'favoriler' },
    { label: 'Hediye kartı bakiyesi', value: metrics.walletBalance === null ? '—' : formatTRY(metrics.walletBalance), tab: 'cuzdan' },
  ];

  return (
    <header className="account-hero">
      <div className="account-hero__identity">
        <span className="account-monogram" aria-hidden="true">{monogram(user.name)}</span>
        <div>
          <p className="account-eyebrow">Hesabım</p>
          <h1 className="account-hero__title">Merhaba, {firstName}</h1>
          <p className="account-hero__meta">
            <span>{user.email}</span>
            {user.createdAt ? <span>{formatDate(user.createdAt)} tarihinden beri üye</span> : null}
          </p>
        </div>
      </div>

      <div className="account-hero__actions">
        {user.role === 'ADMIN' ? (
          <Link href="/yonetim" className="btn btn--secondary btn--sm">Yönetim paneli</Link>
        ) : null}
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={onLogout}
          aria-busy={loggingOut || undefined}
          disabled={loggingOut}
        >
          Çıkış yap
        </button>
      </div>

      <dl className="account-metrics">
        {items.map((metric) => (
          <div key={metric.label} className="account-metric">
            <dt>{metric.label}</dt>
            <dd>
              {metric.href ? (
                <Link href={metric.href} aria-label={`${metric.label}: ${metric.value}. Siparişlerim sayfasını aç`}>
                  {metric.value}
                </Link>
              ) : (
                <button type="button" onClick={() => metric.tab && onSelectTab(metric.tab)} aria-label={`${metric.label}: ${metric.value}. Sekmeyi aç`}>
                  {metric.value}
                </button>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </header>
  );
}
