'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import type { Product } from '@/lib/format';
import { formatPrice } from '@/lib/format';
import SiteFooter from '@/components/site-footer';
import SiteHeader from '@/components/site-header';
import { AnimatedCard } from '@/components/ui/animated-card';

interface CollectionViewProps {
  initialProducts: Product[];
  initialCategory?: string;
  initialTitle?: string;
  initialKicker?: string;
  initialDescription?: string;
}

const WORLDS = [
  {
    id: 'all',
    slug: 'all',
    num: '00',
    title: 'TÜMÜ',
    subtitle: 'DROP 01 / TÜM PARÇALAR',
    desc: 'Dantel takımlar, crop büstiyerler ve tül gecelikler.',
    image: '/products/simli-bustiyer-takim.jpg',
    categoryMatch: null,
  },
  {
    id: 'ic-giyim',
    slug: 'ic-giyim',
    num: '01',
    title: 'İÇ GİYİM',
    subtitle: 'BALENLİ & DANTELLİ TAKIMLAR',
    desc: 'Destekli kalıp, feminen dantel ve simli dokular.',
    image: '/products/cizgili-dantelli-takim.jpg',
    categoryMatch: 'ic-giyim',
  },
  {
    id: 'crop-bustiyer',
    slug: 'crop-bustiyer',
    num: '02',
    title: 'CROP BÜSTİYER',
    subtitle: 'FITILLI & PEDLİ GÜNLÜK',
    desc: 'V yaka formlar ve tenle bütünleşen ikinci ten hissi.',
    image: '/products/gri-crop-bustiyer.jpg',
    categoryMatch: 'crop-bustiyer',
  },
  {
    id: 'gecelik',
    slug: 'gecelik',
    num: '03',
    title: 'GECELİK & TÜL',
    subtitle: 'BABYDOLL & AKIŞKAN FORM',
    desc: 'Hafif tül katmanları ve transparan zarafet.',
    image: '/products/tul-babydoll-set.jpg',
    categoryMatch: 'gecelik',
  },
];

