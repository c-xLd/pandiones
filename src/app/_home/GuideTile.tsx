'use client';

import React from 'react';
import { useCart } from '@/context/CartContext';

/** A service tile that opens one of the guide panels (beden / kumaş) instead of navigating. */
export default function GuideTile({ guide, children }: { guide: 'size' | 'fabric'; children: React.ReactNode }) {
  const { setActiveGuide } = useCart();
  return (
    <button className="service-tile" type="button" onClick={() => setActiveGuide(guide)}>
      {children}
    </button>
  );
}
