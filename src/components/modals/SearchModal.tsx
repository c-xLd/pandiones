'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { Product } from '@/types';
// Loaded with this lazily imported overlay, not on first paint.
import '@/styles/layout/overlays.css';

export default function SearchModal() {
  const { isSearchOpen, setIsSearchOpen } = useCart();
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [filtered, setFiltered] = useState<Product[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  /* ── Auto-focus input when opened ── */
  useEffect(() => {
    if (isSearchOpen) {
      const timer = setTimeout(() => inputRef.current?.focus(), 80);
      return () => clearTimeout(timer);
    }
  }, [isSearchOpen]);

  /* ── Fetch products when modal opens ── */
  useEffect(() => {
    if (isSearchOpen) {
      fetch('/api/products')
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setProducts(data);
            setFiltered(data);
          }
        })
        .catch(() => {});
    }
  }, [isSearchOpen]);

  /* ── Escape key ── */
  useEffect(() => {
    if (!isSearchOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsSearchOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isSearchOpen, setIsSearchOpen]);

  if (!isSearchOpen) return null;

  /* ── Turkish-aware normalizer ── */
  const normalize = (str: string) =>
    str
      .toLocaleLowerCase('tr')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/ı/g, 'i');

  /* ── Filter on query change ── */
  const handleQueryChange = (val: string) => {
    setQuery(val);
    if (!val.trim()) {
      setFiltered(products);
      return;
    }
    const terms = normalize(val.trim()).split(/\s+/).filter(Boolean);
    setFiltered(
      products.filter((p) => {
        const text = normalize(
          `${p.name} ${p.color} ${p.category === 'ic-giyim' ? 'iç giyim takım' : 'ev giyim pijama'}`
        );
        return terms.every((term) => text.includes(term));
      })
    );
  };

  /* ── Price formatter ── */
  const money = (n: number) =>
    new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      maximumFractionDigits: 0,
    }).format(n);

  const SUGGESTIONS = ['Dantel', 'Saten', 'Fildişi', 'Siyah', 'Kahve'];

  return (
    <div
      className="modal-overlay"
      onClick={() => setIsSearchOpen(false)}
      role="presentation"
    >
      <div
        className="search-modal-box"
        role="dialog"
        aria-modal="true"
        aria-label="Ürün arama"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Top bar ── */}
        <div className="overlay-top">
          <span className="overlay-wordmark">PANDIONES</span>
          <button
            className="overlay-close"
            type="button"
            aria-label="Aramayı kapat"
            onClick={() => setIsSearchOpen(false)}
          >
            <span>Kapat</span>
            <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        {/* ── Search input ── */}
        <div className="search-input-wrap">
          <input
            ref={inputRef}
            type="search"
            placeholder="Ürün, renk veya koleksiyon ara…"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            aria-label="Ürün ara"
          />
        </div>

        {/* ── Suggestion chips ── */}
        <div className="search-suggestions" aria-label="Hızlı arama önerileri">
          <span>KEŞFET:</span>
          {SUGGESTIONS.map((tag) => (
            <button
              key={tag}
              type="button"
              className="search-chip"
              onClick={() => handleQueryChange(tag)}
            >
              {tag}
            </button>
          ))}
        </div>

        {/* ── Result count ── */}
        <p className="search-meta" aria-live="polite">
          {query ? `${filtered.length} parça bulundu` : 'Senin için seçtiklerimiz'}
        </p>

        {/* ── Results list ── */}
        <div className="search-results-list" role="list">
          {filtered.length > 0 ? (
            filtered.map((item) => (
              <div key={item.id} className="search-item-row" role="listitem">
                {/* Thumbnail */}
                <div className="search-item-thumb">
                  <img src={item.image} alt={item.name} loading="lazy" decoding="async" />
                </div>

                {/* Name + colour */}
                <div className="search-item-info">
                  <h4 className="search-item-title">{item.name}</h4>
                  <p className="search-item-color">{item.color}</p>
                </div>

                {/* Price + actions */}
                <div className="search-item-actions">
                  <span className="search-item-price">{money(item.price)}</span>
                  <div className="search-item-btns">
                    <Link
                      className="btn btn--secondary btn--sm search-action-btn"
                      href={`/urun/${item.slug}`}
                      onClick={() => setIsSearchOpen(false)}
                    >
                      Parçayı Keşfet ↗
                    </Link>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="search-empty">
              Bu parça henüz burada değil. Farklı bir kelimeyle deneyiniz.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
