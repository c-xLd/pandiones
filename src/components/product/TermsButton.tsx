'use client';

import React from 'react';
import { useCart } from '@/context/CartContext';

/** Opens the sales terms panel from the product page's "Bilmen gerekenler" list. */
export default function TermsButton() {
  const { setActiveGuide } = useCart();
  return (
    <button type="button" className="pdp-lower-terms" onClick={() => setActiveGuide('terms')}>
      Satış koşullarını incele
    </button>
  );
}
