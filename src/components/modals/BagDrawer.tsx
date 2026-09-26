'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { Product } from '@/types';

const FREE_SHIPPING_THRESHOLD = 3000;

export default function BagDrawer() {
  const {
    cart,
    isBagOpen,
    setIsBagOpen,
    removeFromCart,
    updateQuantity,
    cartTotal,
    addToCart,
    isLoaded,
  } = useCart();

  const { wishlistItems } = useWishlist();
  const [recommendations, setRecommendations] = useState<Product[]>([]);

  // Close on Escape key
  useEffect(() => {
    if (!isBagOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsBagOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isBagOpen, setIsBagOpen]);

  // Complementary recommendations
  useEffect(() => {
    if (!isBagOpen) return;
    fetch('/api/products')
      .then((res) => res.json())
      .then((data: Product[]) => {
        if (Array.isArray(data)) {
          const cartSlugs = new Set(cart.map((c) => c.slug));
          const available = data.filter((p) => !cartSlugs.has(p.slug));
          setRecommendations(available.slice(0, 2));
        }
      })
      .catch(() => {});
  }, [isBagOpen, cart]);

  if (!isBagOpen) return null;

  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);

  const money = (n: number) =>
    new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      maximumFractionDigits: 0,
    }).format(n);

  const freeShippingProgress = Math.min(100, Math.round((cartTotal / FREE_SHIPPING_THRESHOLD) * 100));
  const freeShippingRemaining = Math.max(0, FREE_SHIPPING_THRESHOLD - cartTotal);

  const handleWhatsAppShare = () => {
    if (cart.length === 0) return;
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://pandiones.com';
    const lines = [
      '✨ Pandiones Lüks Çantam',
      '──────────────────────────────',
      ...cart.map(
        (item) => `• ${item.name} (${item.color} / Beden: ${item.size}) x${item.quantity} — ${money(item.price * item.quantity)}`
      ),
      '──────────────────────────────',
      `Ara Toplam: ${money(cartTotal)}`,
      '',
      `Koleksiyonu İncele: ${origin}/koleksiyon`,
      'Hediye veya sürpriz sipariş için paylaşıldı 🎁',
    ];
    const text = encodeURIComponent(lines.join('\n'));
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const uncartedWishlist = wishlistItems.filter(
    (w) => !cart.some((c) => c.slug === w.slug)
  );

  return (
    <div
      className="modal-overlay"
      onClick={() => setIsBagOpen(false)}
      role="presentation"
    >
      <div
        className="drawer-right bag-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Alışveriş Çantanız"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── 1. Top Header ── */}
        <div className="bag-header">
          <div className="bag-header-headline">
            <span className="bag-header-eyebrow">PANDIONES ATELIER</span>
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
            <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        {/* ── 2. Shipping Milestone Indicator ── */}
        <div className="bag-milestone">
          <div className="bag-milestone-text">
            {cartTotal >= FREE_SHIPPING_THRESHOLD ? (
              <span className="bag-milestone-unlocked">
                <span className="bag-milestone-check">✓</span>
                Ayrıcalıklı ekspres kargonuz hediye edildi.
              </span>
            ) : (
              <span className="bag-milestone-remaining">
                Ücretsiz kargoya <strong>{money(freeShippingRemaining)}</strong> kaldı
              </span>
            )}
            <span className="bag-milestone-ratio">%{freeShippingProgress}</span>
          </div>
          <div className="bag-milestone-track" role="progressbar" aria-valuenow={freeShippingProgress} aria-valuemin={0} aria-valuemax={100}>
            <div
              className={`bag-milestone-fill ${cartTotal >= FREE_SHIPPING_THRESHOLD ? 'is-complete' : ''}`}
              style={{ width: `${freeShippingProgress}%` }}
            />
          </div>
        </div>

        {/* ── 3. Scrollable Content Area ── */}
        <div className="bag-body">
          {!isLoaded ? (
            <div style={{ padding: '60px 24px', textAlign: 'center', color: 'var(--muted)' }} aria-busy="true">
              <span className="pulsing-badge-dot" style={{ display: 'inline-block', marginRight: '8px' }} />
              Çantanız hazırlanıyor...
            </div>
          ) : cart.length === 0 ? (
            /* Empty State */
            <div className="bag-empty-state">
              <div className="bag-empty-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                  <path d="M5 7h14l1 14H4L5 7Z M9 8V5a3 3 0 0 1 6 0v3" />
                </svg>
              </div>
              <h3 className="bag-empty-title">Çantanız henüz sessiz.</h3>
              <p className="bag-empty-desc">
                İpeksi dokular, couture danteller ve bedeninize özel formlar seçkinizde yer almayı bekliyor.
              </p>
              <div className="bag-empty-actions">
                <Link
                  href="/koleksiyon/ic-giyim"
                  className="bag-empty-chip"
                  onClick={() => setIsBagOpen(false)}
                >
                  İç Giyim Koleksiyonu ↗
                </Link>
                <Link
                  href="/koleksiyon/ev-giyim"
                  className="bag-empty-chip"
                  onClick={() => setIsBagOpen(false)}
                >
                  Ev Giyim & Saten ↗
                </Link>
                <Link
                  href="/koleksiyon"
                  className="bag-empty-chip"
                  onClick={() => setIsBagOpen(false)}
                >
                  Tüm Parçalar ↗
                </Link>
              </div>
            </div>
          ) : (
            /* Filled Cart Items */
            <div className="bag-items-list" role="list">
              {cart.map((item) => (
                <article key={`${item.slug}-${item.size}`} className="bag-product-card" role="listitem">
                  <div className="bag-product-thumb">
                    <img src={item.image} alt={item.name} loading="lazy" />
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
                        <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path strokeLinecap="round" d="m6 6 12 12M18 6 6 18" />
                        </svg>
                      </button>
                    </div>

                    <div className="bag-product-meta">
                      <span className="bag-meta-pill">{item.color}</span>
                      <span className="bag-meta-divider">/</span>
                      <span className="bag-meta-pill">Beden {item.size}</span>
                    </div>

                    <div className="bag-product-bottom">
                      {/* Integrated Minimalist Stepper */}
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

              {/* ── Curated Pairings (Cross-Sell) ── */}
              {recommendations.length > 0 && (
                <section className="bag-curated-section" aria-label="Kombin Önerileri">
                  <div className="bag-curated-header">
                    <span className="bag-curated-eyebrow">KOMBİNİ TAMAMLA</span>
                    <span className="bag-curated-tag">Atelier Seçimi</span>
                  </div>
                  <div className="bag-curated-grid">
                    {recommendations.map((rec) => (
                      <div key={rec.id} className="bag-curated-card">
                        <img src={rec.image} alt={rec.name} className="bag-curated-img" loading="lazy" />
                        <div className="bag-curated-info">
                          <h5 className="bag-curated-title">
                            <Link
                              href={`/koleksiyon/${rec.category}/${rec.slug}`}
                              onClick={() => setIsBagOpen(false)}
                            >
                              {rec.name}
                            </Link>
                          </h5>
                          <span className="bag-curated-price">{money(rec.price)}</span>
                        </div>
                        <button
                          type="button"
                          className="bag-curated-add"
                          onClick={() => addToCart(rec, rec.variants?.[0]?.size || 'M', 1)}
                          aria-label={`${rec.name} çantanıza ekleyin`}
                        >
                          + Ekle
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* ── Quick Wishlist Import ── */}
              {uncartedWishlist.length > 0 && (
                <section className="bag-wishlist-preview" aria-label="Favorilerinizden Parçalar">
                  <span className="bag-curated-eyebrow">FAVORİLERİNİZDE BEKLEYENLER</span>
                  <div className="bag-curated-grid">
                    {uncartedWishlist.slice(0, 1).map((fav) => (
                      <div key={fav.id} className="bag-curated-card bag-curated-card--wishlist">
                        <img src={fav.image} alt={fav.name} className="bag-curated-img" loading="lazy" />
                        <div className="bag-curated-info">
                          <h5 className="bag-curated-title">
                            <Link
                              href={`/koleksiyon/${fav.category}/${fav.slug}`}
                              onClick={() => setIsBagOpen(false)}
                            >
                              {fav.name}
                            </Link>
                          </h5>
                          <span className="bag-curated-price">{money(fav.price)}</span>
                        </div>
                        <button
                          type="button"
                          className="bag-curated-add bag-curated-add--wish"
                          onClick={() => addToCart(fav, 'M', 1)}
                          aria-label={`${fav.name} favorilerden çantaya al`}
                        >
                          Çantaya Al
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>

        {/* ── 4. Footer & Actions ── */}
        {cart.length > 0 && (
          <div className="bag-footer">
            <div className="bag-summary-row">
              <div className="bag-summary-label">
                <span>Ara Toplam</span>
                <span className="bag-summary-tax">KDV dahildir · Sigortalı kurye</span>
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

            <button
              type="button"
              className="bag-share-trigger"
              onClick={handleWhatsAppShare}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 1 1 0-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 1 0 5.367-2.684 3 3 0 0 0-5.367 2.684zm0 9.316a3 3 0 1 0 5.368 2.684 3 3 0 0 0-5.368-2.684z" />
              </svg>
              <span>Çantayı Paylaş (Hediye Sürprizi)</span>
            </button>

            {/* Quiet Luxury Trust Markers */}
            <div className="bag-trust-markers" aria-hidden="true">
              <span>✦ Özel Hediye Kutusu</span>
              <span>✦ Sigortalı Gönderim</span>
              <span>✦ 30 Gün Değişim</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
