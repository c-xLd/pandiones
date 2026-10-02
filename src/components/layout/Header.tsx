'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { useAuth } from '@/context/AuthContext';

/** Scroll distance (px) in one direction before the header hides or comes back. */
const HIDE_AFTER = 16;
const REVEAL_AFTER = 8;
/** Always visible near the top of the page. */
const TOP_ZONE = 96;
const SCROLLED_AT = 40;
const BUMP_MS = 450;

const setRootClass = (name: string, on: boolean) => {
  document.documentElement.classList.toggle(name, on);
};

export default function Header() {
  const pathname = usePathname();
  const { cartCount, isMenuOpen, isBagOpen, isSearchOpen, setIsMenuOpen, setIsBagOpen, setIsSearchOpen } = useCart();
  const { wishlistCount } = useWishlist();
  const { user } = useAuth();

  const [isScrolled, setIsScrolled] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [bagBump, setBagBump] = useState(false);
  const headerRef = useRef<HTMLElement | null>(null);
  const hiddenRef = useRef(false);
  const pinnedRef = useRef(false);

  const isHomepage = pathname === '/';
  // An open overlay needs its trigger in view, so the header stays put.
  const pinned = isMenuOpen || isBagOpen || isSearchOpen;

  useEffect(() => {
    pinnedRef.current = pinned;
    if (pinned && hiddenRef.current) {
      hiddenRef.current = false;
      setIsHidden(false);
    }
  }, [pinned]);

  // One passive listener; the work is a few comparisons and state changes only when a value flips.
  useEffect(() => {
    let lastY = Math.max(0, window.scrollY);
    let travel = 0;
    let direction = 0;

    const update = () => {
      const y = Math.max(0, window.scrollY);
      const delta = y - lastY;
      const nextDirection = Math.sign(delta);
      travel = nextDirection === direction ? travel + Math.abs(delta) : Math.abs(delta);
      if (nextDirection !== 0) direction = nextDirection;
      lastY = y;

      let hidden = hiddenRef.current;
      if (y <= TOP_ZONE || pinnedRef.current || headerRef.current?.contains(document.activeElement)) hidden = false;
      else if (direction > 0 && travel >= HIDE_AFTER) hidden = true;
      else if (direction < 0 && travel >= REVEAL_AFTER) hidden = false;

      if (hidden !== hiddenRef.current) {
        hiddenRef.current = hidden;
        setIsHidden(hidden);
      }
      setIsScrolled((prev) => (prev === y > SCROLLED_AT ? prev : y > SCROLLED_AT));
    };

    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);

  useEffect(() => setRootClass('header-is-hidden', isHidden), [isHidden]);
  useEffect(() => setRootClass('header-is-scrolled', isScrolled), [isScrolled]);

  // A small lift on the bag count when a piece is added.
  const lastCount = useRef(cartCount);
  useEffect(() => {
    if (cartCount > lastCount.current) {
      setBagBump(true);
      const timer = window.setTimeout(() => setBagBump(false), BUMP_MS);
      lastCount.current = cartCount;
      return () => window.clearTimeout(timer);
    }
    lastCount.current = cartCount;
  }, [cartCount]);

  const revealOnFocus = () => {
    if (!hiddenRef.current) return;
    hiddenRef.current = false;
    setIsHidden(false);
  };

  const accountHref = user
    ? '/hesabim'
    : pathname && pathname !== '/' && pathname !== '/giris-yap'
      ? `/giris-yap?redirect=${encodeURIComponent(pathname)}`
      : '/giris-yap';

  const searchButton = (className: string) => (
    <button type="button" className={`header-search ${className}`} aria-label="Ürün ara" onClick={() => setIsSearchOpen(true)}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="10" cy="10" r="6.5" />
        <path d="m15 15 6 6" />
      </svg>
      <span className="desktop">Ara</span>
    </button>
  );

  return (
    <header
      ref={headerRef}
      id="site-header"
      onFocus={revealOnFocus}
      className={[
        isScrolled ? 'scrolled' : '',
        isHidden ? 'header-hidden' : '',
        isHomepage ? 'homepage-header' : 'solid-header',
        isMenuOpen ? 'menu-expanded' : '',
      ].filter(Boolean).join(' ')}
    >
      <nav aria-label="Ana menü">
        <button
          id="menu-open"
          type="button"
          className={isMenuOpen ? 'menu-active' : ''}
          aria-label={isMenuOpen ? 'Menüyü kapat' : 'Menüyü aç'}
          aria-expanded={isMenuOpen}
          aria-controls="mega-menu-drawer"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          <span className="burger-icon" aria-hidden="true">
            <span className="burger-line burger-line-top" />
            <span className="burger-line burger-line-bottom" />
          </span>
          <span className="desktop">{isMenuOpen ? 'KAPAT' : 'MENÜ'}</span>
        </button>
        {searchButton('header-search--mobile')}
        <Link className="desktop" href="/yeni-gelenler">
          YENİ GELENLER
        </Link>
        <Link className="desktop" href="/ic-giyim">
          İÇ GİYİM
        </Link>
        <Link className="desktop" href="/ev-giyim">
          EV GİYİM
        </Link>
      </nav>

      <Link href="/" className="logo" aria-label="Pandiones ana sayfa">
        PANDIONES
      </Link>

      <nav aria-label="Alışveriş ve Hesap">
        {searchButton('header-search--desktop')}

        <Link href="/favorilerim" className="header-icon-link" aria-label={`Favorilerim, ${wishlistCount} ürün`}>
          <svg viewBox="0 0 24 24" aria-hidden="true" className="header-icon--sm">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
          {wishlistCount > 0 ? <span className="header-badge header-badge--favorite" aria-hidden="true">{wishlistCount}</span> : null}
        </Link>

        <Link href={accountHref} className="header-icon-link" aria-label={user ? 'Hesabım' : 'Giriş yap'}>
          <svg viewBox="0 0 24 24" aria-hidden="true" className="header-icon--sm">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          <span className="desktop header-account-name">
            {user ? (user.role === 'ADMIN' ? 'Yönetim' : user.name.split(' ')[0]) : 'Giriş'}
          </span>
        </Link>

        <button
          id="bag-open"
          type="button"
          aria-label={`Çantanı aç, ${cartCount} ürün`}
          onClick={() => setIsBagOpen(true)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 7h14l1 14H4L5 7Z M9 8V5a3 3 0 0 1 6 0v3" />
          </svg>
          <span className="desktop">Çanta</span>
          <span id="bag-count" className={bagBump ? 'is-bumped' : undefined}>{cartCount}</span>
        </button>
      </nav>
    </header>
  );
}
