'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { useAuth } from '@/context/AuthContext';

export default function Header() {
  const pathname = usePathname();
  const { cartCount, setIsMenuOpen, setIsBagOpen, setIsSearchOpen } = useCart();
  const { wishlistCount } = useWishlist();
  const { user } = useAuth();

  const [isScrolled, setIsScrolled] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const lastScrollY = useRef(0);
  const travel = useRef(0);
  const lastDirection = useRef(0);

  const isHomepage = pathname === '/';

  useEffect(() => {
    const handleScroll = () => {
      const y = Math.max(0, window.scrollY);
      const delta = y - lastScrollY.current;
      const direction = Math.sign(delta);

      if (direction === lastDirection.current) {
        travel.current += Math.abs(delta);
      } else {
        travel.current = Math.abs(delta);
      }

      let hidden = isHidden;
      if (y <= 96) {
        hidden = false;
      } else if (travel.current >= 12 && direction !== 0) {
        hidden = direction > 0;
      }

      setIsHidden(hidden);
      setIsScrolled(y > 40);

      lastScrollY.current = y;
      if (direction !== 0) lastDirection.current = direction;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isHidden]);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      if (isHidden) {
        document.documentElement.classList.add('header-is-hidden');
      } else {
        document.documentElement.classList.remove('header-is-hidden');
      }
    }
  }, [isHidden]);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      if (isScrolled) {
        document.documentElement.classList.add('header-is-scrolled');
      } else {
        document.documentElement.classList.remove('header-is-scrolled');
      }
    }
  }, [isScrolled]);

  return (
    <header
      id="site-header"
      className={`${isScrolled ? 'scrolled' : ''} ${isHidden ? 'header-hidden' : ''} ${isHomepage ? 'homepage-header' : 'solid-header'}`}
    >
      <nav aria-label="Ana menü">
        <button
          id="menu-open"
          type="button"
          aria-label="Menüyü aç"
          onClick={() => setIsMenuOpen(true)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3 8h18M3 16h18" />
          </svg>
          <span className="desktop">Menü</span>
        </button>
        <Link className="desktop" href="/koleksiyon/yeni-gelenler">
          YENİ GELENLER
        </Link>
        <Link className="desktop" href="/koleksiyon/ic-giyim">
          İÇ GİYİM
        </Link>
        <Link className="desktop" href="/koleksiyon/ev-giyim">
          EV GİYİM
        </Link>
      </nav>

      <Link href="/" className="logo" aria-label="Pandiones ana sayfa">
        PANDIONES
      </Link>

      <nav aria-label="Alışveriş ve Hesap">
        <button
          id="search-open"
          type="button"
          aria-label="Ürün ara"
          onClick={() => setIsSearchOpen(true)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="10" cy="10" r="6.5" />
            <path d="m15 15 6 6" />
          </svg>
          <span className="desktop">Ara</span>
        </button>

        {/* Favoriler (Wishlist) */}
        <Link
          href="/favorilerim"
          aria-label={`Favorilerim, ${wishlistCount} ürün`}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', position: 'relative' }}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" style={{ width: '21px', height: '21px' }}>
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
          {wishlistCount > 0 && (
            <span
              style={{
                position: 'absolute',
                top: '5px',
                right: '-6px',
                fontSize: '9px',
                background: '#e11d48',
                color: '#fff',
                borderRadius: '10px',
                padding: '1px 4px',
                lineHeight: 1,
              }}
            >
              {wishlistCount}
            </span>
          )}
        </Link>

        {/* Hesabım / Giriş */}
        <Link
          href={user ? '/hesabim' : '/giris-yap'}
          aria-label={user ? 'Hesabım' : 'Giriş Yap'}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" style={{ width: '21px', height: '21px' }}>
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          <span className="desktop" style={{ fontSize: '11px' }}>
            {user ? (user.role === 'ADMIN' ? 'Yönetim' : user.name.split(' ')[0]) : 'Giriş'}
          </span>
        </Link>

        {/* Çanta (Cart) */}
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
          <span id="bag-count">{cartCount}</span>
        </button>
      </nav>
    </header>
  );
}
