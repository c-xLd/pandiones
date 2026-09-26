'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useWishlist } from '@/context/WishlistContext';
import { useCart } from '@/context/CartContext';

type CategoryFilter = 'ALL' | 'ic-giyim' | 'ev-giyim';

export default function FavorilerimPage() {
  const { wishlistItems, toggleWishlist, isLoaded } = useWishlist();
  const { addToCart, setQuickViewProduct, showToast, setIsBagOpen } = useCart();

  // Filter & Sort State
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('ALL');
  const [sortOption, setSortOption] = useState<'featured' | 'price-asc' | 'price-desc'>('featured');
  const [selectedSizes, setSelectedSizes] = useState<Record<string, string>>({});
  const [addedItemIds, setAddedItemIds] = useState<Record<string, boolean>>({});

  const money = (n: number) =>
    new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      maximumFractionDigits: 0,
    }).format(n);

  // Compute category counts
  const categoryCounts = useMemo(() => {
    const counts = { ALL: wishlistItems.length, 'ic-giyim': 0, 'ev-giyim': 0 };
    for (const item of wishlistItems) {
      if (item.category === 'ic-giyim') counts['ic-giyim']++;
      if (item.category === 'ev-giyim') counts['ev-giyim']++;
    }
    return counts;
  }, [wishlistItems]);

  // Filter and sort items
  const filteredItems = useMemo(() => {
    let result = [...wishlistItems];
    if (selectedCategory !== 'ALL') {
      result = result.filter((item) => item.category === selectedCategory);
    }
    if (sortOption === 'price-asc') {
      result.sort((a, b) => a.price - b.price);
    } else if (sortOption === 'price-desc') {
      result.sort((a, b) => b.price - a.price);
    }
    return result;
  }, [wishlistItems, selectedCategory, sortOption]);

  // Handle direct 1-click add to cart
  const handleQuickAddToCart = (product: any) => {
    const size = selectedSizes[product.id] || product.variants?.[0]?.size || 'M';
    addToCart(product, size, 1);
    setAddedItemIds((prev) => ({ ...prev, [product.id]: true }));
    showToast(`${product.name} (${size}) sepete eklendi.`);
    setTimeout(() => {
      setAddedItemIds((prev) => ({ ...prev, [product.id]: false }));
    }, 1800);
  };

  // Add all items in the current view to cart
  const handleAddAllToCart = () => {
    if (filteredItems.length === 0) return;
    for (const item of filteredItems) {
      const size = selectedSizes[item.id] || item.variants?.[0]?.size || 'M';
      addToCart(item, size, 1);
    }
    showToast(`${filteredItems.length} parça sepete eklendi.`);
    setIsBagOpen(true);
  };

  return (
    <main id="main" className="padded-main">
      <style>{`
        .apple-press {
          transition: transform 120ms cubic-bezier(0.2, 0, 0, 1), background-color 160ms ease, opacity 120ms ease;
          -webkit-tap-highlight-color: transparent;
        }
        .apple-press:active {
          transform: scale(0.97);
        }
        .filter-pill {
          padding: 8px 16px;
          border-radius: 9999px;
          font-size: 13px;
          letter-spacing: 0.02em;
          border: 1px solid var(--line);
          background: transparent;
          color: var(--muted);
          cursor: pointer;
          display: inline-flex;
          alignItems: center;
          gap: 6px;
          transition: all 160ms ease;
        }
        .filter-pill.active {
          background: var(--ink);
          color: var(--paper);
          border-color: var(--ink);
          font-weight: 500;
        }
        .size-pill {
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 600;
          border: 1px solid var(--line);
          background: var(--surface);
          color: var(--ink);
          cursor: pointer;
          transition: all 120ms ease;
        }
        .size-pill.active {
          background: var(--ink);
          color: var(--paper);
          border-color: var(--ink);
        }
      `}</style>

      <div className="site-container" style={{ margin: '36px auto 100px' }}>
        {/* Header with Title and Add All Action */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            borderBottom: '1px solid var(--line)',
            paddingBottom: '24px',
            marginBottom: '32px',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div>
            <span style={{ fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
              PANDIONES KİŞİSEL SEÇKİLER
            </span>
            <h1 style={{ font: '400 clamp(32px, 4vw, 44px)/1.1 var(--serif)', margin: 0, color: 'var(--ink)' }}>
              Favorilerim {isLoaded ? `(${wishlistItems.length})` : ''}
            </h1>
          </div>

          {wishlistItems.length > 0 && (
            <button
              type="button"
              onClick={handleAddAllToCart}
              className="apple-press"
              style={{
                background: 'var(--ink)',
                color: 'var(--paper)',
                border: 'none',
                borderRadius: '9999px',
                padding: '11px 22px',
                fontSize: '12px',
                letterSpacing: '0.04em',
                fontWeight: 500,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>Tümünü Sepete Ekle</span>
              <span>↗</span>
            </button>
          )}
        </div>

        {/* Filter Pills and Sort Bar */}
        {wishlistItems.length > 0 && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '16px',
              marginBottom: '32px',
            }}
          >
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setSelectedCategory('ALL')}
                className={`filter-pill apple-press ${selectedCategory === 'ALL' ? 'active' : ''}`}
              >
                <span>Tümü</span>
                <span style={{ fontSize: '11px', opacity: 0.8 }}>({categoryCounts.ALL})</span>
              </button>
              {categoryCounts['ic-giyim'] > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedCategory('ic-giyim')}
                  className={`filter-pill apple-press ${selectedCategory === 'ic-giyim' ? 'active' : ''}`}
                >
                  <span>İç Giyim</span>
                  <span style={{ fontSize: '11px', opacity: 0.8 }}>({categoryCounts['ic-giyim']})</span>
                </button>
              )}
              {categoryCounts['ev-giyim'] > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedCategory('ev-giyim')}
                  className={`filter-pill apple-press ${selectedCategory === 'ev-giyim' ? 'active' : ''}`}
                >
                  <span>Ev Giyim</span>
                  <span style={{ fontSize: '11px', opacity: 0.8 }}>({categoryCounts['ev-giyim']})</span>
                </button>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label htmlFor="fav-sort" style={{ fontSize: '12px', color: 'var(--muted)' }}>
                Sırala:
              </label>
              <select
                id="fav-sort"
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as any)}
                style={{
                  padding: '7px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--line)',
                  background: 'var(--paper)',
                  fontSize: '12px',
                  color: 'var(--ink)',
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                <option value="featured">Özel Sıralama</option>
                <option value="price-asc">Fiyat: Düşükten Yükseğe</option>
                <option value="price-desc">Fiyat: Yüksekten Düşüğe</option>
              </select>
            </div>
          </div>
        )}

        {/* Wishlist Grid or Empty State */}
        {!isLoaded ? (
          <div
            className="collection-canvas"
            data-columns="4"
            style={{ padding: 0 }}
            aria-busy="true"
            aria-label="Favoriler yükleniyor"
          >
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                style={{
                  border: '1px solid var(--line)',
                  paddingBottom: '20px',
                  background: 'var(--surface)',
                }}
              >
                <div
                  style={{
                    aspectRatio: '3/4',
                    background: '#edece7',
                    marginBottom: '16px',
                  }}
                />
                <div style={{ padding: '0 16px' }}>
                  <div
                    style={{
                      height: '14px',
                      background: '#edece7',
                      width: '70%',
                      marginBottom: '8px',
                    }}
                  />
                  <div
                    style={{
                      height: '12px',
                      background: '#edece7',
                      width: '40%',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : wishlistItems.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '90px 20px',
              background: 'var(--surface)',
              borderRadius: '12px',
              border: '1px solid var(--line)',
            }}
          >
            <div style={{ fontSize: '32px', marginBottom: '16px' }}>🤍</div>
            <h2 style={{ font: '400 28px var(--serif)', marginBottom: '10px', color: 'var(--ink)' }}>
              Favori listeniz henüz boş
            </h2>
            <p style={{ color: 'var(--muted)', marginBottom: '32px', maxWidth: '440px', marginInline: 'auto', fontSize: '14px', lineHeight: 1.6 }}>
              Koleksiyonumuzu keşfederken beğendiğiniz ipek ve ev giyim parçalarını kalp ikonuna tıklayarak favorilerinize ekleyebilirsiniz.
            </p>
            <Link
              href="/koleksiyon"
              className="apple-press"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: 'var(--ink)',
                color: 'var(--paper)',
                padding: '12px 28px',
                borderRadius: '9999px',
                fontSize: '12px',
                letterSpacing: '0.04em',
                textDecoration: 'none',
                fontWeight: 500,
              }}
            >
              <span>Koleksiyonu Keşfet</span>
              <span>↗</span>
            </Link>
          </div>
        ) : (
          <div
            className="collection-canvas"
            data-columns="4"
            style={{ padding: 0 }}
          >
            {filteredItems.map((p) => {
              const sizes = p.variants?.map((v: any) => v.size) || ['S', 'M', 'L'];
              const currentSize = selectedSizes[p.id] || sizes[0] || 'M';
              const isAdded = Boolean(addedItemIds[p.id]);

              return (
                <article
                  key={p.id}
                  className="collection-piece"
                  style={{
                    border: '1px solid var(--line)',
                    background: 'var(--paper)',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div className="collection-piece-gallery" style={{ position: 'relative' }}>
                      <button
                        className="collection-piece-image"
                        type="button"
                        onClick={() => setQuickViewProduct(p)}
                        aria-label={`${p.name} incele`}
                        style={{ border: 'none', background: 'transparent', width: '100%', cursor: 'pointer' }}
                      >
                        <img
                          src={p.image}
                          alt={p.name}
                          width={1086}
                          height={1448}
                          loading="lazy"
                        />
                        <span className="collection-piece-cta">
                          <span>Hızlı İncele</span> <span>↗</span>
                        </span>
                      </button>

                      <button
                        type="button"
                        aria-label="Favorilerden kaldır"
                        onClick={() => toggleWishlist(p)}
                        className="apple-press"
                        style={{
                          position: 'absolute',
                          top: '12px',
                          right: '12px',
                          background: 'rgba(255,255,255,0.92)',
                          backdropFilter: 'blur(4px)',
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          display: 'grid',
                          placeItems: 'center',
                          fontSize: '18px',
                          color: '#e11d48',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                          zIndex: 5,
                          border: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        ♥
                      </button>
                    </div>

                    <div className="collection-piece-caption" style={{ padding: '14px 16px 8px' }}>
                      <div>
                        <h2 className="piece-name" style={{ fontSize: '15px' }}>
                          <Link href={`/koleksiyon/${p.category}/${p.slug}`}>
                            {p.name}
                          </Link>
                        </h2>
                        <span style={{ fontSize: '12px', color: 'var(--muted)' }}>{p.color}</span>
                      </div>
                      <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--ink)' }}>{money(p.price)}</span>
                    </div>

                    {/* Quick Size Selector */}
                    <div style={{ padding: '0 16px 12px', display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '11px', color: 'var(--muted)' }}>Beden:</span>
                      {sizes.map((sz: string) => (
                        <button
                          key={sz}
                          type="button"
                          onClick={() => setSelectedSizes((prev) => ({ ...prev, [p.id]: sz }))}
                          className={`size-pill apple-press ${currentSize === sz ? 'active' : ''}`}
                        >
                          {sz}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Actions: Quick 1-click Add to Cart */}
                  <div style={{ padding: '0 16px 16px', display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px' }}>
                    <button
                      type="button"
                      className="apple-press"
                      onClick={() => handleQuickAddToCart(p)}
                      style={{
                        background: isAdded ? '#166534' : 'var(--ink)',
                        color: 'var(--paper)',
                        border: 'none',
                        borderRadius: '9999px',
                        padding: '10px 14px',
                        fontSize: '12px',
                        fontWeight: 500,
                        letterSpacing: '0.03em',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        transition: 'background-color 200ms ease',
                      }}
                    >
                      <span>{isAdded ? '✓ Eklendi' : 'Sepete Ekle'}</span>
                    </button>

                    <button
                      type="button"
                      className="apple-press"
                      title="Detay ve İnceleme"
                      onClick={() => setQuickViewProduct(p)}
                      style={{
                        background: 'var(--surface)',
                        border: '1px solid var(--line)',
                        borderRadius: '9999px',
                        width: '38px',
                        height: '38px',
                        display: 'grid',
                        placeItems: 'center',
                        fontSize: '14px',
                        cursor: 'pointer',
                        color: 'var(--ink)',
                      }}
                    >
                      ↗
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
