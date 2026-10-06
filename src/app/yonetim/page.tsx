'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import AdminShellSkeleton from './_components/AdminShellSkeleton';
import SessionGuard, { type SessionEndReason } from './_components/SessionGuard';
import ReauthDialog from './_components/ReauthDialog';
import DashboardTab, { type AdminStats } from './_components/DashboardTab';
import SettingsTab from './_components/SettingsTab';
import ActivityTab from './_components/ActivityTab';
import SecurityTab from './_components/SecurityTab';
import CommandPalette from './_components/CommandPalette';
import AdminIcon from './_components/AdminIcon';
import OrdersTab from './_tabs/OrdersTab';
import ProductsTab from './_tabs/ProductsTab';
import CouponsTab from './_tabs/CouponsTab';
import ReturnsTab from './_tabs/ReturnsTab';
import NewsletterTab from './_tabs/NewsletterTab';
import CategoriesTab from './_tabs/CategoriesTab';
import GiftCardsTab from './_tabs/GiftCardsTab';
import WaitlistTab from './_tabs/WaitlistTab';
import CustomersTab from './_tabs/CustomersTab';
import MessagesTab from './_tabs/MessagesTab';
import { ADMIN_GROUPS, ADMIN_TABS, parseTab, tabLabel, type AdminTabId, type BadgeKey } from './_lib/tabs';

// Route stylesheets
import '@/styles/pages/admin-shell.css';
import '@/styles/pages/admin-content.css';
// Loaded with this lazily imported overlay, not on first paint.
import '@/styles/layout/overlays.css';

const TAB_LEADS: Partial<Record<AdminTabId, string>> = {
  dashboard: 'Son 30 günün satışları, bekleyen işler ve stok durumu.',
  activity: 'Panelde kimin neyi ne zaman değiştirdiği.',
  orders: 'Ödemesi alınan siparişleri hazırlayın, kargoya verin ve takip edin.',
  returns: 'İade taleplerini inceleyin; onaylayın ya da gerekçesiyle reddedin.',
  coupons: 'Ödemede kullanılabilen indirim kodları.',
  'gift-cards': 'Satılan ve tanımlanan hediye kartları, bakiye ve kullanım geçmişi.',
  products: 'Ürünler, beden stokları ve vitrin durumu.',
  categories: 'Kategori ağacı ve sıralaması.',
  waitlist: '“Gelince haber ver” talepleri, ürün ve bedene göre.',
  customers: 'Kayıtlı müşteriler ve sipariş geçmişleri.',
  messages: 'İletişim formundan gelen mesajlar.',
  newsletter: 'Bülten aboneleri.',
  security: 'Kilitlenen hesaplar, sınır aşımları, ödeme uyuşmazlıkları ve yönetici girişleri. Kritik olaylar e-postayla da bildirilir.',
  settings: 'Mağaza bilgileri, kargo, duyuru, bakım modu, SEO ve stok eşiği. Kaydedince sitede hemen uygulanır.',
};

