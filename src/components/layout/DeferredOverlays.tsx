'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useCart } from '@/context/CartContext';

// Each overlay renders nothing while closed, so its code is not needed for the first paint.
// They load as separate chunks: when first opened, or earlier once the browser is idle.
const loadMenu = () => import('@/components/modals/MenuModal');
const loadSearch = () => import('@/components/modals/SearchModal');
const loadBag = () => import('@/components/modals/BagDrawer');
const loadGuides = () => import('@/components/modals/GuideModals');

const MenuModal = dynamic(loadMenu, { ssr: false });
const SearchModal = dynamic(loadSearch, { ssr: false });
const BagDrawer = dynamic(loadBag, { ssr: false });
const GuideModals = dynamic(loadGuides, { ssr: false });

type Overlay = 'menu' | 'search' | 'bag' | 'guides';

export default function DeferredOverlays() {
  const { isMenuOpen, isSearchOpen, isBagOpen, activeGuide } = useCart();
  const [mounted, setMounted] = useState<Record<Overlay, boolean>>({ menu: false, search: false, bag: false, guides: false });

  const open: Record<Overlay, boolean> = { menu: isMenuOpen, search: isSearchOpen, bag: isBagOpen, guides: activeGuide !== null };

  useEffect(() => {
    setMounted((current) => {
      const next = { ...current };
      let changed = false;
      (Object.keys(open) as Overlay[]).forEach((key) => {
        if (open[key] && !next[key]) {
          next[key] = true;
          changed = true;
        }
      });
      return changed ? next : current;
    });
  }, [isMenuOpen, isSearchOpen, isBagOpen, activeGuide]); // eslint-disable-line react-hooks/exhaustive-deps

  // Warm the chunks on the visitor's first interaction, so the first open is instant but a page
  // nobody touches never pays for them (their CSS would also force a full style recalculation).
  useEffect(() => {
    const events = ['pointerdown', 'pointermove', 'touchstart', 'keydown', 'scroll'] as const;
    const warm = () => {
      events.forEach((name) => window.removeEventListener(name, warm));
      void loadMenu();
      void loadSearch();
      void loadBag();
      void loadGuides();
    };
    events.forEach((name) => window.addEventListener(name, warm, { once: true, passive: true }));
    return () => events.forEach((name) => window.removeEventListener(name, warm));
  }, []);

  return (
    <>
      {mounted.menu || isMenuOpen ? <MenuModal /> : null}
      {mounted.search || isSearchOpen ? <SearchModal /> : null}
      {mounted.bag || isBagOpen ? <BagDrawer /> : null}
      {mounted.guides || activeGuide !== null ? <GuideModals /> : null}
    </>
  );
}
