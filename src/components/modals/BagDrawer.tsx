'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { formatTRY } from '@/lib/format/money';
// Loaded with this lazily imported overlay, not on first paint.
import '@/styles/layout/overlays.css';
import '@/styles/components/bag-drawer.css';


export default function BagDrawer() {
  const {
    cart,
    isBagOpen,
    setIsBagOpen,
    removeFromCart,
    updateQuantity,
    cartTotal,
    isLoaded,
  } = useCart();

  // Close on Escape key
  useEffect(() => {
    if (!isBagOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsBagOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isBagOpen, setIsBagOpen]);

  if (!isBagOpen) return null;

  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);

  const money = formatTRY;

  return (
    <div
      className="modal-overlay"
      onClick={() => setIsBagOpen(false)}
      role="presentation"
    >
      <aside
        className="drawer-right bag-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Alışveriş Çantanız"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── 1. Top Header (Architectural Quiet Luxury) ── */}
        <div className="bag-header">
          <div className="bag-header-headline">
            <span className="bag-header-eyebrow">PANDIONES</span>
            <div className="bag-header-title-row">
              <h2 className="bag-header-title">Çantanız</h2>
              <span className="bag-header-count" aria-label={`${totalItems} parça`}>
                ({totalItems})
              </span>
            </div>
          </div>

          <button
            className="bag-close-pill"
            type="button"
            aria-label="Çantayı kapat"
            onClick={() => setIsBagOpen(false)}
          >
            <span>Kapat</span>
            <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.2">
              <path strokeLinecap="round" d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        {/* ── 3. Scrollable Content Area ── */}
        <div className="bag-body">
          {!isLoaded ? (
            <div className="bag-loading-state" aria-busy="true">
              <span className="visually-hidden" role="status">Çanta yükleniyor</span>
              {[0, 1].map((row) => (
                <div key={row} className="bag-loading-row" aria-hidden="true">
                  <span className="skeleton-block bag-loading-row__media" />
                  <span className="bag-loading-row__lines">
                    <span className="skeleton-block" />
                    <span className="skeleton-block" />
                  </span>
                </div>
              ))}
            </div>
          ) : cart.length === 0 ? (
            /* Empty State */
            <div className="bag-empty-state">
              <span className="bag-empty-eyebrow">PANDIONES SEÇKİSİ</span>
              <h3 className="bag-empty-title">Çantanız henüz sessiz.</h3>
              <p className="bag-empty-desc">
                İpeksi dokular, saf formlar ve zamansız parçalar seçkinizde yer almayı bekliyor.
              </p>
              <div className="bag-empty-actions">
                <Link
                  href="/ic-giyim"
                  className="bag-empty-link"
                  onClick={() => setIsBagOpen(false)}
                >
                  <span>İç Giyim Koleksiyonu</span>
                  <span aria-hidden="true">↗</span>
                </Link>
                <Link
                  href="/ev-giyim"
                  className="bag-empty-link"
                  onClick={() => setIsBagOpen(false)}
                >
                  <span>Ev Giyim & Saten</span>
                  <span aria-hidden="true">↗</span>
                </Link>
                <Link
                  href="/yeni-gelenler"
                  className="bag-empty-link"
                  onClick={() => setIsBagOpen(false)}
                >
                  <span>Tüm Koleksiyon</span>
                  <span aria-hidden="true">↗</span>
                </Link>
              </div>
            </div>
          ) : (
            /* Filled Cart Items */
            <div className="bag-items-list" role="list">
              {cart.map((item) => (
                <article key={`${item.slug}-${item.size}`} className="bag-product-card" role="listitem">
                  <div className="bag-product-thumb">
                    <img src={item.image} alt={item.name} loading="lazy" decoding="async" />
                  </div>

                  <div className="bag-product-details">
                    <div className="bag-product-topline">
                      <h4 className="bag-product-name">{item.name}</h4>
                      <button
                        type="button"
                        className="bag-remove-trigger"
                        aria-label={`${item.name} ürününü çantadan kaldır`}
                        onClick={() => removeFromCart(item.slug, item.size)}
                      >
                        Kaldır
                      </button>
                    </div>

                    <div className="bag-product-meta">
                      <span>{item.color}</span>
                      <span className="bag-meta-dot" aria-hidden="true">·</span>
                      <span>Beden {item.size}</span>
                    </div>

                    <div className="bag-product-bottom">
                      {/* Quiet Minimalist Stepper */}
                      <div className="bag-stepper" role="group" aria-label="Adet ayarla">
                        <button
                          type="button"
                          className="bag-stepper-btn"
                          aria-label="Adedi bir azalt"
                          onClick={() => updateQuantity(item.slug, item.size, -1)}
                        >
                          −
                        </button>
                        <span className="bag-stepper-val" aria-live="polite">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          className="bag-stepper-btn"
                          aria-label="Adedi bir artır"
                          onClick={() => updateQuantity(item.slug, item.size, 1)}
                        >
                          +
                        </button>
                      </div>

                      <div className="bag-product-price">
                        {money(item.price * item.quantity)}
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        {/* ── 4. Footer & Actions ── */}
        {cart.length > 0 && (
          <div className="bag-footer">
            <div className="bag-summary-row">
              <div className="bag-summary-label">
                <span>Ara Toplam</span>
                <span className="bag-summary-tax">KDV dahildir</span>
              </div>
              <div className="bag-summary-val">{money(cartTotal)}</div>
            </div>

            <Link
              href="/odeme"
              className="btn btn--primary btn--lg btn--block btn--split bag-checkout-trigger"
              onClick={() => setIsBagOpen(false)}
            >
              <span>Siparişi Tamamla</span>
              <span className="bag-checkout-arrow" aria-hidden="true">↗</span>
            </Link>

            <Link
              href="/canta"
              className="bag-view-cart-link"
              onClick={() => setIsBagOpen(false)}
            >
              Çantayı Ayrıntılı İncele
            </Link>
          </div>
        )}
      </aside>
    </div>
  );
}
