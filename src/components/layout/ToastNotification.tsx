'use client';

import React from 'react';
import { useCart } from '@/context/CartContext';

export default function ToastNotification() {
  const { toastMessage } = useCart();

  return (
    <div
      id="toast"
      role="status"
      aria-live="polite"
      className={toastMessage ? 'show' : ''}
    >
      {toastMessage}
    </div>
  );
}
