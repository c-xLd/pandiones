'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Product } from '@/lib/catalog';
import { formatPrice } from '@/lib/catalog';
import SiteFooter from '@/components/site-footer';
import SiteHeader from '@/components/site-header';

interface CollectionViewProps {
  initialProducts: Product[];
  initialCategory?: string;
  initialTitle?: string;
  initialKicker?: string;
  initialDescription?: string;
  initialCoverImage?: string;
}

const WORLDS = [
  {
    id: 'all',
    slug: 'all',
    num: '00',
    title: 'TÜMÜ',
    subtitle: 'DROP 01 / SEÇKİ',
    desc: 'Dantel takımlar, crop büstiyerler ve tül gecelikler.',
    image: '/products/simli-bustiyer-takim.webp',
  },
  {
    id: 'ic-giyim',
    slug: 'ic-giyim',
    num: '01',
    title: 'İÇ GİYİM',
    subtitle: 'BALENLİ & DANTELLİ',
    desc: 'Destekli kalıp, feminen dantel ve simli dokular.',
    image: '/products/cizgili-dantelli-takim.webp',
  },
  {
    id: 'crop-bustiyer',
    slug: 'crop-bustiyer',
    num: '02',
    title: 'CROP BÜSTİYER',
    subtitle: 'FITILLI & PEDLİ',
    desc: 'V yaka formlar ve tenle bütünleşen günlük şıklık.',
    image: '/products/crop-siyah-main.webp',
  },
  {
    id: 'gecelik',
    slug: 'gecelik',
    num: '03',
    title: 'GECELİK & TÜL',
    subtitle: 'BABYDOLL & AKIŞKAN',
    desc: 'Hafif tül katmanları ve transparan zarafet.',
    image: '/products/tul-babydoll-set.webp',
  },
];

const SECONDARY_IMAGES: Record<string, string> = {
  'fitilli-u-yaka-siyah-crop': '/products/crop-siyah-detail.webp',
  'simli-destekli-bustiyer-takim': '/products/simli-bustiyer-takim.jpg',
  'cizgili-dantelli-bustiyer-takim': '/products/cizgili-dantelli-takim.jpg',
  'gri-v-yaka-pedli-crop': '/products/crop-siyah-side.webp',
  'tul-dantelli-babydoll-gecelik': '/products/tul-babydoll-set.jpg',
};

const AVAILABLE_COLORS = ['Siyah', 'Pudra', 'Gri'];
const AVAILABLE_SIZES = ['75B', '80B', '85B', '90B', 'XS', 'S', 'M', 'L', 'XL'];

