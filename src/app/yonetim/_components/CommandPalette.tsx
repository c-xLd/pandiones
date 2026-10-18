'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { tabsFor, type AdminTabId } from '../_lib/tabs';
import { useAuth } from '@/context/AuthContext';
import { money } from '../_lib/format';

type SearchResults = {
  orders: { id: string; orderNumber: string; customerName: string; totalAmount: number; status: string }[];
  products: { id: string; name: string; slug: string; status: string; price: number }[];
  customers: { id: string; name: string; email: string }[];
};

type Item = { key: string; group: string; title: string; meta?: string; run(): void };

const fold = (value: string) => value.toLocaleLowerCase('tr-TR');

/** Ctrl/⌘ + K: jump to a section, or search orders, products and customers (/api/admin/search). */
export default function CommandPalette({
  open,
  onClose,
  onNavigate,
}: {
  open: boolean;
  onClose(): void;
  onNavigate(tab: AdminTabId, search?: string): void;
}) {
  const role = useAuth().user?.role;
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    restoreRef.current = document.activeElement as HTMLElement | null;
    setQuery('');
    setResults(null);
    setActive(0);
    requestAnimationFrame(() => inputRef.current?.focus());
    return () => restoreRef.current?.focus?.();
  }, [open]);

  // Debounced server search; stale responses are dropped.
  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < 2) {
      setResults(null);
      setStatus('idle');
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setStatus('loading');
      try {
        const response = await fetch(`/api/admin/search?q=${encodeURIComponent(q)}`, { signal: controller.signal, cache: 'no-store' });
        const data = await response.json().catch(() => null);
        if (!response.ok || !data) throw new Error();
        setResults(data);
        setStatus('idle');
      } catch (error) {
        if ((error as Error).name !== 'AbortError') setStatus('error');
      }
    }, 180);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query, open]);

  const items = useMemo<Item[]>(() => {
    const q = fold(query.trim());
    const go = (tab: AdminTabId, search?: string) => () => {
      onNavigate(tab, search);
      onClose();
    };
    const sections: Item[] = tabsFor(role).filter((tab) => !q || fold(tab.label).includes(q)).map((tab) => ({
      key: `tab-${tab.id}`,
      group: 'Bölümler',
      title: tab.label,
      meta: tab.group,
      run: go(tab.id),
    }));
    if (!results) return sections;
    return [
      ...results.orders.map((order) => ({
        key: `order-${order.id}`,
        group: 'Siparişler',
        title: `#${order.orderNumber}`,
        meta: `${order.customerName} · ${money(order.totalAmount)}`,
        run: go('orders', order.orderNumber),
      })),
      ...results.products.map((product) => ({
        key: `product-${product.id}`,
        group: 'Ürünler',
        title: product.name,
        meta: `${product.status === 'DRAFT' ? 'Taslak' : 'Yayında'} · ${money(product.price)}`,
        run: go('products', product.name),
      })),
      ...results.customers.map((customer) => ({
        key: `customer-${customer.id}`,
        group: 'Müşteriler',
        title: customer.name,
        meta: customer.email,
        run: go('orders', customer.email),
      })),
      ...sections,
    ];
  }, [results, query, onNavigate, onClose, role]);

  useEffect(() => setActive(0), [items.length]);

  if (!open) return null;

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((index) => Math.min(index + 1, items.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((index) => Math.max(index - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      items[active]?.run();
    } else if (event.key === 'Tab') {
      event.preventDefault(); // the input is the only focus stop; arrows move through results
    }
  }

  const activeId = items[active] ? `palette-${items[active].key}` : undefined;
  let lastGroup = '';

  return (
    <div className="adm-palette" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="adm-palette__dialog" role="dialog" aria-modal="true" aria-label="Komut paleti" onKeyDown={onKeyDown}>
        <div className="adm-palette__search">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls="adm-palette-list"
            aria-activedescendant={activeId}
            aria-autocomplete="list"
            placeholder="Sipariş no, ürün, müşteri ya da bölüm ara…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <kbd>Esc</kbd>
        </div>
        <p className="visually-hidden" role="status" aria-live="polite">
          {status === 'loading' ? 'Aranıyor' : status === 'error' ? 'Arama yapılamadı' : `${items.length} sonuç`}
        </p>
        {status === 'error' ? <p className="adm-palette__note">Arama yapılamadı. Bağlantıyı kontrol edip tekrar yazın.</p> : null}
        {query.trim().length >= 2 && results && items.length === 0 ? <p className="adm-palette__note">Sonuç yok.</p> : null}
        <ul id="adm-palette-list" role="listbox" className="adm-palette__list" aria-label="Sonuçlar">
          {items.map((item, index) => {
            const heading = item.group !== lastGroup ? item.group : null;
            lastGroup = item.group;
            return (
              <React.Fragment key={item.key}>
                {heading ? (
                  <li role="presentation" className="adm-palette__group">
                    {heading}
                  </li>
                ) : null}
                <li
                  id={`palette-${item.key}`}
                  role="option"
                  aria-selected={index === active}
                  className="adm-palette__item"
                  onMouseMove={() => setActive(index)}
                  onClick={() => item.run()}
                >
                  <span>{item.title}</span>
                  {item.meta ? <span className="adm-palette__meta">{item.meta}</span> : null}
                </li>
              </React.Fragment>
            );
          })}
        </ul>
        <p className="adm-palette__foot" aria-hidden="true">
          <kbd>↑</kbd> <kbd>↓</kbd> gez · <kbd>Enter</kbd> aç
        </p>
      </div>
    </div>
  );
}
