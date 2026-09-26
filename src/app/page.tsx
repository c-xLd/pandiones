'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { Product } from '@/types';

export default function HomePage() {
  const { setQuickViewProduct, setActiveGuide } = useCart();
  const { toggleWishlist, isFavorite } = useWishlist();
  const [filter, setFilter] = useState<'tumu' | 'ic-giyim' | 'ev-giyim'>('tumu');
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    setProductsLoading(true);
    setProductsError(null);
    fetch('/api/products')
      .then((res) => {
        if (!res.ok) throw new Error('Ürünler yüklenemedi.');
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data)) setProducts(data);
      })
      .catch((err) => {
        setProductsError(err instanceof Error ? err.message : 'Ürünler yüklenemedi.');
      })
      .finally(() => {
        setProductsLoading(false);
      });
  }, [retryCount]);

  const filteredProducts = products.filter(
    (p) => filter === 'tumu' || p.category === filter
  );

  const money = (n: number) =>
    new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      maximumFractionDigits: 0,
    }).format(n);

  return (
    <main id="main">
      {/* 1. HERO CAMPAIGN */}
      <section className="campaign hero" aria-labelledby="hero-title">
        <div className="campaign-pictures">
          <img
            className="campaign-model"
            src="/assets/campaign-hero.jpeg"
            alt="Pandiones yeni sezon fitilli crop ve iç giyim koleksiyonu"
            fetchPriority="high"
            width={1086}
            height={1448}
          />
          <img
            className="campaign-still"
            src="/assets/beyaz-crop/2.png"
            alt="Beyaz crop stüdyo detayı ve kalıp dikişleri"
            fetchPriority="high"
            width={1536}
            height={1024}
          />
        </div>
        <div className="campaign-caption">
          <p className="eyebrow">İÇ GİYİM & EV GİYİM</p>
          <h1 id="hero-title">Kendine yakın.</h1>
          <Link className="campaign-link" href="/koleksiyon">
            KOLEKSİYONU KEŞFET <span>↗</span>
          </Link>
        </div>
        <span className="campaign-side">PANDIONES / YENİ KOLEKSİYON</span>
      </section>

      {/* 2. CATEGORY NAV */}
      <nav className="category-nav" aria-label="Hızlı kategori seçimi">
        <Link href="/koleksiyon">TÜM PARÇALAR</Link>
        <Link href="/koleksiyon/ic-giyim">İÇ GİYİM SEÇKİSİ</Link>
        <Link href="/koleksiyon/ev-giyim">EV GİYİM</Link>
        <Link href="/#hikayemiz">PANDIONES DÜNYASI</Link>
      </nav>

      {/* 3. CATEGORY STORIES */}
      <section className="category-stories" aria-label="Koleksiyonu keşfet">
        <Link className="category-card" href="/koleksiyon/ic-giyim">
          <img
            src="/assets/siyah-crop/1.png"
            alt="Siyah crop takım"
            loading="lazy"
            width={1086}
            height={1448}
          />
          <div>
            <h2>Siyahın zarafeti.</h2>
            <span>İÇ GİYİM ↗</span>
          </div>
        </Link>
        <Link className="category-card" href="/koleksiyon/ev-giyim">
          <img
            src="/assets/beyaz-fitilli-atlet.png"
            alt="Beyaz fitilli atlet ev giyim"
            loading="lazy"
            width={1086}
            height={1448}
          />
          <div>
            <h2>Dingin sadelik.</h2>
            <span>EV GİYİM ↗</span>
          </div>
        </Link>
        <Link
          className="category-card category-detail"
          href="/koleksiyon/ic-giyim"
        >
          <img
            src="/assets/bebek-mavisi-takim.jpeg"
            alt="Bebek mavisi fitilli takım detayları"
            loading="lazy"
            width={1536}
            height={1024}
          />
          <div>
            <h2>İnce ayrıntılar.</h2>
            <span>TAKIMLARI KEŞFET ↗</span>
          </div>
        </Link>
      </section>

      {/* 4. NIGHT CAMPAIGN */}
      <section className="campaign night-campaign" aria-labelledby="night-title">
        <div className="campaign-pictures">
          <img
            src="/assets/campaign-seated.jpeg"
            alt="Editoryal çekim düğmeli askılı crop ile Pandiones stili"
            loading="lazy"
            width={1086}
            height={1448}
          />
          <img
            src="/assets/askili-crop/indir.png"
            alt="Düğmeli askılı siyah crop dokusu ve sedef düğme detayları"
            loading="lazy"
            width={1086}
            height={1448}
          />
        </div>
        <div className="campaign-caption">
          <p className="eyebrow">DOĞAL VE ÖZGÜR SİLÜETLER</p>
          <h2 id="night-title">Kendi ritminde.</h2>
          <Link className="campaign-link" href="/koleksiyon">
            PARÇALARI KEŞFET <span>↗</span>
          </Link>
        </div>
      </section>

      {/* 5. EDITORIAL COLLECTION GRID */}
      <section id="collection" className="collection">
        <div className="section-heading">
          <div>
            <p className="eyebrow">PANDIONES SEÇKİSİ</p>
            <h2>Gününe eşlik edenler.</h2>
          </div>
          <div className="filters" role="group" aria-label="Koleksiyon kategorisi">
            <button
              className={filter === 'tumu' ? 'active' : ''}
              onClick={() => setFilter('tumu')}
              aria-pressed={filter === 'tumu'}
            >
              Tümü
            </button>
            <button
              className={filter === 'ic-giyim' ? 'active' : ''}
              onClick={() => setFilter('ic-giyim')}
              aria-pressed={filter === 'ic-giyim'}
            >
              İç giyim
            </button>
            <button
              className={filter === 'ev-giyim' ? 'active' : ''}
              onClick={() => setFilter('ev-giyim')}
              aria-pressed={filter === 'ev-giyim'}
            >
              Ev giyim
            </button>
          </div>
        </div>

        <div className="editorial-grid" id="products">
          {productsLoading &&
            [1, 2, 3, 4, 5, 6].map((i) => (
              <article key={i} className="product skeleton-product" aria-busy="true">
                <div
                  style={{
                    aspectRatio: '3/4',
                    background: '#edece7',
                    width: '100%',
                    marginBottom: '16px',
                  }}
                />
                <div style={{ padding: '0 4px' }}>
                  <div
                    style={{
                      height: '12px',
                      background: '#edece7',
                      width: '30%',
                      marginBottom: '8px',
                    }}
                  />
                  <div
                    style={{
                      height: '16px',
                      background: '#edece7',
                      width: '70%',
                      marginBottom: '6px',
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
              </article>
            ))}

          {productsError && !productsLoading && (
            <div
              style={{
                gridColumn: '1 / -1',
                textAlign: 'center',
                padding: '60px 20px',
                background: 'var(--surface)',
                borderRadius: '4px',
              }}
            >
              <p
                style={{
                  color: '#dc2626',
                  marginBottom: '16px',
                  fontSize: '15px',
                }}
              >
                {productsError}
              </p>
              <button
                type="button"
                className="btn btn--primary"
                style={{ margin: '0 auto' }}
                onClick={() => setRetryCount((c) => c + 1)}
              >
                Tekrar Dene ↻
              </button>
            </div>
          )}

          {!productsLoading && !productsError && filteredProducts.length === 0 && (
            <div
              style={{
                gridColumn: '1 / -1',
                textAlign: 'center',
                padding: '60px 20px',
                background: 'var(--surface)',
                borderRadius: '4px',
              }}
            >
              <h3
                style={{
                  font: '400 24px var(--serif)',
                  marginBottom: '12px',
                }}
              >
                Bu kategoride henüz parça bulunmuyor
              </h3>
              <p style={{ color: 'var(--muted)', marginBottom: '24px' }}>
                Diğer kategorilerimizi inceleyebilir veya tüm koleksiyona göz
                atabilirsiniz.
              </p>
              <button
                type="button"
                className="btn btn--primary"
                style={{ margin: '0 auto' }}
                onClick={() => setFilter('tumu')}
              >
                Tüm Seçkiyi Gör ↗
              </button>
            </div>
          )}

          {!productsLoading &&
            !productsError &&
            filteredProducts.map((p) => (
              <article
                key={p.id}
                className={`product ${p.slug}`}
                style={{ position: 'relative' }}
              >
                <button
                  type="button"
                  className={`wishlist-heart-btn ${
                    isFavorite(p.id) ? 'is-active' : ''
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleWishlist(p);
                  }}
                  aria-label={
                    isFavorite(p.id) ? 'Favorilerden çıkar' : 'Favorilere ekle'
                  }
                >
                  ♥
                </button>
                <button
                  className="photo-button"
                  type="button"
                  onClick={() => setQuickViewProduct(p)}
                  aria-label={`${p.name} incele`}
                >
                  <img
                    src={p.image}
                    alt={p.name}
                    loading="lazy"
                    width={768}
                    height={1024}
                  />
                  <span className="photo-action">
                    <span>Parçayı keşfet</span>
                    <span>↗</span>
                  </span>
                </button>
                <div className="product-info">
                  <div>
                    <span className="product-category">
                      {p.category === 'ev-giyim' ? 'EV GİYİM' : 'İÇ GİYİM'}
                    </span>
                    <h3>
                      <Link href={`/koleksiyon/${p.category}/${p.slug}`}>
                        {p.name}
                      </Link>
                    </h3>
                    <p>{p.color}</p>
                  </div>
                  <span>{money(p.price)}</span>
                </div>
              </article>
            ))}
        </div>
      </section>

      {/* 6. BRAND STORY */}
      <section className="brand-story" id="hikayemiz">
        <p className="eyebrow">PANDIONES DÜNYASI</p>
        <h2>
          En güzel his,<br />
          <em>kendin olmak.</em>
        </h2>
        <p>
          Dantelin inceliği, satenin hafifliği.<br />
          Sana ait anların, sana yakın parçaları.
        </p>
        <Link className="text-link" href="/koleksiyon">
          Koleksiyona dön <span>↗</span>
        </Link>
      </section>

      {/* 7. SERVICE STORIES */}
      <section className="service-stories" aria-label="Pandiones ile keşfet">
        <Link className="service-tile" href="/#hikayemiz">
          <img
            src="/assets/campaign-portrait.jpeg"
            alt="Pandiones dünyası ve zarafet felsefesi"
            loading="lazy"
            width={1086}
            height={1448}
          />
          <span className="service-label">
            Pandiones Dünyası <span aria-hidden="true">↗</span>
          </span>
        </Link>
        <Link className="service-tile" href="/koleksiyon/ev-giyim">
          <img
            src="/assets/beyaz-fitilli-atlet.png"
            alt="Beyaz fitilli atlet ev giyim seçkisi"
            loading="lazy"
            width={1086}
            height={1448}
          />
          <span className="service-label">
            Ev Giyim Seçkisi <span aria-hidden="true">↗</span>
          </span>
        </Link>
        <button
          className="service-tile"
          type="button"
          onClick={() => setActiveGuide('size')}
        >
          <img
            src="/assets/beyaz-crop/1.png"
            alt="Kalıp ve beden rehberi"
            loading="lazy"
            width={1086}
            height={1448}
          />
          <span className="service-label">
            Beden Rehberi <span aria-hidden="true">↗</span>
          </span>
        </button>
        <button
          className="service-tile"
          type="button"
          onClick={() => setActiveGuide('fabric')}
        >
          <img
            src="/assets/pembe-fitilli-takim.png"
            alt="Fitilli kumaş ve narin dokuma rehberi"
            loading="lazy"
            width={1086}
            height={1448}
          />
          <span className="service-label">
            Kumaş Rehberi <span aria-hidden="true">↗</span>
          </span>
        </button>
      </section>
    </main>
  );
}