export default function CollectionView({
  initialProducts,
  initialCategory,
  initialTitle = 'KOLEKSİYON',
  initialKicker = 'DROP 01 // 2026',
  initialDescription = 'Dantel, tül ve günlük crop formlarından oluşan Pandiones editoryal seçkisi.',
  initialCoverImage,
}: CollectionViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Read URL query parameters
  const queryCategory = searchParams.get('kategori') || initialCategory || 'all';
  const queryColor = searchParams.get('renk') || 'all';
  const querySize = searchParams.get('beden') || 'all';
  const querySort = searchParams.get('sirala') || 'featured';
  const queryLayout = searchParams.get('gorunum') || 'editorial';

  // State
  const [activeCategory, setActiveCategory] = useState<string>(queryCategory);
  const [activeColor, setActiveColor] = useState<string>(queryColor);
  const [activeSize, setActiveSize] = useState<string>(querySize);
  const [activeSort, setActiveSort] = useState<string>(querySort);
  const [viewLayout, setViewLayout] = useState<'editorial' | 'grid'>(
    queryLayout === 'grid' ? 'grid' : 'editorial'
  );

  // UI Interactive States
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [quickAddProduct, setQuickAddProduct] = useState<Product | null>(null);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [isAdding, setIsAdding] = useState(false);
  const [notice, setNotice] = useState<string>('');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  // Initialize and listen to favorites
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem('pandiones-favorites');
      if (stored) {
        setFavorites(new Set(JSON.parse(stored)));
      }
    } catch {
      // Storage unavailable
    }

    const handleFavUpdate = () => {
      try {
        const stored = window.localStorage.getItem('pandiones-favorites');
        if (stored) setFavorites(new Set(JSON.parse(stored)));
      } catch {}
    };

    window.addEventListener('favorites:updated', handleFavUpdate);
    return () => window.removeEventListener('favorites:updated', handleFavUpdate);
  }, []);

  // Synchronize state changes back to URL query parameters
  const updateUrlParams = useCallback(
    (updates: {
      kategori?: string;
      renk?: string;
      beden?: string;
      sirala?: string;
      gorunum?: string;
    }) => {
      const params = new URLSearchParams(searchParams.toString());

      const nextCat = updates.kategori !== undefined ? updates.kategori : activeCategory;
      const nextColor = updates.renk !== undefined ? updates.renk : activeColor;
      const nextSize = updates.beden !== undefined ? updates.beden : activeSize;
      const nextSort = updates.sirala !== undefined ? updates.sirala : activeSort;
      const nextLayout = updates.gorunum !== undefined ? updates.gorunum : viewLayout;

      if (nextCat && nextCat !== 'all') params.set('kategori', nextCat);
      else params.delete('kategori');

      if (nextColor && nextColor !== 'all') params.set('renk', nextColor);
      else params.delete('renk');

      if (nextSize && nextSize !== 'all') params.set('beden', nextSize);
      else params.delete('beden');

      if (nextSort && nextSort !== 'featured') params.set('sirala', nextSort);
      else params.delete('sirala');

      if (nextLayout && nextLayout !== 'editorial') params.set('gorunum', nextLayout);
      else params.delete('gorunum');

      const queryString = params.toString();
      const nextUrl = queryString ? `${pathname}?${queryString}` : pathname;
      router.replace(nextUrl, { scroll: false });
    },
    [searchParams, pathname, router, activeCategory, activeColor, activeSize, activeSort, viewLayout]
  );

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    let list = [...initialProducts];

    // Category filter
    if (activeCategory !== 'all') {
      list = list.filter((p) => p.categorySlug === activeCategory);
    }

    // Color filter
    if (activeColor !== 'all') {
      list = list.filter((p) =>
        p.color.toLowerCase().includes(activeColor.toLowerCase())
      );
    }

    // Size filter
    if (activeSize !== 'all') {
      list = list.filter((p) => p.sizes && p.sizes.includes(activeSize));
    }

    // Sort
    if (activeSort === 'price-asc') {
      list.sort((a, b) => a.priceKurus - b.priceKurus);
    } else if (activeSort === 'price-desc') {
      list.sort((a, b) => b.priceKurus - a.priceKurus);
    } else if (activeSort === 'newest') {
      list.reverse();
    } else {
      list.sort((a, b) => (a.featuredRank ?? 99) - (b.featuredRank ?? 99));
    }

    return list;
  }, [initialProducts, activeCategory, activeColor, activeSize, activeSort]);

  // Handlers for filters
  const handleCategoryChange = (cat: string) => {
    setActiveCategory(cat);
    updateUrlParams({ kategori: cat });
  };

  const handleColorChange = (col: string) => {
    setActiveColor(col);
    updateUrlParams({ renk: col });
  };

  const handleSizeChange = (sz: string) => {
    setActiveSize(sz);
    updateUrlParams({ beden: sz });
  };

  const handleSortChange = (sort: string) => {
    setActiveSort(sort);
    updateUrlParams({ sirala: sort });
  };

  const handleLayoutToggle = (layout: 'editorial' | 'grid') => {
    setViewLayout(layout);
    updateUrlParams({ gorunum: layout });
  };

  const handleClearFilters = () => {
    setActiveCategory('all');
    setActiveColor('all');
    setActiveSize('all');
    setActiveSort('featured');
    router.replace(pathname, { scroll: false });
  };

  // Toggle favorite
  const toggleFavorite = (productId: string, productName: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      const isFav = next.has(productId);
      if (isFav) {
        next.delete(productId);
        showToast(`“${productName}” favorilerden çıkarıldı.`);
      } else {
        next.add(productId);
        showToast(`“${productName}” favorilerine kaydedildi.`);
      }
      try {
        window.localStorage.setItem('pandiones-favorites', JSON.stringify(Array.from(next)));
        window.dispatchEvent(new Event('favorites:updated'));
      } catch {}
      return next;
    });
  };

  // Toast feedback
  const showToast = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(''), 3500);
  };

  // Open Size Picker Panel
  const openSizePicker = (product: Product) => {
    setQuickAddProduct(product);
    setSelectedSize(product.sizes[0] || 'M');
  };

  // Add to cart with chosen size
  const handleConfirmAddToCart = async () => {
    if (!quickAddProduct || !selectedSize) return;
    setIsAdding(true);
    try {
      const res = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: quickAddProduct.id,
          size: selectedSize,
          quantity: 1,
        }),
      });

      if (res.ok) {
        showToast(`“${quickAddProduct.name}” (${selectedSize}) çantana eklendi.`);
        window.dispatchEvent(new Event('cart:updated'));
        setQuickAddProduct(null);
      } else {
        showToast('Ürün çantaya eklenemedi, lütfen tekrar dene.');
      }
    } catch {
      showToast('Ağ bağlantısı hatası oluştu.');
    } finally {
      setIsAdding(false);
    }
  };

  // Check active filter count
  const activeFiltersCount =
    (activeCategory !== 'all' ? 1 : 0) +
    (activeColor !== 'all' ? 1 : 0) +
    (activeSize !== 'all' ? 1 : 0) +
    (activeSort !== 'featured' ? 1 : 0);

  const heroImage =
    initialCoverImage ||
    WORLDS.find((w) => w.slug === activeCategory)?.image ||
    '/products/simli-bustiyer-takim.webp';

  return (
    <main className="collection-page-shell">
      {/* Toast Notification */}
      <div
        className={`collection-toast ${notice ? 'visible' : ''}`}
        role="status"
        aria-live="polite"
      >
        <span className="toast-dot" aria-hidden="true" />
        <span>{notice}</span>
      </div>

      <SiteHeader />

      {/* Minimal Breadcrumb */}
      <nav className="collection-breadcrumb-bar" aria-label="Breadcrumb">
        <ol className="collection-breadcrumb-list">
          <li>
            <Link href="/" prefetch={true}>
              Ana Sayfa
            </Link>
          </li>
          <li aria-hidden="true" className="breadcrumb-separator">
            /
          </li>
          <li>
            <Link href="/koleksiyon" prefetch={true}>
              Koleksiyon
            </Link>
          </li>
          {initialTitle && initialTitle !== 'KOLEKSİYON' && (
            <>
              <li aria-hidden="true" className="breadcrumb-separator">
                /
              </li>
              <li aria-current="page" className="breadcrumb-current">
                {initialTitle}
              </li>
            </>
          )}
        </ol>
      </nav>

      {/* Editorial Collection Hero */}
      <section className="collection-editorial-hero" aria-labelledby="collection-heading">
        <div className="collection-hero-inner">
          <div className="collection-hero-copy">
            <div className="collection-hero-meta">
              <span className="hero-kicker">{initialKicker}</span>
              <span className="hero-count">{String(initialProducts.length).padStart(2, '0')} PARÇA // SEÇKİ</span>
            </div>
            <h1 id="collection-heading" className="collection-hero-title">
              {initialTitle}
            </h1>
            <p className="collection-hero-lead">{initialDescription}</p>
            <div className="collection-hero-anchor-row">
              <a href="#katalog-alani" className="collection-scroll-cta">
                Ürünleri İncele <span aria-hidden="true">↓</span>
              </a>
              <span className="collection-hero-note">0 Keskin Çizgi · %10 Şarap Aksanı</span>
            </div>
          </div>

          <figure className="collection-hero-media">
            <img
              src={heroImage}
              alt={initialTitle}
              className="collection-hero-img"
              loading="eager"
              decoding="async"
              onError={(e) => {
                const target = e.currentTarget;
                if (!target.dataset.fallback) {
                  target.dataset.fallback = 'true';
                  target.src = '/products/simli-bustiyer-takim.webp';
                }
              }}
            />
            <figcaption className="collection-hero-caption">
              <span>EDİTÖRYAL LOOKBOOK</span>
              <span>2026</span>
            </figcaption>
          </figure>
        </div>
      </section>

      {/* World Hub Category Navigation Bar */}
      <nav className="collection-worlds-nav" aria-label="Koleksiyon Dünyaları">
        <div className="worlds-nav-scroll">
          {WORLDS.map((w) => {
            const isCurrent = activeCategory === w.slug;
            return (
              <button
                type="button"
                key={w.id}
                onClick={() => handleCategoryChange(w.slug)}
                className={`world-nav-item ${isCurrent ? 'is-active' : ''}`}
                aria-pressed={isCurrent}
              >
                <span className="world-num">{w.num}</span>
                <span className="world-name">{w.title}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Sticky Controls & Filter Bar */}
      <section
        className="collection-controls-bar"
        id="katalog-alani"
        aria-label="Katalog Filtreleme ve Sıralama"
      >
        <div className="controls-bar-container">
          {/* Left: Count and Active World */}
          <div className="controls-summary">
            <span className="controls-count">
              <strong>{filteredProducts.length}</strong> ÜRÜN
            </span>
            {activeFiltersCount > 0 && (
              <span className="controls-badge">{activeFiltersCount} FİLTRE AKTİF</span>
            )}
          </div>

          {/* Desktop Filters */}
          <div className="controls-desktop-filters">
            {/* Color Filter */}
            <div className="filter-dropdown-wrap">
              <label htmlFor="filter-color" className="filter-label">
                TON:
              </label>
              <select
                id="filter-color"
                value={activeColor}
                onChange={(e) => handleColorChange(e.target.value)}
                className="filter-select"
              >
                <option value="all">TÜM TONLAR</option>
                {AVAILABLE_COLORS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Size Filter */}
            <div className="filter-dropdown-wrap">
              <label htmlFor="filter-size" className="filter-label">
                BEDEN:
              </label>
              <select
                id="filter-size"
                value={activeSize}
                onChange={(e) => handleSizeChange(e.target.value)}
                className="filter-select"
              >
                <option value="all">TÜM BEDENLER</option>
                {AVAILABLE_SIZES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort Filter */}
            <div className="filter-dropdown-wrap">
              <label htmlFor="filter-sort" className="filter-label">
                SIRALA:
              </label>
              <select
                id="filter-sort"
                value={activeSort}
                onChange={(e) => handleSortChange(e.target.value)}
                className="filter-select"
              >
                <option value="featured">ÖNE ÇIKANLAR</option>
                <option value="newest">EN YENİLER</option>
                <option value="price-asc">FİYAT: DÜŞÜKTEN YÜKSEĞE</option>
                <option value="price-desc">FİYAT: YÜKSEKTEN DÜŞÜĞE</option>
              </select>
            </div>

            {/* Layout Toggle */}
            <div className="layout-toggle-group" role="group" aria-label="Görünüm Düzeni">
              <button
                type="button"
                className={`layout-btn ${viewLayout === 'editorial' ? 'is-active' : ''}`}
                onClick={() => handleLayoutToggle('editorial')}
                title="Editoryal Düzen"
                aria-pressed={viewLayout === 'editorial'}
              >
                EDİTÖRYAL
              </button>
              <button
                type="button"
                className={`layout-btn ${viewLayout === 'grid' ? 'is-active' : ''}`}
                onClick={() => handleLayoutToggle('grid')}
                title="Katalog Grid Düzeni"
                aria-pressed={viewLayout === 'grid'}
              >
                GRİD
              </button>
            </div>
          </div>

          {/* Mobile Filter Button */}
          <div className="controls-mobile-trigger">
            <button
              type="button"
              className="mobile-filter-btn"
              onClick={() => setIsFilterDrawerOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={isFilterDrawerOpen}
            >
              <span>FİLTRE & SIRALA</span>
              {activeFiltersCount > 0 && (
                <span className="mobile-filter-badge">{activeFiltersCount}</span>
              )}
              <span aria-hidden="true">⚙</span>
            </button>
          </div>
        </div>

        {/* Active Filters Pill Bar */}
        {activeFiltersCount > 0 && (
          <div className="active-filters-rail" aria-label="Uygulanan Filtreler">
            <span className="active-rail-label">AKTİF:</span>
            {activeCategory !== 'all' && (
              <button
                type="button"
                className="filter-chip"
                onClick={() => handleCategoryChange('all')}
                title="Kategori filtresini kaldır"
              >
                Kategori: {WORLDS.find((w) => w.slug === activeCategory)?.title || activeCategory}{' '}
                <span aria-hidden="true">✕</span>
              </button>
            )}
            {activeColor !== 'all' && (
              <button
                type="button"
                className="filter-chip"
                onClick={() => handleColorChange('all')}
                title="Ton filtresini kaldır"
              >
                Ton: {activeColor} <span aria-hidden="true">✕</span>
              </button>
            )}
            {activeSize !== 'all' && (
              <button
                type="button"
                className="filter-chip"
                onClick={() => handleSizeChange('all')}
                title="Beden filtresini kaldır"
              >
                Beden: {activeSize} <span aria-hidden="true">✕</span>
              </button>
            )}
            {activeSort !== 'featured' && (
              <button
                type="button"
                className="filter-chip"
                onClick={() => handleSortChange('featured')}
                title="Sıralamayı sıfırla"
              >
                Sıralama: {activeSort === 'price-asc' ? 'Fiyat Artan' : activeSort === 'price-desc' ? 'Fiyat Azalan' : 'En Yeni'}{' '}
                <span aria-hidden="true">✕</span>
              </button>
            )}
            <button
              type="button"
              className="filter-clear-all"
              onClick={handleClearFilters}
            >
              TÜMÜNÜ TEMİZLE
            </button>
          </div>
        )}
      </section>

      {/* Main Product Grid / Matrix */}
      <section
        className={`collection-catalog-grid layout-${viewLayout}`}
        aria-label="Koleksiyon Parçaları"
      >
        {filteredProducts.length > 0 ? (
          <div className="product-cards-container">
            {filteredProducts.map((product, idx) => {
              const secondaryImg = SECONDARY_IMAGES[product.slug];
              const isFav = favorites.has(product.id);

              return (
                <div key={product.id} className="collection-card-wrapper">
                  <article className="editorial-product-card">
                    {/* Visual Media Stage */}
                    <div className="card-visual-stage">
                      <Link
                        href={`/${product.slug}`}
                        className="card-media-anchor"
                        tabIndex={-1}
                        aria-hidden="true"
                        prefetch={true}
                      >
                        {/* Primary Image */}
                        <img
                          src={product.image}
                          alt=""
                          style={{ objectPosition: product.imagePosition || 'center 35%' }}
                          className="card-primary-image"
                          loading={idx < 4 ? 'eager' : 'lazy'}
                          decoding="async"
                          onError={(e) => {
                            const target = e.currentTarget;
                            if (!target.dataset.fallback) {
                              target.dataset.fallback = 'true';
                              target.src = '/products/simli-bustiyer-takim.webp';
                            }
                          }}
                        />

                        {/* Secondary Image on Desktop Hover */}
                        {secondaryImg && (
                          <img
                            src={secondaryImg}
                            alt=""
                            className="card-secondary-image"
                            loading="lazy"
                            decoding="async"
                            aria-hidden="true"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        )}
                      </Link>

                      {/* Top Rank Badge */}
                      <span className="card-top-tag">
                        {String(idx + 1).padStart(2, '0')} // DROP 01
                      </span>

                      {/* Favorite Button */}
                      <button
                        type="button"
                        className={`card-favorite-action ${isFav ? 'is-favorited' : ''}`}
                        onClick={() => toggleFavorite(product.id, product.name)}
                        aria-label={
                          isFav
                            ? `${product.name} favorilerden çıkar`
                            : `${product.name} favorilere ekle`
                        }
                      >
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill={isFav ? 'currentColor' : 'none'}
                          stroke="currentColor"
                          strokeWidth="1.8"
                          aria-hidden="true"
                        >
                          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                        </svg>
                      </button>

                      {/* Quick Size / Add Button */}
                      <button
                        type="button"
                        className="card-quick-add-trigger"
                        onClick={() => openSizePicker(product)}
                        aria-label={`${product.name} için beden seç ve hızlı ekle`}
                      >
                        <span>HIZLI EKLE</span>
                        <span aria-hidden="true">+</span>
                      </button>
                    </div>

                    {/* Metadata Stage */}
                    <div className="card-details-stage">
                      <div className="card-meta-top">
                        <span className="card-category-kicker">
                          {product.categoryName}
                        </span>
                        <span className="card-color-tag">{product.color}</span>
                      </div>

                      <h2 className="card-product-title">
                        <Link href={`/${product.slug}`} prefetch={true}>
                          {product.name}
                        </Link>
                      </h2>

                      <p className="card-fit-description">{product.fit}</p>

                      <div className="card-pricing-row">
                        <span className="card-price-current">
                          {formatPrice(product.priceKurus)}
                        </span>
                        <span className="card-sizes-summary">
                          {product.sizes.slice(0, 3).join(' · ')}
                          {product.sizes.length > 3 ? ' +' : ''}
                        </span>
                      </div>
                    </div>
                  </article>

                  {/* Interstitial Magazine Spread after 2nd item */}
                  {idx === 1 && (
                    <aside className="editorial-interstitial-banner" aria-hidden="true">
                      <div className="interstitial-banner-inner">
                        <span className="interstitial-kicker">PANDIONES ATÖLYE // 01</span>
                        <blockquote className="interstitial-quote">
                          “Teninle konuşan form.<br />
                          <i>Gündüzden geceye akış.</i>”
                        </blockquote>
                        <p className="interstitial-copy">
                          Özel dokunmuş elastik danteller, ergonomik balen yapıları ve sıfır baskı konforu.
                        </p>
                      </div>
                    </aside>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* Empty Search / Filter State */
          <div className="collection-empty-container">
            <div className="empty-box">
              <span className="empty-code">00 // BULUNAMADI</span>
              <h2 className="empty-heading">
                Seçtiğin filtrelere uygun parça bulunamadı.
              </h2>
              <p className="empty-lead">
                Filtre kriterlerini temizleyerek koleksiyondaki tüm parçaları inceleyebilirsin.
              </p>
              <button
                type="button"
                className="empty-reset-button"
                onClick={handleClearFilters}
              >
                FİLTRELERİ SIFIRLA ↗
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Accessible Size Picker & Quick Add Modal / Sheet */}
      {quickAddProduct && (
        <div
          className="size-picker-backdrop"
          onClick={() => setQuickAddProduct(null)}
          role="presentation"
        >
          <div
            className="size-picker-sheet"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="size-picker-title"
          >
            <div className="size-picker-head">
              <div>
                <span className="size-picker-kicker">BEDEN SEÇİMİ</span>
                <h3 id="size-picker-title">{quickAddProduct.name}</h3>
              </div>
              <button
                type="button"
                className="size-picker-close"
                onClick={() => setQuickAddProduct(null)}
                aria-label="Kapat"
              >
                ✕
              </button>
            </div>

            <div className="size-picker-body">
              <div className="size-picker-summary">
                <img
                  src={quickAddProduct.image}
                  alt=""
                  className="size-picker-thumb"
                  width="72"
                  height="96"
                />
                <div className="size-picker-info">
                  <strong className="size-picker-price">
                    {formatPrice(quickAddProduct.priceKurus)}
                  </strong>
                  <span className="size-picker-color">{quickAddProduct.color}</span>
                  <Link
                    href="/beden-rehberi"
                    className="size-guide-link"
                    prefetch={true}
                  >
                    Beden Rehberi ↗
                  </Link>
                </div>
              </div>

              <div className="size-options-panel">
                <span className="size-options-label">LÜTFEN BEDEN SEÇİN:</span>
                <div className="size-buttons-grid">
                  {quickAddProduct.sizes.map((sz) => {
                    const isSelected = selectedSize === sz;
                    return (
                      <button
                        key={sz}
                        type="button"
                        className={`size-select-button ${isSelected ? 'is-selected' : ''}`}
                        onClick={() => setSelectedSize(sz)}
                        aria-pressed={isSelected}
                      >
                        {sz}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="size-picker-actions">
                <button
                  type="button"
                  className="size-confirm-add-btn"
                  onClick={handleConfirmAddToCart}
                  disabled={isAdding || !selectedSize}
                >
                  {isAdding
                    ? 'EKLENİYOR...'
                    : `ÇANTAYA EKLE · ${selectedSize || 'BEDEN SEÇ'}`}
                </button>
                <Link
                  href={`/${quickAddProduct.slug}`}
                  className="size-view-detail-btn"
                  prefetch={true}
                >
                  Ürün Sayfasına Git →
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Filter Drawer / Bottom Sheet */}
      {isFilterDrawerOpen && (
        <div
          className="mobile-filter-backdrop"
          onClick={() => setIsFilterDrawerOpen(false)}
          role="presentation"
        >
          <div
            className="mobile-filter-drawer"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-drawer-title"
          >
            <div className="mobile-drawer-head">
              <div>
                <span className="mobile-drawer-tag">FİLTRE & SIRALAMA</span>
                <h3 id="mobile-drawer-title">Filtreleri Özelleştir</h3>
              </div>
              <button
                type="button"
                className="mobile-drawer-close"
                onClick={() => setIsFilterDrawerOpen(false)}
                aria-label="Filtreleri Kapat"
              >
                ✕
              </button>
            </div>

            <div className="mobile-drawer-scroll-body">
              {/* Category Filter Group */}
              <div className="drawer-filter-group">
                <span className="drawer-group-title">KATEGORİ</span>
                <div className="drawer-options-grid">
                  {WORLDS.map((w) => (
                    <button
                      key={w.id}
                      type="button"
                      className={`drawer-option-pill ${activeCategory === w.slug ? 'is-active' : ''}`}
                      onClick={() => handleCategoryChange(w.slug)}
                    >
                      {w.title}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Filter Group */}
              <div className="drawer-filter-group">
                <span className="drawer-group-title">RENK TONU</span>
                <div className="drawer-options-grid">
                  <button
                    type="button"
                    className={`drawer-option-pill ${activeColor === 'all' ? 'is-active' : ''}`}
                    onClick={() => handleColorChange('all')}
                  >
                    TÜMÜ
                  </button>
                  {AVAILABLE_COLORS.map((col) => (
                    <button
                      key={col}
                      type="button"
                      className={`drawer-option-pill ${activeColor === col ? 'is-active' : ''}`}
                      onClick={() => handleColorChange(col)}
                    >
                      {col}
                    </button>
                  ))}
                </div>
              </div>

              {/* Size Filter Group */}
              <div className="drawer-filter-group">
                <span className="drawer-group-title">BEDEN</span>
                <div className="drawer-options-grid">
                  <button
                    type="button"
                    className={`drawer-option-pill ${activeSize === 'all' ? 'is-active' : ''}`}
                    onClick={() => handleSizeChange('all')}
                  >
                    TÜMÜ
                  </button>
                  {AVAILABLE_SIZES.map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      className={`drawer-option-pill ${activeSize === sz ? 'is-active' : ''}`}
                      onClick={() => handleSizeChange(sz)}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sort Filter Group */}
              <div className="drawer-filter-group">
                <span className="drawer-group-title">SIRALAMA</span>
                <div className="drawer-options-grid">
                  <button
                    type="button"
                    className={`drawer-option-pill ${activeSort === 'featured' ? 'is-active' : ''}`}
                    onClick={() => handleSortChange('featured')}
                  >
                    Öne Çıkanlar
                  </button>
                  <button
                    type="button"
                    className={`drawer-option-pill ${activeSort === 'newest' ? 'is-active' : ''}`}
                    onClick={() => handleSortChange('newest')}
                  >
                    En Yeniler
                  </button>
                  <button
                    type="button"
                    className={`drawer-option-pill ${activeSort === 'price-asc' ? 'is-active' : ''}`}
                    onClick={() => handleSortChange('price-asc')}
                  >
                    Fiyat: Düşükten Yükseğe
                  </button>
                  <button
                    type="button"
                    className={`drawer-option-pill ${activeSort === 'price-desc' ? 'is-active' : ''}`}
                    onClick={() => handleSortChange('price-desc')}
                  >
                    Fiyat: Yüksekten Düşüğe
                  </button>
                </div>
              </div>
            </div>

            {/* Mobile Drawer Footer Actions */}
            <div className="mobile-drawer-footer">
              <button
                type="button"
                className="drawer-clear-btn"
                onClick={handleClearFilters}
              >
                TEMİZLE
              </button>
              <button
                type="button"
                className="drawer-apply-btn"
                onClick={() => setIsFilterDrawerOpen(false)}
              >
                SONUÇLARI GÖR ({filteredProducts.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SEO Editorial Story & Materiality Section */}
      <section className="collection-seo-section" aria-labelledby="seo-craft-heading">
        <div className="seo-section-grid">
          <div className="seo-col-lead">
            <span className="seo-tag">MATERYAL & ATÖLYE</span>
            <h2 id="seo-craft-heading" className="seo-title">
              Formun ve tenin kesintisiz dengesi.
            </h2>
            <p className="seo-text">
              Pandiones koleksiyonları, estetiği konfordan ödün vermeden yaşatmak üzere
              tasarlanmıştır. İnce balen geometrisi, hassas ten dostu ipek tuşeli danteller ve
              esnek kaşkorse kumaşlar; günün ritmine zahmetsizce uyum sağlar.
            </p>
          </div>
          <div className="seo-col-features">
            <div className="feature-block">
              <h3>DANTEL & TÜL KALİTESİ</h3>
              <p>
                Kaşıntı yapmayan, formunu uzun süre koruyan ve nefes alan özel tekstil dokumaları.
              </p>
            </div>
            <div className="feature-block">
              <h3>ERGONOMİK DESTEK</h3>
              <p>
                Vücut hatlarına tam oturan, batma ve baskı hissi yaratmayan modern sütyen ve crop kalıpları.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Cross-Collection Links */}
      <nav className="related-collections-bar" aria-label="İlgili Koleksiyonlar">
        <span className="related-label">DİĞER DÜNYALAR:</span>
        <div className="related-links-row">
          <Link href="/koleksiyon/soft" prefetch={true}>
            Soft World ↗
          </Link>
          <Link href="/koleksiyon/bold" prefetch={true}>
            Bold World ↗
          </Link>
          <Link href="/koleksiyon/ic-giyim" prefetch={true}>
            İç Giyim ↗
          </Link>
          <Link href="/koleksiyon/crop-bustiyer" prefetch={true}>
            Crop Büstiyer ↗
          </Link>
          <Link href="/koleksiyon/gecelik" prefetch={true}>
            Gecelik ↗
          </Link>
        </div>
      </nav>

      {/* Site Footer */}
      <SiteFooter />
    </main>
  );
}
