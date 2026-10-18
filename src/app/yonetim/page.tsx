'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import AdminShellSkeleton from './_components/AdminShellSkeleton';
import SessionGuard, { type SessionEndReason } from './_components/SessionGuard';
import type { AdminStats } from './_components/DashboardTab';
import AdminIcon from './_components/AdminIcon';
import { TabLoading } from './_components/TabState';
import DashboardSkeleton from './_components/skeletons/DashboardSkeleton';
import OrdersSkeleton from './_components/skeletons/OrdersSkeleton';
import ProductsSkeleton from './_components/skeletons/ProductsSkeleton';
import SettingsSkeleton from './_components/skeletons/SettingsSkeleton';
import { ADMIN_TABS, canOpenTab, defaultTab, groupsFor, parseTab, tabLabel, tabsFor, type AdminTabId, type BadgeKey } from './_lib/tabs';

// Lazy-loaded heavy tabs with matching 1:1 geometric skeletons
const DashboardTab = dynamic(() => import('./_components/DashboardTab'), {
  loading: () => <DashboardSkeleton />,
});
const OrdersTab = dynamic(() => import('./_tabs/OrdersTab'), {
  loading: () => <OrdersSkeleton />,
});
const ProductsTab = dynamic(() => import('./_tabs/ProductsTab'), {
  loading: () => <ProductsSkeleton />,
});
const SettingsTab = dynamic(() => import('./_components/SettingsTab'), {
  loading: () => <SettingsSkeleton />,
});
const CategoriesTab = dynamic(() => import('./_tabs/CategoriesTab'), {
  loading: () => <TabLoading label="Kategoriler yükleniyor" tab="categories" />,
});
const CustomersTab = dynamic(() => import('./_tabs/CustomersTab'), {
  loading: () => <TabLoading label="Müşteriler yükleniyor" tab="customers" />,
});
const CouponsTab = dynamic(() => import('./_tabs/CouponsTab'), {
  loading: () => <TabLoading label="Kuponlar yükleniyor" tab="coupons" />,
});
const ReturnsTab = dynamic(() => import('./_tabs/ReturnsTab'), {
  loading: () => <TabLoading label="İade talepleri yükleniyor" tab="returns" />,
});
const GiftCardsTab = dynamic(() => import('./_tabs/GiftCardsTab'), {
  loading: () => <TabLoading label="Hediye kartları yükleniyor" tab="gift-cards" />,
});
const WaitlistTab = dynamic(() => import('./_tabs/WaitlistTab'), {
  loading: () => <TabLoading label="Stok talepleri yükleniyor" tab="waitlist" />,
});
const MessagesTab = dynamic(() => import('./_tabs/MessagesTab'), {
  loading: () => <TabLoading label="Mesajlar yükleniyor" tab="messages" />,
});
const NewsletterTab = dynamic(() => import('./_tabs/NewsletterTab'), {
  loading: () => <TabLoading label="Bülten aboneleri yükleniyor" tab="newsletter" />,
});
const ActivityTab = dynamic(() => import('./_components/ActivityTab'), {
  loading: () => <TabLoading label="Etkinlik kaydı yükleniyor" tab="activity" />,
});
const SecurityTab = dynamic(() => import('./_components/SecurityTab'), {
  loading: () => <TabLoading label="Güvenlik kayıtları yükleniyor" tab="security" />,
});

// Lazy-loaded dialogs
const CommandPalette = dynamic(() => import('./_components/CommandPalette'), { ssr: false });
const ReauthDialog = dynamic(() => import('./_components/ReauthDialog'), { ssr: false });

// Route stylesheets
import '@/styles/pages/admin-shell.css';
import '@/styles/pages/admin-content.css';
import '@/styles/pages/admin-product-editor.css';
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

/** Reads URL synchronously so navigation to ?tab=orders never mounts fake dashboard */
const getInitialTab = (): AdminTabId => {
  if (typeof window !== 'undefined') {
    const fromUrl = new URLSearchParams(window.location.search).get('tab');
    if (fromUrl) return parseTab(fromUrl);
  }
  return 'dashboard';
};

