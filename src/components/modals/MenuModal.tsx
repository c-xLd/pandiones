'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';

export default function MenuModal() {
  const { isMenuOpen, setIsMenuOpen } = useCart();

  /* Trap focus & close on Escape */
  useEffect(() => {
    if (!isMenuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMenuOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isMenuOpen, setIsMenuOpen]);

  if (!isMenuOpen) return null;

  return (
    <div
      className="modal-overlay"
      onClick={() => setIsMenuOpen(false)}
      role="presentation"
    >
      <div
        className="drawer-left"
        role="dialog"
        aria-modal="true"
        aria-label="Navigasyon menüsü"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Top bar ── */}
        <div className="overlay-top">
          <span className="overlay-wordmark">PANDIONES</span>
          <button
            className="overlay-close"
            type="button"
            aria-label="Menüyü kapat"
            onClick={() => setIsMenuOpen(false)}
          >
            <span>Kapat</span>
            <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        {/* ── Body ── */}
        <div className="drawer-body">
          <p className="eyebrow drawer-eyebrow">SANA YAKIN BİR DÜNYA</p>

          <nav className="discovery-links" aria-label="Ana navigasyon">
            <Link
              href="/koleksiyon"
              onClick={() => setIsMenuOpen(false)}
            >
              <span>Tüm koleksiyon</span>
              <span className="discovery-arrow" aria-hidden="true">↗</span>
            </Link>
            <Link
              href="/koleksiyon/yeni-gelenler"
              onClick={() => setIsMenuOpen(false)}
            >
              <span>Yeni gelenler</span>
              <span className="discovery-arrow" aria-hidden="true">↗</span>
            </Link>
            <Link
              href="/koleksiyon/ic-giyim"
              onClick={() => setIsMenuOpen(false)}
            >
              <span>İç giyim</span>
              <span className="discovery-arrow" aria-hidden="true">↗</span>
            </Link>
            <Link
              href="/koleksiyon/ev-giyim"
              onClick={() => setIsMenuOpen(false)}
            >
              <span>Ev giyim</span>
              <span className="discovery-arrow" aria-hidden="true">↗</span>
            </Link>
            <Link
              href="/beden-rehberi"
              onClick={() => setIsMenuOpen(false)}
            >
              <span>Beden rehberi &amp; Hesaplayıcı</span>
              <span className="discovery-arrow" aria-hidden="true">↗</span>
            </Link>
            <Link
              href="/stil-rehberi"
              onClick={() => setIsMenuOpen(false)}
            >
              <span>Stil rehberi</span>
              <span className="discovery-arrow" aria-hidden="true">↗</span>
            </Link>
            <Link
              href="/bakim-rehberi"
              onClick={() => setIsMenuOpen(false)}
            >
              <span>Kumaş &amp; Bakım rehberi</span>
              <span className="discovery-arrow" aria-hidden="true">↗</span>
            </Link>
            <Link
              href="/hediye-karti"
              onClick={() => setIsMenuOpen(false)}
            >
              <span>Dijital hediye kartı</span>
              <span className="discovery-arrow" aria-hidden="true">↗</span>
            </Link>
            <Link
              href="/siparis-takip"
              onClick={() => setIsMenuOpen(false)}
            >
              <span>Sipariş takibi</span>
              <span className="discovery-arrow" aria-hidden="true">↗</span>
            </Link>
            <Link
              href="/yardim"
              onClick={() => setIsMenuOpen(false)}
            >
              <span>Yardım &amp; SSS</span>
              <span className="discovery-arrow" aria-hidden="true">↗</span>
            </Link>
          </nav>

          {/* ── Feature card ── */}
          <Link
            className="menu-feature"
            href="/koleksiyon/ev-giyim"
            onClick={() => setIsMenuOpen(false)}
          >
            <img
              src="/assets/campaign-seated.jpeg"
              alt="Pandiones editoryal giyim koleksiyonu"
            />
            <div className="menu-feature-scrim">
              <span className="eyebrow">YENİ SEÇKİ</span>
              <p className="menu-feature-tagline">Kendi ritminde.</p>
              <span className="menu-feature-cta">Koleksiyonu keşfet ↗</span>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
