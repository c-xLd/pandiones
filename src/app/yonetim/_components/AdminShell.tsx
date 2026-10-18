'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import AdminShellSkeleton from './AdminShellSkeleton';
import SessionGuard, { type SessionEndReason } from './SessionGuard';
import ReauthDialog from './ReauthDialog';
import CommandPalette from './CommandPalette';
import AdminIcon from './AdminIcon';
import type { AdminStats } from './DashboardTab';
import { ADMIN_TABS, groupsFor, tabLabel, tabsFor, type AdminTabId, type BadgeKey } from '../_lib/tabs';

// Route stylesheets
import '@/styles/pages/admin-shell.css';
import '@/styles/pages/admin-content.css';
import '@/styles/pages/admin-product-editor.css';
import '@/styles/layout/overlays.css';

export interface AdminShellProps {
  currentTab?: AdminTabId;
  eyebrow?: string;
  title: React.ReactNode;
  lead?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  stats?: AdminStats | null;
  onNavigateTab?(tab: AdminTabId, search?: string): void;
}

export default function AdminShell({
  currentTab = 'products',
  eyebrow,
  title,
  lead,
  actions,
  children,
  stats: externalStats,
  onNavigateTab,
}: AdminShellProps) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [internalStats, setInternalStats] = useState<AdminStats | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);

  const isAdmin = user?.role === 'ADMIN';
  const isPanel = isAdmin || user?.role === 'STAFF';

  // Stats for badges if not passed from parent
  useEffect(() => {
    if (!isAdmin || externalStats !== undefined) return;
    let cancelled = false;
    fetch('/api/admin/stats', { cache: 'no-store' })
      .then(async (response) => {
        const data = await response.json().catch(() => null);
        if (response.ok && data?.dashboard && !cancelled) {
          setInternalStats(data);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isAdmin, externalStats]);

  const stats = externalStats !== undefined ? externalStats : internalStats;

  // Global Ctrl + K listener
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

  // Escape closes mobile nav
  useEffect(() => {
    if (!navOpen) return;
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setNavOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navOpen]);

  // Auth redirect
  useEffect(() => {
    if (!loading && !isPanel) router.replace('/yonetim/giris');
  }, [loading, isPanel, router]);

  const endSession = useCallback(
    (reason: SessionEndReason) => {
      setPaletteOpen(false);
      void logout().then(() => router.replace(`/yonetim/giris?neden=${reason}`));
    },
    [logout, router],
  );

  const handleNavigate = useCallback(
    (next: AdminTabId, value?: string) => {
      setNavOpen(false);
      if (onNavigateTab) {
        onNavigateTab(next, value);
      } else {
        const url = new URL('/yonetim', window.location.origin);
        url.searchParams.set('tab', next);
        if (value) url.searchParams.set('q', value);
        router.push(url.pathname + url.search);
      }
    },
    [onNavigateTab, router],
  );

  if (loading || !user || !isPanel) return <AdminShellSkeleton />;

  const badge = (key?: BadgeKey) => (key && stats ? stats[key] : 0);
  const currentItem = ADMIN_TABS.find((item) => item.id === currentTab);
  const groupLabel = eyebrow || currentItem?.group || 'Katalog';
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
                          href={`/yonetim?tab=${item.id}`}
                          className="adm-nav__item"
                          aria-current={currentTab === item.id ? 'page' : undefined}
                          onClick={(event) => {
                            if (event.metaKey || event.ctrlKey || event.shiftKey) return;
                            event.preventDefault();
                            handleNavigate(item.id);
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
            <span className="adm-eyebrow">{groupLabel}</span>
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

        <div className={`adm-hero${actions ? ' adm-hero--actions' : ''}`}>
          <div className="adm-hero__row">
            <div>
              <h1>{title}</h1>
              {lead ? <p>{lead}</p> : null}
            </div>
            {actions ? <div className="adm-hero__actions">{actions}</div> : null}
          </div>
        </div>

        <main id="main" className="adm-content">
          {children}
        </main>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} onNavigate={handleNavigate} />
      <SessionGuard onEnd={endSession} />
      <ReauthDialog />
    </div>
  );
}