export default function YonetimPage() {
  const { user, loading, logout } = useAuth();
  const [tab, setTab] = useState<AdminTabId>('dashboard');
  const [search, setSearch] = useState<{ value: string; tab: AdminTabId } | null>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [statsKey, setStatsKey] = useState(0);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const router = useRouter();
  const isAdmin = user?.role === 'ADMIN';

  // ?tab= is the source of truth on load and on back/forward.
  useEffect(() => {
    const sync = () => setTab(parseTab(new URLSearchParams(window.location.search).get('tab')));
    sync();
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, []);

  const navigate = useCallback((next: AdminTabId, value?: string) => {
    setTab(next);
    setSearch(value ? { value, tab: next } : null);
    setNavOpen(false);
    // A tab's own filters (orders: status, q, page…) belong to that tab; switching starts clean.
    const url = new URL(window.location.pathname, window.location.origin);
    url.searchParams.set('tab', next);
    if (url.toString() !== window.location.href) window.history.pushState({}, '', url.toString());
    document.getElementById('adm-main')?.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
  }, []);

  // Dashboard figures and sidebar badges; refreshed when the dashboard is opened again.
  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    setStatsError(null);
    fetch('/api/admin/stats', { cache: 'no-store' })
      .then(async (response) => {
        const data = await response.json().catch(() => null);
        if (!response.ok || !data?.dashboard) throw new Error(data?.error || 'Gösterge paneli yüklenemedi.');
        if (!cancelled) setStats(data);
      })
      .catch((error) => !cancelled && setStatsError(error instanceof Error ? error.message : 'Gösterge paneli yüklenemedi.'));
    return () => {
      cancelled = true;
    };
  }, [isAdmin, statsKey]);

  useEffect(() => {
    if (tab === 'dashboard') setStatsKey((v) => v + 1);
  }, [tab]);

  useEffect(() => {
    if (!isAdmin) return;
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isAdmin]);

  useEffect(() => {
    if (!navOpen) return;
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setNavOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navOpen]);

  useEffect(() => {
    if (!loading && !isAdmin) router.replace('/yonetim/giris');
  }, [loading, isAdmin, router]);

  if (loading) return <AdminShellSkeleton />;

  const endSession = (reason: SessionEndReason) => {
    setPaletteOpen(false);
    void logout().then(() => router.replace(`/yonetim/giris?neden=${reason}`));
  };


  // The middleware only serves this page to a signed-in admin; if the session ends while it is open,
  // go to the sign-in route (saying why).
  if (!user || !isAdmin) return <AdminShellSkeleton />;

  const searchFor = (id: AdminTabId) => (search?.tab === id ? search.value : '');
  const badge = (key?: BadgeKey) => (key && stats ? stats[key] : 0);

  const current = ADMIN_TABS.find((item) => item.id === tab);
  const today = new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="adm-shell" data-nav-open={navOpen}>
      <a className="adm-skip" href="#adm-main">
        İçeriğe geç
      </a>
      <aside className="adm-sidebar" id="adm-sidebar" aria-label="Yönetim menüsü">
        <div className="adm-sidebar__inner">
          <div className="adm-sidebar__brand">
            <span className="adm-sidebar__logo">PANDIONES</span>
            <span className="adm-sidebar__tag">Yönetim</span>
            <button type="button" className="adm-sidebar__close" onClick={() => setNavOpen(false)} aria-label="Menüyü kapat">
              <AdminIcon name="close" />
            </button>
          </div>
          <button type="button" className="adm-sidebar__search" onClick={() => setPaletteOpen(true)}>
            <AdminIcon name="search" />
            <span>Ara veya git</span>
            <kbd>Ctrl K</kbd>
          </button>
          <nav className="adm-nav">
            {ADMIN_GROUPS.map((group) => (
              <div key={group} className="adm-nav__group">
                <p className="adm-nav__heading">{group}</p>
                <ul>
                  {ADMIN_TABS.filter((item) => item.group === group).map((item) => {
                    const count = badge('badge' in item ? item.badge : undefined);
                    return (
                      <li key={item.id}>
                        <a
                          href={`/yonetim?tab=${item.id}`}
                          className="adm-nav__item"
                          aria-current={tab === item.id ? 'page' : undefined}
                          onClick={(event) => {
                            if (event.metaKey || event.ctrlKey || event.shiftKey) return;
                            event.preventDefault();
                            navigate(item.id);
                          }}
                        >
                          <AdminIcon name={item.id} />
                          <span className="adm-nav__label">{item.label}</span>
                          {count > 0 ? (
                            <span className="adm-nav__badge">
                              {count}
                              <span className="visually-hidden"> bekleyen</span>
                            </span>
                          ) : null}
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
          <div className="adm-sidebar__foot">
            <span className="adm-avatar" aria-hidden="true">
              {user.name.trim().charAt(0).toLocaleUpperCase('tr-TR')}
            </span>
            <p className="adm-sidebar__user">
              <span>{user.name}</span>
              <span>{user.email}</span>
            </p>
            <div className="adm-sidebar__links">
              <Link href="/" target="_blank" rel="noopener noreferrer" aria-label="Mağazayı aç (yeni sekmede açılır)" title="Mağazayı aç">
                <AdminIcon name="store" />
              </Link>
              <button type="button" onClick={logout} aria-label="Çıkış yap" title="Çıkış yap">
                <AdminIcon name="logout" />
              </button>
            </div>
          </div>
        </div>
      </aside>
      <button type="button" className="adm-scrim" aria-label="Menüyü kapat" tabIndex={-1} onClick={() => setNavOpen(false)} />

      <div className="adm-main" id="adm-main" tabIndex={-1}>
        <header className="adm-topbar">
          <button
            type="button"
            className="adm-topbar__menu"
            aria-expanded={navOpen}
            aria-controls="adm-sidebar"
            onClick={() => setNavOpen((open) => !open)}
          >
            <AdminIcon name="menu" />
            <span className="visually-hidden">Menü</span>
          </button>
          <div className="adm-topbar__meta">
            <span className="adm-eyebrow">{current?.group}</span>
            <span className="adm-topbar__date">{today}</span>
          </div>
          <button type="button" className="adm-pill adm-topbar__search" onClick={() => setPaletteOpen(true)}>
            <span>Ara</span>
            <kbd>Ctrl K</kbd>
            <span className="adm-pill__icon" aria-hidden="true">
              <AdminIcon name="search" />
            </span>
          </button>
        </header>

        <div className="adm-hero" key={tab}>
          <h1>{tabLabel(tab)}</h1>
          {TAB_LEADS[tab] ? <p>{TAB_LEADS[tab]}</p> : null}
        </div>

        <main id="main" className="adm-content" key={`content-${tab}`}>
          {tab === 'dashboard' && (
            <DashboardTab stats={stats} error={statsError} onRetry={() => setStatsKey((v) => v + 1)} onNavigate={navigate} />
          )}
          {tab === 'activity' && <ActivityTab />}
          {tab === 'orders' && <OrdersTab initialSearch={searchFor('orders')} />}
          {tab === 'returns' && <ReturnsTab />}
          {tab === 'coupons' && <CouponsTab />}
          {tab === 'gift-cards' && <GiftCardsTab />}
          {tab === 'products' && <ProductsTab initialSearch={searchFor('products')} />}
          {tab === 'categories' && <CategoriesTab onCategoryChanged={() => setStatsKey((v) => v + 1)} />}
          {tab === 'waitlist' && <WaitlistTab />}
          {tab === 'customers' && <CustomersTab onNavigateOrder={(orderNo) => navigate('orders', orderNo)} />}
          {tab === 'messages' && <MessagesTab onNavigateOrder={(orderNo) => navigate('orders', orderNo)} />}
          {tab === 'newsletter' && <NewsletterTab />}
          {tab === 'settings' && <SettingsTab onSaved={() => setStatsKey((v) => v + 1)} />}
          {tab === 'security' && <SecurityTab />}
        </main>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} onNavigate={navigate} />
      <SessionGuard onEnd={endSession} />
      <ReauthDialog />
    </div>
  );
}
