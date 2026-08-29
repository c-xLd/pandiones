'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

export default function CartIndicator() {
  const [count, setCount] = useState(0);
  const [pulse, setPulse] = useState(false);
  const previous = useRef<number | null>(null);

  useEffect(() => {
    const sync = async () => {
      const response = await fetch('/api/cart', { cache: 'no-store' });
      if (response.ok) {
        const data = await response.json() as { count: number };
        if (previous.current !== null && data.count > previous.current) {
          setPulse(true);
          window.setTimeout(() => setPulse(false), 700);
        }
        previous.current = data.count;
        setCount(data.count);
      }
    };
    void sync();
    window.addEventListener('pandiones:cart', sync);
    return () => window.removeEventListener('pandiones:cart', sync);
  }, []);

  return (
    <Link className={`shop-cart-link ${pulse ? 'cart-pulse' : ''}`} href="/sepet" aria-label={`Alışveriş çantası, ${count} ürün`} prefetch={true}>
      Çanta <span>{count}</span>
    </Link>
  );
}