export default function YonetimPage() {
  const { user, loading, logout } = useAuth();
  const [tab, setTab] = useState<AdminTabId>(getInitialTab);
  const [mountedTabs, setMountedTabs] = useState<Set<AdminTabId>>(() => new Set([getInitialTab()]));
  const [search, setSearch] = useState<{ value: string; tab: AdminTabId } | null>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [statsKey, setStatsKey] = useState(0);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const router = useRouter();
  const isAdmin = user?.role === 'ADMIN';
  // Staff use the panel too, with their own tabs (lib/security/roles.ts).
  const isPanel = isAdmin || user?.role === 'STAFF';

  // ?tab= is the source of truth on back/forward.
  useEffect(() => {
    const sync = () => {
      const nextTab = parseTab(new URLSearchParams(window.location.search).get('tab'));
      setTab(nextTab);
      setMountedTabs((prev) => (prev.has(nextTab) ? prev : new Set(prev).add(nextTab)));
    };
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, []);

  const navigate = useCallback((next: AdminTabId, value?: string) => {
    setTab(next);
    setMountedTabs((prev) => (prev.has(next) ? prev : new Set(prev).add(next)));
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

  const prevTabRef = useRef<AdminTabId>(tab);
  useEffect(() => {
    if (prevTabRef.current !== tab) {
      if (tab === 'dashboard') setStatsKey((v) => v + 1);
      prevTabRef.current = tab;
    }
  }, [tab]);

  useEffect(() => {
    if (!isPanel) return;
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isPanel]);

  useEffect(() => {
    if (!navOpen) return;
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setNavOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navOpen]);

  useEffect(() => {
    if (!loading && !isPanel) router.replace('/yonetim/giris');
  }, [loading, isPanel, router]);

  // A tab that is not this role's (an old link, ?tab=settings for staff) opens their default tab instead.
  useEffect(() => {
    if (user && isPanel && !canOpenTab(user.role, tab)) navigate(defaultTab(user.role));
  }, [user, isPanel, tab, navigate]);

  if (loading) return <AdminShellSkeleton />;

  const endSession = (reason: SessionEndReason) => {
    setPaletteOpen(false);
    void logout().then(() => router.replace(`/yonetim/giris?neden=${reason}`));
  };

  // The middleware only serves this page to a signed-in admin; if the session ends while it is open,
  // go to the sign-in route (saying why).
  if (!user || !isPanel) return <AdminShellSkeleton />;

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
            {groupsFor(user.role).map((group) => (
              <div key={group} className="adm-nav__group">
                <p className="adm-nav__heading">{group}</p>
                <ul>
                  {tabsFor(user.role).filter((item) => item.group === group).map((item) => {
                    const count = badge('badge' in item ? item.badge : undefined);
                    return (
                      <li key={item.id}>
                        <a
                          id={`tab-${item.id}`}
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

        <main id="main" className="adm-content">
          {mountedTabs.has('dashboard') && canOpenTab(user.role, 'dashboard') && (
            <div
              key="dashboard"
              id="tabpanel-dashboard"
              role="tabpanel"
              aria-labelledby="tab-dashboard"
              hidden={tab !== 'dashboard'}
              style={tab !== 'dashboard' ? { display: 'none' } : undefined}
            >
              <DashboardTab stats={stats} error={statsError} onRetry={() => setStatsKey((v) => v + 1)} onNavigate={navigate} />
            </div>
          )}
          {mountedTabs.has('activity') && canOpenTab(user.role, 'activity') && (
            <div
              key="activity"
              id="tabpanel-activity"
              role="tabpanel"
              aria-labelledby="tab-activity"
              hidden={tab !== 'activity'}
              style={tab !== 'activity' ? { display: 'none' } : undefined}
            >
              <ActivityTab />
            </div>
          )}
          {mountedTabs.has('orders') && canOpenTab(user.role, 'orders') && (
            <div
              key="orders"
              id="tabpanel-orders"
              role="tabpanel"
              aria-labelledby="tab-orders"
              hidden={tab !== 'orders'}
              style={tab !== 'orders' ? { display: 'none' } : undefined}
            >
              <OrdersTab initialSearch={searchFor('orders')} />
            </div>
          )}
          {mountedTabs.has('returns') && canOpenTab(user.role, 'returns') && (
            <div
              key="returns"
              id="tabpanel-returns"
              role="tabpanel"
              aria-labelledby="tab-returns"
              hidden={tab !== 'returns'}
              style={tab !== 'returns' ? { display: 'none' } : undefined}
            >
              <ReturnsTab />
            </div>
          )}
          {mountedTabs.has('coupons') && canOpenTab(user.role, 'coupons') && (
            <div
              key="coupons"
              id="tabpanel-coupons"
              role="tabpanel"
              aria-labelledby="tab-coupons"
              hidden={tab !== 'coupons'}
              style={tab !== 'coupons' ? { display: 'none' } : undefined}
            >
              <CouponsTab />
            </div>
          )}
          {mountedTabs.has('gift-cards') && canOpenTab(user.role, 'gift-cards') && (
            <div
              key="gift-cards"
              id="tabpanel-gift-cards"
              role="tabpanel"
              aria-labelledby="tab-gift-cards"
              hidden={tab !== 'gift-cards'}
              style={tab !== 'gift-cards' ? { display: 'none' } : undefined}
            >
              <GiftCardsTab />
            </div>
          )}
          {mountedTabs.has('products') && canOpenTab(user.role, 'products') && (
            <div
              key="products"
              id="tabpanel-products"
              role="tabpanel"
              aria-labelledby="tab-products"
              hidden={tab !== 'products'}
              style={tab !== 'products' ? { display: 'none' } : undefined}
            >
              <ProductsTab initialSearch={searchFor('products')} />
            </div>
          )}
          {mountedTabs.has('categories') && canOpenTab(user.role, 'categories') && (
            <div
              key="categories"
              id="tabpanel-categories"
              role="tabpanel"
              aria-labelledby="tab-categories"
              hidden={tab !== 'categories'}
              style={tab !== 'categories' ? { display: 'none' } : undefined}
            >
              <CategoriesTab onCategoryChanged={() => setStatsKey((v) => v + 1)} />
            </div>
          )}
          {mountedTabs.has('waitlist') && canOpenTab(user.role, 'waitlist') && (
            <div
              key="waitlist"
              id="tabpanel-waitlist"
              role="tabpanel"
              aria-labelledby="tab-waitlist"
              hidden={tab !== 'waitlist'}
              style={tab !== 'waitlist' ? { display: 'none' } : undefined}
            >
              <WaitlistTab />
            </div>
          )}
          {mountedTabs.has('customers') && canOpenTab(user.role, 'customers') && (
            <div
              key="customers"
              id="tabpanel-customers"
              role="tabpanel"
              aria-labelledby="tab-customers"
              hidden={tab !== 'customers'}
              style={tab !== 'customers' ? { display: 'none' } : undefined}
            >
              <CustomersTab onNavigateOrder={(orderNo) => navigate('orders', orderNo)} />
            </div>
          )}
          {mountedTabs.has('messages') && canOpenTab(user.role, 'messages') && (
            <div
              key="messages"
              id="tabpanel-messages"
              role="tabpanel"
              aria-labelledby="tab-messages"
              hidden={tab !== 'messages'}
              style={tab !== 'messages' ? { display: 'none' } : undefined}
            >
              <MessagesTab onNavigateOrder={(orderNo) => navigate('orders', orderNo)} />
            </div>
          )}
          {mountedTabs.has('newsletter') && canOpenTab(user.role, 'newsletter') && (
            <div
              key="newsletter"
              id="tabpanel-newsletter"
              role="tabpanel"
              aria-labelledby="tab-newsletter"
              hidden={tab !== 'newsletter'}
              style={tab !== 'newsletter' ? { display: 'none' } : undefined}
            >
              <NewsletterTab />
            </div>
          )}
          {mountedTabs.has('settings') && canOpenTab(user.role, 'settings') && (
            <div
              key="settings"
              id="tabpanel-settings"
              role="tabpanel"
              aria-labelledby="tab-settings"
              hidden={tab !== 'settings'}
              style={tab !== 'settings' ? { display: 'none' } : undefined}
            >
              <SettingsTab onSaved={() => setStatsKey((v) => v + 1)} />
            </div>
          )}
          {mountedTabs.has('security') && canOpenTab(user.role, 'security') && (
            <div
              key="security"
              id="tabpanel-security"
              role="tabpanel"
              aria-labelledby="tab-security"
              hidden={tab !== 'security'}
              style={tab !== 'security' ? { display: 'none' } : undefined}
            >
              <SecurityTab />
            </div>
          )}
        </main>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} onNavigate={navigate} />
      <SessionGuard onEnd={endSession} />
      <ReauthDialog />
    </div>
  );
}
