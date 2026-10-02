'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import AccountHeader from './_components/AccountHeader';
import RecentOrder from './_components/RecentOrder';
import AccountTabs, { panelId, tabId, TAB_LABELS } from './_components/AccountTabs';
import AddressesTab from './_components/addresses/AddressesTab';
import FavoritesTab from './_components/FavoritesTab';
import PreferencesTab from './_components/PreferencesTab';
import SecurityPanel from './_components/SecurityPanel';
import ProfileTab from './_components/ProfileTab';
import ReturnsTab, { collectReturns } from './_components/ReturnsTab';
import WalletTab, { type WalletState } from './_components/wallet/WalletTab';
import { ACTIVE_STATUSES, isTabKey, type Order, type TabKey } from './_components/lib';
// Route stylesheet: loaded only where this page or component is used.
import '@/styles/pages/account.css';

function AccountSkeleton() {
  return (
    <main id="main" className="account-page" aria-busy="true" aria-label="Hesabınız yükleniyor">
      <div className="account-hero account-hero--skeleton" aria-hidden="true">
        <span className="account-monogram skeleton-block" />
        <span className="skeleton-block account-skeleton-line" />
      </div>
      <div className="account-skeleton-tabs skeleton-block" aria-hidden="true" />
      <div className="account-skeleton-panel skeleton-block" aria-hidden="true" />
    </main>
  );
}

export default function HesabimPage() {
  const router = useRouter();
  const { user, loading, logout, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>('favoriler');
  const [loggingOut, setLoggingOut] = useState(false);
  const [wallet, setWallet] = useState<WalletState>({ status: 'loading', data: null });

  // Deep links: /hesabim#adresler opens that tab; tab changes update the hash without scrolling.
  useEffect(() => {
    const syncFromHash = () => {
      const hash = window.location.hash.replace('#', '');
      // Orders moved to their own page; keep old /hesabim#siparisler links working.
      if (hash === 'siparisler') {
        router.replace('/siparislerim');
        return;
      }
      if (isTabKey(hash)) setActiveTab(hash);
    };
    syncFromHash();
    window.addEventListener('hashchange', syncFromHash);
    return () => window.removeEventListener('hashchange', syncFromHash);
  }, [router]);

  const switchTab = useCallback((tab: TabKey) => {
    setActiveTab(tab);
    window.history.replaceState(null, '', `#${tab}`);
  }, []);

  useEffect(() => {
    if (loading || user || loggingOut) return;
    const back = `/hesabim${window.location.hash || ''}`;
    router.replace(`/giris-yap?redirect=${encodeURIComponent(back)}`);
  }, [loading, user, loggingOut, router]);

  const loadWallet = useCallback(async () => {
    setWallet((prev) => ({ ...prev, status: 'loading' }));
    try {
      const res = await fetch('/api/gift-cards/my-cards');
      if (!res.ok) throw new Error(String(res.status));
      setWallet({ status: 'ready', data: await res.json() });
    } catch {
      setWallet((prev) => ({ ...prev, status: 'error' }));
    }
  }, []);

  const userId = user?.id;
  useEffect(() => {
    if (userId) loadWallet();
  }, [userId, loadWallet]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      router.replace('/');
    } finally {
      setLoggingOut(false);
    }
  };

  if (loading || !user) return <AccountSkeleton />;

  const orders = (user.orders ?? []) as Order[];
  const wishlists = user.wishlists ?? [];
  const returnsCount = collectReturns(orders).length;

  const panel = (() => {
    switch (activeTab) {
      case 'cuzdan':
        return <WalletTab wallet={wallet} onRetry={loadWallet} />;
      case 'favoriler':
        return <FavoritesTab wishlists={wishlists} onChanged={refreshUser} />;
      case 'iadeler':
        return <ReturnsTab orders={orders} />;
      case 'adresler':
        return <AddressesTab enabled orders={orders} defaults={{ recipient: user.name ?? '', phone: user.phone ?? '' }} />;
      case 'profil':
        return (
          <>
            <ProfileTab user={user} onProfileSaved={refreshUser} />
            <SecurityPanel twoFactorEnabled={Boolean(user.twoFactorEnabled)} onChanged={refreshUser} />
          </>
        );
      case 'tercihler':
        return <PreferencesTab email={user.email} subscribed={Boolean(user.isSubscribedNewsletter)} onChanged={refreshUser} />;
    }
  })();

  return (
    <main id="main" className="account-page">
      <AccountHeader
        user={user}
        metrics={{
          activeOrders: orders.filter((o) => ACTIVE_STATUSES.includes(o.status)).length,
          totalOrders: orders.length,
          favorites: wishlists.length,
          walletBalance: wallet.status === 'ready' ? wallet.data?.totalActiveBalance ?? 0 : null,
        }}
        onSelectTab={switchTab}
        onLogout={handleLogout}
        loggingOut={loggingOut}
      />

      <RecentOrder orders={orders} />

      <AccountTabs
        active={activeTab}
        onChange={switchTab}
        counts={{ favoriler: wishlists.length, iadeler: returnsCount }}
      />

      <section
        key={activeTab}
        id={panelId(activeTab)}
        role="tabpanel"
        aria-labelledby={tabId(activeTab)}
        tabIndex={0}
        className="account-panel-region"
      >
        <h2 className="visually-hidden">{TAB_LABELS[activeTab]}</h2>
        {panel}
      </section>
    </main>
  );
}
