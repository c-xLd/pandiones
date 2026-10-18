'use client';

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
// Loaded with this lazily imported overlay, not on first paint.
import '@/styles/layout/overlays.css';

interface CollectionLink {
  num: string;
  title: string;
  href: string;
}

const COLLECTIONS: CollectionLink[] = [
  { num: '01', title: 'Yeni Gelenler', href: '/yeni-gelenler' },
  { num: '02', title: 'İpek & Saten Kapsül', href: '/yeni-gelenler' },
  { num: '03', title: 'İç Giyim & Corsetry', href: '/ic-giyim' },
  { num: '04', title: 'Ev Giyim & Loungewear', href: '/ev-giyim' },
  { num: '05', title: 'Tüm Koleksiyon Arşivi', href: '/yeni-gelenler' },
];

const EDITORIAL_GUIDES = [
  { title: 'Beden Rehberi & Ölçü Kılavuzu', href: '/beden-rehberi' },
  { title: 'Kumaş & Bakım Felsefesi', href: '/bakim-rehberi' },
  { title: 'Stil Notları & Lookbook', href: '/stil-rehberi' },
  { title: 'Dijital Hediye Kartı', href: '/hediye-karti' },
];

const CLIENT_SERVICES = [
  { title: 'Sipariş & Kargo Takibi', href: '/siparis-takip' },
  { title: 'Yardım & Müşteri Deneyimi', href: '/yardim' },
];

export default function MenuModal() {
  const { isMenuOpen, setIsMenuOpen } = useCart();
  const { user } = useAuth();
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  /* Trap focus & close on Escape */
  useEffect(() => {
    if (!isMenuOpen) return;

    const timer = setTimeout(() => {
      closeBtnRef.current?.focus();
    }, 60);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsMenuOpen(false);
        const headerBtn = document.getElementById('menu-open');
        headerBtn?.focus();
      }

      if (e.key === 'Tab' && drawerRef.current) {
        const focusable = drawerRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('keydown', onKey);
    };
  }, [isMenuOpen, setIsMenuOpen]);

  if (!isMenuOpen) return null;

  return (
    <div
      className="modal-overlay quiet-menu-overlay"
      onClick={() => setIsMenuOpen(false)}
      role="presentation"
    >
      <div
        id="quiet-drawer"
        ref={drawerRef}
        className="quiet-drawer drawer-left"
        role="dialog"
        aria-modal="true"
        aria-label="Pandiones Editoryal Menü"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Top Bar ── */}
        <div className="quiet-topbar overlay-top">
          <Link
            href="/"
            className="quiet-wordmark overlay-wordmark"
            onClick={() => setIsMenuOpen(false)}
          >
            PANDIONES
          </Link>

          <button
            ref={closeBtnRef}
            className="quiet-close-btn overlay-close"
            type="button"
            aria-label="Menüyü kapat"
            onClick={() => setIsMenuOpen(false)}
          >
            <span>KAPAT</span>
            <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.25">
              <path strokeLinecap="round" d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        {/* ── Drawer Body ── */}
        <div className="quiet-body drawer-body">
          {/* 01. Koleksiyonlar */}
          <nav className="quiet-section" aria-label="Koleksiyonlar">
            <p className="quiet-eyebrow eyebrow">KOLEKSİYONLAR</p>
            <div className="quiet-collections-list discovery-links">
              {COLLECTIONS.map((c) => (
                <Link
                  key={c.num}
                  href={c.href}
                  className="quiet-collection-link"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <span className="quiet-col-num">{c.num}</span>
                  <span className="quiet-col-title">{c.title}</span>
                  <span className="quiet-arrow" aria-hidden="true">
                    ↗
                  </span>
                </Link>
              ))}
            </div>
          </nav>

          <div className="quiet-divider" />

          {/* 02. Rehberler & Kılavuz */}
          <nav className="quiet-section" aria-label="Rehberler ve Kılavuzlar">
            <p className="quiet-eyebrow eyebrow">REHBERLER &amp; KILAVUZ</p>
            <div className="quiet-secondary-links">
              {EDITORIAL_GUIDES.map((g) => (
                <Link
                  key={g.href}
                  href={g.href}
                  className="quiet-secondary-link"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <span>{g.title}</span>
                </Link>
              ))}
            </div>
          </nav>

          <div className="quiet-divider" />

          {/* 03. Hesap & Hizmetler */}
          <nav className="quiet-section" aria-label="Hesap ve Hizmetler">
            <p className="quiet-eyebrow eyebrow">HESAP &amp; HİZMETLER</p>
            <div className="quiet-secondary-links">
              <Link
                href={user ? '/hesabim' : '/giris-yap'}
                className="quiet-secondary-link quiet-secondary-link--account"
                onClick={() => setIsMenuOpen(false)}
              >
                <span>{user ? (user.role !== 'CUSTOMER' ? 'Yönetim Paneli' : 'Hesabım') : 'Giriş Yap / Üye Ol'}</span>
                <span className="quiet-arrow" aria-hidden="true">↗</span>
              </Link>
              {CLIENT_SERVICES.map((s) => (
                <Link
                  key={s.href}
                  href={s.href}
                  className="quiet-secondary-link"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <span>{s.title}</span>
                </Link>
              ))}
            </div>
          </nav>
        </div>

        {/* ── Quiet Brand Sign-off ── */}
        <div className="quiet-footer">
          <p className="quiet-footer-tagline">
            Zamansız zarafet, saf dokunuş ve sessiz lüks.
          </p>
          <span className="quiet-footer-copy">
            © Pandiones
          </span>
        </div>
      </div>
    </div>
  );
}