export default function CollectionView({
  initialProducts,
  initialCategory,
  initialTitle,
  initialKicker,
  initialDescription,
}: CollectionViewProps) {
  const [activeWorld, setActiveWorld] = useState<string>(initialCategory || 'all');
  const [mood, setMood] = useState<'soft' | 'bold'>('soft');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedSize, setSelectedSize] = useState<string>('S');
  const [isAdding, setIsAdding] = useState(false);
  const [notice, setNotice] = useState<string>('');
  const [viewLayout, setViewLayout] = useState<'grid' | 'editorial'>('editorial');
  const [activeSort, setActiveSort] = useState<'featured' | 'price-asc' | 'price-desc'>('featured');
  const [filterColor, setFilterColor] = useState<string>('all');

  // Synchronize saved mood
  useEffect(() => {
    const saved = window.localStorage.getItem('pandiones-mood');
    if (saved === 'soft' || saved === 'bold') setMood(saved);
  }, []);

  // Filter products by category, color, and sort
  const filteredProducts = useMemo(() => {
    let list = [...initialProducts];

    if (activeWorld !== 'all') {
      list = list.filter((p) => p.categorySlug === activeWorld);
    }

    if (filterColor !== 'all') {
      list = list.filter((p) => p.color.toLowerCase().includes(filterColor.toLowerCase()));
    }

    if (activeSort === 'price-asc') {
      list.sort((a, b) => a.priceKurus - b.priceKurus);
    } else if (activeSort === 'price-desc') {
      list.sort((a, b) => b.priceKurus - a.priceKurus);
    } else {
      list.sort((a, b) => (a.featuredRank ?? 99) - (b.featuredRank ?? 99));
    }

    return list;
  }, [initialProducts, activeWorld, filterColor, activeSort]);

  // Add to cart action with optimistic feedback
  const handleQuickAdd = async (product: Product, size: string) => {
    setIsAdding(true);
    try {
      const res = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.id, size, quantity: 1 }),
      });

      if (res.ok) {
        setNotice(`“${product.name}” (${size}) çantana eklendi.`);
        window.dispatchEvent(new Event('cart:updated'));
      } else {
        setNotice('Ürün çantaya eklenemedi, lütfen tekrar dene.');
      }
    } catch {
      setNotice('Bağlantı hatası oluştu.');
    } finally {
      setIsAdding(false);
      setTimeout(() => setNotice(''), 3500);
    }
  };

  const currentWorldObj = WORLDS.find((w) => w.slug === activeWorld) || WORLDS[0];

  return (
    <main className={`collection-matrix-shell mood-${mood}`}>
      {/* Toast Notification */}
      <div className={`collection-toast ${notice ? 'visible' : ''}`} role="status">
        <span className="toast-dot" aria-hidden="true" />
        <span>{notice}</span>
      </div>

      <SiteHeader />

      <section className="collection-index-intro" aria-labelledby="collection-hero-title">
        <div className="collection-index-meta">
          <span>{initialKicker || 'DROP 01 / 2026'}</span>
          <span>{String(initialProducts.length).padStart(2, '0')} PARÇA</span>
        </div>
        <h1 id="collection-hero-title">{initialTitle || 'KOLEKSİYON'}</h1>
        <div className="collection-index-bottom">
          <p>{initialDescription || 'Dantel, tül ve günlük crop formlarından oluşan Pandiones seçkisi.'}</p>
          <a href="#koleksiyon-kategorileri">Kategorileri incele <span aria-hidden="true">↓</span></a>
        </div>
      </section>

      {/* Worlds / Category Hub Carousel */}
      <section className="matrix-worlds-section" id="koleksiyon-kategorileri" aria-labelledby="worlds-title">
        <div className="section-header-row">
          <div>
            <p className="section-tag">DİJİTAL DÜNYALAR</p>
            <h2 id="worlds-title" className="section-main-title">
              KOLEKSİYON DÜNYALARI <span>/ 04</span>
            </h2>
          </div>
          <p className="section-desc-note">
            Karakterini seç: Dantelin gücü, tülün hafifliği veya crop formların günlük enerjisi.
          </p>
        </div>

        <div className="worlds-grid">
          {WORLDS.map((w) => {
            const isSelected = activeWorld === w.slug;
            return (
              <button
                type="button"
                key={w.id}
                className={`world-tile ${isSelected ? 'active-tile' : ''}`}
                onClick={() => setActiveWorld(w.slug)}
              >
                <div className="world-tile-img">
                  <img src={w.image} alt={w.title} />
                  <span className="tile-num">{w.num}</span>
                  {isSelected && <span className="tile-active-badge">SEÇİLİ</span>}
                </div>
                <div className="world-tile-content">
                  <span className="tile-subtitle">{w.subtitle}</span>
                  <h3>{w.title}</h3>
                  <p>{w.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Catalog Filter & Matrix Controls Bar */}
      <section className="matrix-controls-bar" aria-label="Katalog Filtreleri">
        <div className="controls-left">
          <span className="filter-count">
            GÖSTERİLEN: <strong>{filteredProducts.length} ÜRÜN</strong>
          </span>
          <span className="active-world-badge">DÜNYA: {currentWorldObj.title}</span>
        </div>

        <div className="controls-right">
          {/* Color Filter */}
          <div className="control-group">
            <label htmlFor="color-select">TON:</label>
            <select
              id="color-select"
              value={filterColor}
              onChange={(e) => setFilterColor(e.target.value)}
              className="control-select"
            >
              <option value="all">TÜM TONLAR</option>
              <option value="Siyah">Siyah</option>
              <option value="Pembe">Pembe</option>
              <option value="Gri">Gri</option>
            </select>
          </div>

          {/* Sort Select */}
          <div className="control-group">
            <label htmlFor="sort-select">SIRALA:</label>
            <select
              id="sort-select"
              value={activeSort}
              onChange={(e) => setActiveSort(e.target.value as any)}
              className="control-select"
            >
              <option value="featured">ÖNE ÇIKANLAR</option>
              <option value="price-asc">FİYAT: DÜŞÜKTEN YÜKSEĞE</option>
              <option value="price-desc">FİYAT: YÜKSEKTEN DÜŞÜĞE</option>
            </select>
          </div>

          {/* Layout Toggle */}
          <div className="layout-toggle" role="group" aria-label="Görünüm Düzeni">
            <button
              type="button"
              className={viewLayout === 'editorial' ? 'active-layout' : ''}
              onClick={() => setViewLayout('editorial')}
              title="Editorial Lookbook Düzeni"
            >
              EDİTÖRYAL
            </button>
            <button
              type="button"
              className={viewLayout === 'grid' ? 'active-layout' : ''}
              onClick={() => setViewLayout('grid')}
              title="Klasik Grid Düzeni"
            >
              GRİD
            </button>
          </div>
        </div>
      </section>

      {/* Main Product Matrix Section */}
      <section className={`matrix-catalog-section layout-${viewLayout}`} aria-label="Koleksiyon Ürünleri">
        {filteredProducts.length > 0 ? (
          <div className="catalog-editorial-grid">
            {filteredProducts.map((product, idx) => {
              return (
                <div key={product.id} className="editorial-grid-item">
                  <AnimatedCard intensity={6} className="h-full">
                    <article className="matrix-product-card h-full">
                      {/* Image Stage */}
                      <div className="card-media-stage">
                        <Link href={`/urun/${product.slug}`} className="card-image-link" tabIndex={-1} prefetch={true}>
                          <img
                            src={product.image}
                            alt={product.name}
                            style={{ objectPosition: product.imagePosition }}
                            loading={idx < 4 ? 'eager' : 'lazy'}
                            decoding="async"
                          />
                          <div className="card-hover-overlay" />
                        </Link>

                        <span className="card-rank-tag">{String(idx + 1).padStart(2, '0')} // DROP 01</span>

                        {/* Quick Portal Trigger */}
                        <button
                          type="button"
                          className="card-portal-trigger"
                          onClick={() => setSelectedProduct(product)}
                          aria-label={`${product.name} detaylarını incele`}
                        >
                          <span>HIZLI BAKIŞ</span>
                          <i>↗</i>
                        </button>

                        {/* Fast Size Picker Bar */}
                        <div className="card-quick-sizes">
                          <span className="quick-size-label">BEDEN:</span>
                          {product.sizes.map((sz) => (
                            <button
                              key={sz}
                              type="button"
                              className="size-pill-btn"
                              onClick={() => handleQuickAdd(product, sz)}
                              disabled={isAdding}
                            >
                              {sz}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Metadata Stage */}
                      <div className="card-info-stage">
                        <div className="info-main">
                          <span className="product-category-kicker">{product.categoryName}</span>
                          <h3>
                            <Link href={`/urun/${product.slug}`} prefetch={true}>{product.name}</Link>
                          </h3>
                          <p className="product-fit-note">{product.fit}</p>
                        </div>
                        <div className="info-price">
                          <strong>{formatPrice(product.priceKurus)}</strong>
                          <span className="product-color-badge">{product.color}</span>
                        </div>
                      </div>
                    </article>
                  </AnimatedCard>

                  {/* Interstitial Magazine Spread after 2nd product */}
                  {idx === 1 && (
                    <aside className="interstitial-spread spread-touch" aria-hidden="true">
                      <div className="spread-overlay" />
                      <div className="spread-content">
                        <span className="spread-kicker">MANİFESTO / 01</span>
                        <h2>
                          “Teninle konuşan kumaş.<br />
                          <i>Gündüzden geceye.</i>”
                        </h2>
                        <p>Dantel detayları, balenli kalıplar ve teni saran elastik iplikler.</p>
                      </div>
                    </aside>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="matrix-empty-state">
            <p className="empty-kicker">00 // BULUNAMADI</p>
            <h2>Seçtiğin kriterlere uygun ürün bulunamadı.</h2>
            <p>Filtreleri sıfırlayarak tüm Drop 01 koleksiyonuna göz atabilirsin.</p>
            <button
              type="button"
              className="reset-filter-btn"
              onClick={() => {
                setActiveWorld('all');
                setFilterColor('all');
              }}
            >
              FİLTRELERİ SIFIRLA ↗
            </button>
          </div>
        )}
      </section>

      {/* Materiality & Craft Spotlight Strip */}
      <section className="matrix-craft-section" aria-labelledby="craft-title">
        <div className="craft-grid">
          <div className="craft-card">
            <span className="craft-num">01</span>
            <h3>BALENLİ & ERGONOMİK ANATOMİ</h3>
            <p>
              Göğüs formunu kusursuz kavrayan balen ve destek yapıları gün boyu batma yapmadan dik ve rahat bir duruş sağlar.
            </p>
          </div>

          <div className="craft-card">
            <span className="craft-num">02</span>
            <h3>İPEK TUŞELİ DANTEL & TÜL</h3>
            <p>
              Hassas ten için özel dokunmuş yumuşak dantel ve transparan tüller, ciltte kaşıntı yapmaz ve nefes alır.
            </p>
          </div>

          <div className="craft-card">
            <span className="craft-num">03</span>
            <h3>PEDLİ & V-YAKA CROP ÖZGÜRLÜĞÜ</h3>
            <p>
              Hem ev konforunda hem blazer ceket altında giyilebilecek çift yönlü kaşkorse kumaş teknolojisi.
            </p>
          </div>
        </div>
      </section>

      {/* Quick Look / Product Portal Modal */}
      {selectedProduct && (
        <div className="portal-modal-backdrop" onClick={() => setSelectedProduct(null)}>
          <div
            className="portal-modal-window"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-product-title"
          >
            <button
              type="button"
              className="portal-close-btn"
              onClick={() => setSelectedProduct(null)}
              aria-label="Kapat"
            >
              ✕
            </button>

            <div className="portal-modal-layout">
              {/* Media */}
              <div className="portal-modal-media">
                <img
                  src={selectedProduct.image}
                  alt={selectedProduct.name}
                  style={{ objectPosition: selectedProduct.imagePosition }}
                />
                <span className="portal-modal-badge">{selectedProduct.categoryName}</span>
              </div>

              {/* Specs & Buy */}
              <div className="portal-modal-info">
                <span className="modal-kicker">PANDIONES // PORTAL VIEW</span>
                <h2 id="modal-product-title">{selectedProduct.name}</h2>
                <div className="modal-price">{formatPrice(selectedProduct.priceKurus)}</div>
                <p className="modal-desc">{selectedProduct.description}</p>

                <div className="modal-spec-list">
                  <div>
                    <span>MATERYAL:</span>
                    <strong>{selectedProduct.material}</strong>
                  </div>
                  <div>
                    <span>KALIP:</span>
                    <strong>{selectedProduct.fit}</strong>
                  </div>
                  <div>
                    <span>RENK:</span>
                    <strong>{selectedProduct.color}</strong>
                  </div>
                </div>

                {/* Size Selector */}
                <div className="modal-size-select">
                  <div className="size-head">
                    <span>BEDEN SEÇ</span>
                    <Link href="/beden-rehberi" prefetch={true}>
                      Beden Rehberi ↗
                    </Link>
                  </div>
                  <div className="size-buttons">
                    {selectedProduct.sizes.map((sz) => (
                      <button
                        key={sz}
                        type="button"
                        className={selectedSize === sz ? 'active-size' : ''}
                        onClick={() => setSelectedSize(sz)}
                      >
                        {sz}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Add to Bag CTA */}
                <button
                  type="button"
                  className="modal-add-btn"
                  onClick={() => {
                    handleQuickAdd(selectedProduct, selectedSize);
                    setSelectedProduct(null);
                  }}
                  disabled={isAdding}
                >
                  <span>ÇANTAYA EKLE ({selectedSize})</span>
                  <i>↗</i>
                </button>

                <Link href={`/urun/${selectedProduct.slug}`} className="modal-detail-link" prefetch={true}>
                  Ürünün Tam Sayfasını İncele →
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Luxury Site Footer */}
      <SiteFooter />
    </main>
  );
}
