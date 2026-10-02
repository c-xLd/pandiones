'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useWishlist } from '@/context/WishlistContext';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import Notice from '@/components/ui/Notice';
import StatusPanel from '@/components/ui/StatusPanel';
import { formatTRY } from '@/lib/format/money';
import { sortBySize } from '@/lib/products/sizes';
import type { Product } from '@/types';
// Route stylesheet: loaded only where this page or component is used.
import '@/styles/pages/favorites.css';

type CategoryFilter = 'ALL' | 'ic-giyim' | 'ev-giyim';
type SortOption = 'saved' | 'price-asc' | 'price-desc';
type RefreshState = { status: 'idle' | 'loading' | 'ready' | 'error'; products: Record<string, Product> };

const CATEGORY_LABELS: Record<string, string> = { 'ic-giyim': 'İç giyim', 'ev-giyim': 'Ev giyim' };
const ADDED_FEEDBACK_MS = 2000;

const productHref = (p: Product) => `/urun/${p.slug}`;

export default function FavorilerimPage() {
  const { wishlistItems, toggleWishlist, isLoaded } = useWishlist();
  const { addToCart } = useCart();
  const { user } = useAuth();

  const [category, setCategory] = useState<CategoryFilter>('ALL');
  const [sort, setSort] = useState<SortOption>('saved');
  const [selectedSizes, setSelectedSizes] = useState<Record<string, string>>({});
  const [addedId, setAddedId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [refresh, setRefresh] = useState<RefreshState>({ status: 'idle', products: {} });
  const [attempt, setAttempt] = useState(0);
  const addedTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(addedTimer.current), []);

  // Saved favorites are snapshots; read current price, sizes and stock from the catalog.
  const idsKey = wishlistItems.map((p) => p.id).sort().join(',');
  useEffect(() => {
    if (!isLoaded || !idsKey) return;
    let cancelled = false;
    setRefresh((prev) => ({ ...prev, status: 'loading' }));
    fetch(`/api/products?ids=${encodeURIComponent(idsKey)}`)
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status));
        return res.json() as Promise<Product[]>;
      })
      .then((products) => {
        if (cancelled) return;
        setRefresh({ status: 'ready', products: Object.fromEntries(products.map((p) => [p.id, p])) });
      })
      .catch(() => {
        if (!cancelled) setRefresh((prev) => ({ ...prev, status: 'error' }));
      });
    return () => {
      cancelled = true;
    };
  }, [isLoaded, idsKey, attempt]);

  /** Current catalog record when known; the saved snapshot otherwise. */
  const current = useCallback((saved: Product) => refresh.products[saved.id] ?? saved, [refresh.products]);
  const isUnavailable = (saved: Product) => refresh.status === 'ready' && !refresh.products[saved.id];

  const counts = useMemo(() => {
    const result = { ALL: wishlistItems.length, 'ic-giyim': 0, 'ev-giyim': 0 };
    for (const item of wishlistItems) {
      if (item.category === 'ic-giyim') result['ic-giyim'] += 1;
      if (item.category === 'ev-giyim') result['ev-giyim'] += 1;
    }
    return result;
  }, [wishlistItems]);

  const visible = useMemo(() => {
    const list = wishlistItems.filter((item) => category === 'ALL' || item.category === category);
    if (sort === 'saved') return list;
    return [...list].sort((a, b) => (sort === 'price-asc' ? current(a).price - current(b).price : current(b).price - current(a).price));
  }, [wishlistItems, category, sort, current]);

  const handleAdd = (saved: Product) => {
    const product = current(saved);
    const size = selectedSizes[product.id];
    if (!size) return;
    addToCart(product, size, 1);
    setAddedId(product.id);
    window.clearTimeout(addedTimer.current);
    addedTimer.current = window.setTimeout(() => setAddedId(null), ADDED_FEEDBACK_MS);
  };

  const handleRemove = async (saved: Product) => {
    setRemovingId(saved.id);
    try {
      await toggleWishlist(saved);
    } finally {
      setRemovingId(null);
    }
  };

  if (isLoaded && wishlistItems.length === 0) {
    return (
      <main id="main" className="favorites-page favorites-page--empty">
        <StatusPanel
          eyebrow="Favoriler"
          title="Favori listeniz boş"
          actions={<Link href="/yeni-gelenler" className="btn btn--primary btn--lg">Yeni gelenlere git</Link>}
        >
          <p>Ürünlerdeki kalp simgesine dokunarak kaydettiğiniz parçalar, güncel fiyat ve bedenleriyle burada görünür.</p>
        </StatusPanel>
      </main>
    );
  }

  const categories: Array<{ key: CategoryFilter; label: string; count: number }> = [
    { key: 'ALL', label: 'Tümü', count: counts.ALL },
    ...(['ic-giyim', 'ev-giyim'] as const)
      .filter((key) => counts[key] > 0)
      .map((key) => ({ key, label: CATEGORY_LABELS[key], count: counts[key] })),
  ];

  return (
    <main id="main" className="favorites-page">
      <header className="favorites-head">
        <p className="favorites-eyebrow">Favoriler</p>
        <h1 className="favorites-title">
          Favorilerim
          {isLoaded ? <span className="favorites-title-count">{wishlistItems.length} parça</span> : null}
        </h1>
        {isLoaded && !user ? (
          <p className="favorites-guest-note">
            Favorileriniz yalnız bu tarayıcıda saklanıyor. <Link href="/giris-yap?redirect=%2Ffavorilerim">Giriş yap</Link>
          </p>
        ) : null}
      </header>

      {isLoaded ? (
        <div className="favorites-toolbar">
          {categories.length > 2 ? (
            <fieldset className="segments">
              <legend className="visually-hidden">Kategori</legend>
              {categories.map((c) => (
                <label key={c.key} className="segment">
                  <input type="radio" name="favorites-category" checked={category === c.key} onChange={() => setCategory(c.key)} />
                  <span>
                    {c.label} <span className="segment__count">{c.count}</span>
                  </span>
                </label>
              ))}
            </fieldset>
          ) : <span />}
          <div className="favorites-sort">
            <label htmlFor="favorites-sort" className="favorites-sort__label">Sırala</label>
            <select id="favorites-sort" className="field__control" value={sort} onChange={(e) => setSort(e.target.value as SortOption)}>
              <option value="saved">Eklenme sırası</option>
              <option value="price-asc">Fiyat: düşükten yükseğe</option>
              <option value="price-desc">Fiyat: yüksekten düşüğe</option>
            </select>
          </div>
        </div>
      ) : null}

      {refresh.status === 'error' ? (
        <Notice tone="warning" role="status" className="favorites-notice">
          <p>Güncel fiyat ve stok bilgisi alınamadı; kaydettiğiniz bilgiler gösteriliyor. Çantada ve ödemede tekrar doğrulanır.</p>
          <button type="button" className="btn btn--link" onClick={() => setAttempt((n) => n + 1)}>Tekrar dene</button>
        </Notice>
      ) : null}

      {!isLoaded ? (
        <ul className="favorites-grid" aria-busy="true" aria-label="Favoriler yükleniyor">
          {[0, 1, 2, 3].map((i) => (
            <li key={i} className="favorite-tile favorite-tile--skeleton" aria-hidden="true">
              <span className="favorite-tile__media skeleton-block" />
              <span className="skeleton-block favorite-tile__skeleton-line" />
              <span className="skeleton-block favorite-tile__skeleton-line favorite-tile__skeleton-line--short" />
            </li>
          ))}
        </ul>
      ) : (
        <ul className="favorites-grid">
          {visible.map((saved, index) => {
            const product = current(saved);
            const unavailable = isUnavailable(saved);
            const checking = refresh.status === 'loading' && !refresh.products[saved.id];
            const variants = sortBySize(product.variants ?? []);
            const inStock = variants.filter((v) => v.stock > 0);
            const selected = selectedSizes[product.id];
            const groupId = `fav-sizes-${product.id}`;
            const hintId = `fav-hint-${product.id}`;
            const canAdd = !unavailable && !checking && Boolean(selected);
            const hint = unavailable
              ? 'Bu parça artık satışta değil.'
              : variants.length === 0
                ? 'Beden bilgisi için ürün sayfasına gidin.'
                : inStock.length === 0
                  ? 'Tüm bedenler tükendi.'
                  : selected
                    ? null
                    : 'Çantaya eklemek için beden seçin.';

            return (
              <li key={saved.id} className={`favorite-tile${unavailable ? ' is-unavailable' : ''}`} style={{ '--i': index } as React.CSSProperties}>
                <div className="favorite-tile__media">
                  <Link href={productHref(product)} tabIndex={-1} aria-hidden="true">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={product.image} alt="" loading="lazy" decoding="async" width={600} height={900} />
                  </Link>
                  <button
                    type="button"
                    className="favorite-tile__remove"
                    aria-label={`${product.name} favorilerden çıkar`}
                    aria-busy={removingId === saved.id || undefined}
                    disabled={removingId === saved.id}
                    onClick={() => handleRemove(saved)}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
                  </button>
                  {unavailable ? <span className="favorite-tile__flag">Satışta değil</span> : null}
                </div>

                <div className="favorite-tile__body">
                  <div className="favorite-tile__top">
                    <div>
                      {CATEGORY_LABELS[product.category] ? <p className="favorite-tile__category">{CATEGORY_LABELS[product.category]}</p> : null}
                      <h2 className="piece-name">
                        <Link href={productHref(product)}>{product.name}</Link>
                      </h2>
                      <p className="favorite-tile__color">{product.color}</p>
                    </div>
                    <p className="price favorite-tile__price">{formatTRY(product.price)}</p>
                  </div>

                  {!unavailable && variants.length > 0 ? (
                    <fieldset className="size-picker" aria-describedby={hint ? hintId : undefined}>
                      <legend className="visually-hidden">{product.name} bedeni</legend>
                      {variants.map((v) => {
                        const soldOut = v.stock <= 0;
                        return (
                          <label key={v.size} className={`size-picker__option${soldOut ? ' is-sold-out' : ''}`}>
                            <input
                              type="radio"
                              name={groupId}
                              value={v.size}
                              disabled={soldOut || checking}
                              checked={selected === v.size}
                              onChange={() => setSelectedSizes((prev) => ({ ...prev, [product.id]: v.size }))}
                            />
                            <span>
                              {v.size}
                              {soldOut ? <span className="visually-hidden"> (tükendi)</span> : null}
                            </span>
                          </label>
                        );
                      })}
                    </fieldset>
                  ) : null}

                  {hint ? <p id={hintId} className="favorite-tile__hint">{hint}</p> : null}

                  {unavailable ? null : variants.length === 0 ? (
                    <Link href={productHref(product)} className="btn btn--secondary btn--block">Ürüne git</Link>
                  ) : (
                    <button
                      type="button"
                      className="btn btn--primary btn--block"
                      disabled={!canAdd}
                      aria-describedby={hint ? hintId : undefined}
                      onClick={() => handleAdd(saved)}
                    >
                      {addedId === product.id ? 'Çantaya eklendi' : 'Çantaya ekle'}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {isLoaded && visible.length === 0 ? (
        <div className="favorites-filter-empty">
          <p>Bu kategoride favori yok.</p>
          <button type="button" className="btn btn--link" onClick={() => setCategory('ALL')}>Tümünü göster</button>
        </div>
      ) : null}
    </main>
  );
}
