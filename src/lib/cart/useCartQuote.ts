'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useCart } from '@/context/CartContext';
import type { CartItem } from '@/types';
import { cartLineKey, isBlockingStatus, type CartLineQuote } from './quote';

type QuoteStatus = 'idle' | 'loading' | 'ready' | 'error';

const QUOTE_DEBOUNCE_MS = 400;

export const isGiftCardItem = (item: CartItem) =>
  item.slug === 'hediye-karti' ||
  item.category === 'hediye-karti' ||
  item.slug.startsWith('dijital-hediye-karti') ||
  item.id === 'pandiones-gift-card';

/**
 * Quotes the local cart against the catalog (POST /api/cart/validate) whenever its lines
 * change, writes changed prices back into the cart, and exposes per-line status. The
 * server still recomputes everything when the order is created.
 */
export function useCartQuote() {
  const { cart, isLoaded, syncPrices } = useCart();
  const [status, setStatus] = useState<QuoteStatus>('idle');
  const [lines, setLines] = useState<Record<string, CartLineQuote>>({});
  const [repricedFrom, setRepricedFrom] = useState<Record<string, number>>({});
  const [attempt, setAttempt] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  const catalogItems = useMemo(() => cart.filter((item) => !isGiftCardItem(item)), [cart]);
  const signature = catalogItems.map((i) => `${i.slug}:${i.size}:${i.quantity}:${i.price}`).join('|');

  useEffect(() => {
    if (!isLoaded) return;
    if (catalogItems.length === 0) {
      setLines({});
      setStatus('ready');
      return;
    }
    setStatus('loading');
    const timer = window.setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const res = await fetch('/api/cart/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            items: catalogItems.map(({ id, slug, size, quantity, price }) => ({ id, slug, size, quantity, price })),
          }),
        });
        if (!res.ok) throw new Error(`quote ${res.status}`);
        const data: { lines: CartLineQuote[] } = await res.json();
        setLines(Object.fromEntries(data.lines.map((l) => [l.key, l])));
        setStatus('ready');

        // Persist catalog prices so the drawer, /canta and /odeme show the same amounts.
        const repriced = catalogItems.flatMap((item) => {
          const line = data.lines.find((l) => l.key === cartLineKey(item.slug, item.size));
          return line?.status === 'price-changed' && line.price !== null
            ? [{ slug: item.slug, size: item.size, price: line.price, from: item.price, key: line.key }]
            : [];
        });
        if (repriced.length > 0) {
          setRepricedFrom((prev) => ({ ...prev, ...Object.fromEntries(repriced.map((r) => [r.key, r.from])) }));
          syncPrices(repriced);
        }
      } catch (error) {
        if ((error as Error).name === 'AbortError') return;
        setStatus('error');
      }
    }, QUOTE_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, signature, attempt]);

  const quoteFor = useCallback(
    (item: CartItem) => (isGiftCardItem(item) ? undefined : lines[cartLineKey(item.slug, item.size)]),
    [lines],
  );

  const unitPrice = useCallback((item: CartItem) => quoteFor(item)?.price ?? item.price, [quoteFor]);
  const previousPrice = (item: CartItem) => repricedFrom[cartLineKey(item.slug, item.size)];
  const subtotal = cart.reduce((sum, item) => sum + unitPrice(item) * item.quantity, 0);
  const blockingCount = cart.filter((item) => {
    const q = quoteFor(item);
    return q ? isBlockingStatus(q.status) : false;
  }).length;

  return {
    status,
    isQuoting: status === 'loading' || (status === 'idle' && catalogItems.length > 0),
    quoteFor,
    unitPrice,
    previousPrice,
    subtotal,
    blockingCount,
    retry: () => setAttempt((n) => n + 1),
  };
}
