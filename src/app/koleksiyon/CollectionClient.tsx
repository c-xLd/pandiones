'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { Product } from '@/types';
import CollectionProductCard from '@/components/collection/CollectionProductCard';

interface CollectionClientProps {
  currentCategory: 'tumu' | 'ic-giyim' | 'ev-giyim';
  title?: string;
}

type GridColumns = '2' | '4' | '6';
type SortOption = 'default' | 'price-asc' | 'price-desc' | 'name';

interface CategoryEditorial {
  eyebrow: string;
  titlePrefix: string;
  titleAccent: string;
  subtitle: string;
  moodImage: string;
  moodCaption: string;
  tags: string[];
  edition: string;
}

const CATEGORY_EDITORIALS: Record<string, CategoryEditorial> = {
  tumu: {
    eyebrow: 'PANDIONES',
    titlePrefix: 'Kusursuz',
    titleAccent: 'Silüetler.',
    subtitle: 'Sessiz lüks, mimari kesimler ve zamansız zarafetle tasarlanmış seçkin parçalar. Tenle kusursuz bir uyum yakalamak için zanaatkâr hassasiyetiyle biçimlendirilir.',
    moodImage: '/assets/campaign-hero.jpeg',
    moodCaption: 'FIG. 01 — YENİ SEZON EDİTORYAL SEÇKİ',
    tags: ['PAMUK FİTİL', 'MİMARİ KESİM', 'ÖZEL TASARIM', 'LÜKS DOKUMA'],
    edition: 'KOLEKSİYON NO. 01',
  },
  'ic-giyim': {
    eyebrow: 'LÜKS İÇ GİYİM · ÖZEL SEÇKİ',
    titlePrefix: 'Tenle Bütünleşen',
    titleAccent: 'Zarafet.',
    subtitle: 'İtalyan danteli, ipeksi dokunuşlar ve tenle kusursuz bütünleşen balensiz doğal formlar. Bedeninizi kısıtlamadan sarıp sarmalayan, görünmeyen bir lüks anlayışı.',
    moodImage: '/assets/campaign-portrait.jpeg',
    moodCaption: 'FIG. 02 — DOĞAL VE ZARİF FORMLAR',
    tags: ['YUMUŞAK KALIP', 'BALENSİZ DOĞAL FORM', 'ÖZEL İŞÇİLİK', 'NEFES ALAN DOKU'],
    edition: 'EDİSYON NO. 02',
  },
  'ev-giyim': {
    eyebrow: 'EV GİYİM & DİNLENME · ÖZEL SEÇKİ',
    titlePrefix: 'Sessiz Lüks &',
    titleAccent: 'Dingin Anlar.',
    subtitle: 'Sakin sabahlar ve dinlendirici akşamlara eşlik eden saf ipek ve saten silüetler. Vücuttan süzülen dökümlü hafiflik, sedef düğmeler ve zamansız renk paleti.',
    moodImage: '/assets/campaign-seated.jpeg',
    moodCaption: 'FIG. 03 — DİNGİN ANLAR VE EV GİYİM',
    tags: ['SAF PAMUK DOKU', 'RAHAT KESİM', 'SEDEF DETAYLAR', 'GÜNLÜK KONFOR'],
    edition: 'EDİSYON NO. 03',
  },
};

const DEFAULT_SIZES = ['XS', 'S', 'M', 'L', 'XL'];

const CATEGORY_INDEX = [
  { slug: 'tumu', href: '/koleksiyon', label: 'Tüm parçalar', image: '/assets/campaign-hero.jpeg' },
  { slug: 'ic-giyim', href: '/koleksiyon/ic-giyim', label: 'İç Giyim', image: '/assets/campaign-portrait.jpeg' },
  { slug: 'ev-giyim', href: '/koleksiyon/ev-giyim', label: 'Ev Giyim', image: '/assets/campaign-seated.jpeg' },
] as const;

const FILTER_COLORS = [
  { name: 'Siyah', hex: '#1c1c1c' },
  { name: 'Beyaz', hex: '#ffffff' },
  { name: 'Fildişi', hex: '#f6f4ee' },
  { name: 'Şampanya', hex: '#e8d9cc' },
  { name: 'Kahve', hex: '#48372d' },
  { name: 'Bordo', hex: '#58111a' },
  { name: 'Gül Kurusu', hex: '#b5797a' },
];

const FILTER_PRICES = [
  { id: 'under-1500', label: '1.500 ₺ altı' },
  { id: '1500-2500', label: '1.500 ₺ - 2.500 ₺' },
  { id: 'above-2500', label: '2.500 ₺ ve üzeri' },
];

const SORT_OPTIONS: { id: SortOption; label: string }[] = [
  { id: 'default', label: 'Önerilen Sıralama' },
  { id: 'price-asc', label: 'Fiyat: Düşükten Yükseğe' },
  { id: 'price-desc', label: 'Fiyat: Yüksekten Düşüğe' },
  { id: 'name', label: 'İsim: A’dan Z’ye' },
];

export default function CollectionClient({
  currentCategory,
  title = 'Koleksiyon',
}: CollectionClientProps) {
  const [columns, setColumns] = useState<GridColumns>('4');
  const [sortBy, setSortBy] = useState<SortOption>('default');
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [productsRetry, setProductsRetry] = useState(0);
  const [addingId, setAddingId] = useState<string | null>(null);

  // Comprehensive Filter State
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedPriceRange, setSelectedPriceRange] = useState<string | null>(null);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);

  const sortDropdownRef = useRef<HTMLDivElement>(null);

  const { addToCart, showToast, setIsBagOpen } = useCart();
  const { toggleWishlist, isFavorite } = useWishlist();

  useEffect(() => {
    setProductsLoading(true);
    setProductsError(null);
    fetch('/api/products')
      .then((res) => {
        if (!res.ok) throw new Error('Koleksiyon yüklenemedi.');
        return res.json();
      })
      .then((data) => {
        if (!Array.isArray(data)) throw new Error('Koleksiyon verisi beklenmeyen biçimde geldi.');
        setProducts(data);
      })
      .catch((error) => setProductsError(error instanceof Error ? error.message : 'Koleksiyon yüklenemedi.'))
      .finally(() => setProductsLoading(false));
  }, [productsRetry]);

  const editorial = CATEGORY_EDITORIALS[currentCategory] || CATEGORY_EDITORIALS.tumu;

  const categoryLabel =
    currentCategory === 'ic-giyim'
      ? 'İç Giyim'
      : currentCategory === 'ev-giyim'
      ? 'Ev Giyim'
      : 'Kadın Koleksiyonu';

  const isCategoryPage = currentCategory !== 'tumu';

  // Sub-style thumbnails tailored for each category view
  const STYLE_THUMBNAILS = [
    { slug: 'beyaz-crop', label: 'Beyaz Crop', image: '/assets/beyaz-crop/1.png', category: 'ic-giyim' },
    { slug: 'siyah-crop', label: 'Siyah Crop', image: '/assets/siyah-crop/1.png', category: 'ic-giyim' },
    { slug: 'askili-crop', label: 'Askılı Crop', image: '/assets/askili-crop/1.png', category: 'ic-giyim' },
    { slug: 'pembe-fitilli-takim', label: 'Pembe Takım', image: '/assets/pembe-fitilli-takim.png', category: 'ic-giyim' },
    { slug: 'bebek-mavisi-takim', label: 'Mavi Takım', image: '/assets/bebek-mavisi-takim.jpeg', category: 'ic-giyim' },
    { slug: 'pembe-tul-takim', label: 'Tül Takım', image: '/assets/pembe-tul-takim.jpeg', category: 'ic-giyim' },
    { slug: 'beyaz-fitilli-atlet', label: 'Fitilli Atlet', image: '/assets/beyaz-fitilli-atlet.png', category: 'ev-giyim' },
  ];

  const relevantStyles = isCategoryPage
    ? STYLE_THUMBNAILS.filter((item) => item.category === currentCategory)
    : STYLE_THUMBNAILS;

  // Active filters count
  const activeFilterCount =
    selectedColors.length +
    selectedSizes.length +
    (selectedPriceRange ? 1 : 0) +
    (inStockOnly ? 1 : 0) +
    selectedStyles.length;

  const clearAllFilters = () => {
    setSelectedColors([]);
    setSelectedSizes([]);
    setSelectedPriceRange(null);
    setInStockOnly(false);
    setSelectedStyles([]);
  };

  // Keyboard navigation & outside click handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isSortOpen) setIsSortOpen(false);
        if (isFilterOpen) setIsFilterOpen(false);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(e.target as Node)) {
        setIsSortOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isFilterOpen, isSortOpen]);

  // Comprehensive reactive filtering logic
  const filteredProducts = useMemo(() => {
    let list = products.filter(
      (p) => currentCategory === 'tumu' || p.category === currentCategory
    );

    // Style / Slug filter
    if (selectedStyles.length > 0) {
      list = list.filter((p) => selectedStyles.includes(p.slug));
    }

    // Colors filter (multi-select)
    if (selectedColors.length > 0) {
      list = list.filter((p) =>
        selectedColors.some((c) => p.color?.toLowerCase() === c.toLowerCase())
      );
    }

    // Sizes filter (checks variants)
    if (selectedSizes.length > 0) {
      list = list.filter((p) =>
        p.variants && p.variants.length > 0
          ? p.variants.some((v) => selectedSizes.includes(v.size) && v.stock > 0)
          : true
      );
    }

    // Price range filter
    if (selectedPriceRange) {
      if (selectedPriceRange === 'under-1500') {
        list = list.filter((p) => p.price < 1500);
      } else if (selectedPriceRange === '1500-2500') {
        list = list.filter((p) => p.price >= 1500 && p.price <= 2500);
      } else if (selectedPriceRange === 'above-2500') {
        list = list.filter((p) => p.price > 2500);
      }
    }

    // Stock status
    if (inStockOnly) {
      list = list.filter((p) =>
        p.variants && p.variants.length > 0
          ? p.variants.some((v) => v.stock > 0)
          : true
      );
    }

    // Sorting
    return list.sort((a, b) => {
      if (sortBy === 'price-asc') return a.price - b.price;
      if (sortBy === 'price-desc') return b.price - a.price;
      if (sortBy === 'name') return a.name.localeCompare(b.name, 'tr');
      return 0;
    });
  }, [products, currentCategory, selectedStyles, selectedColors, selectedSizes, selectedPriceRange, inStockOnly, sortBy]);

  const handleQuickAdd = (product: Product, size: string) => {
    if (!product.variants?.some((variant) => variant.size === size && variant.stock > 0)) {
      showToast('Bu beden şu anda mevcut değil.');
      return;
    }
    addToCart(product, size, 1);
    setAddingId(`${product.id}-${size}`);
    showToast(`${product.name} (${size}) çantaya eklendi.`);
    setTimeout(() => setAddingId(null), 1200);
    setIsBagOpen(true);
  };

  return (
    <main id="main" className={`collection-page-main${isCategoryPage ? ' collection-page-main--category' : ''}`}>
      {/* ── LUXURY EDITORIAL HEADER & VISUAL CATEGORY RAIL (CENTERED) ── */}
      <section className="collection-header-section collection-header-section--centered" aria-labelledby="collection-title">
        <div className="collection-header-top">
          <nav className="collection-breadcrumbs-micro" aria-label="Sayfa haritası">
            <Link href="/">Ana Sayfa</Link>
            <span aria-hidden="true">/</span>
            <Link href="/koleksiyon">Koleksiyon</Link>
            {isCategoryPage && (
              <>
                <span aria-hidden="true">/</span>
                <span>{categoryLabel}</span>
              </>
            )}
          </nav>
          <div className="collection-header-headline-row">
            <h1 id="collection-title" className="collection-serif-title">
              {categoryLabel}
            </h1>
            <span className="collection-total-count">
              ({filteredProducts.length} Parça)
            </span>
          </div>
        </div>

        {/* Horizontal Visual Category Rail (Centered) */}
        <div className="collection-rail-container collection-rail-container--centered">
          <nav className="collection-category-index" aria-label="Koleksiyonları keşfet">
            {/* Primary Category Links */}
            {CATEGORY_INDEX.map((item) => {
              const isCurrent = isCategoryPage
                ? item.slug === currentCategory
                : item.slug === 'tumu' && selectedStyles.length === 0;

              return (
                <Link
                  key={item.slug}
                  href={item.href}
                  className={`collection-category-index-link${isCurrent ? ' is-current' : ''}`}
                  aria-current={isCurrent ? 'page' : undefined}
                  onClick={() => setSelectedStyles([])}
                >
                  <span className="collection-category-index-media">
                    <img
                      src={item.image}
                      alt=""
                      width={120}
                      height={150}
                      loading={isCurrent ? 'eager' : 'lazy'}
                      fetchPriority={isCurrent ? 'high' : undefined}
                    />
                  </span>
                  <span className="collection-category-index-label">{item.label}</span>
                </Link>
              );
            })}

            {/* Sub-style Visual Filter Cards */}
            {relevantStyles.map((item) => {
              const isSelected = selectedStyles.includes(item.slug);
              return (
                <button
                  key={item.slug}
                  type="button"
                  onClick={() => {
                    setSelectedStyles((prev) =>
                      isSelected ? prev.filter((s) => s !== item.slug) : [...prev, item.slug]
                    );
                  }}
                  className={`collection-rail-item-btn${isSelected ? ' is-active' : ''}`}
                  aria-pressed={isSelected}
                  title={`${item.label} stilini filtrele`}
                >
                  <span className="collection-rail-thumb-frame">
                    <img
                      src={item.image}
                      alt=""
                      width={120}
                      height={150}
                      loading="lazy"
                    />
                  </span>
                  <span className="collection-rail-label">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </section>

      {/* ── INTEGRATED LUXURY TOOLBAR ── */}
      <section id="collection-toolbar" className="collection-toolbar" aria-label="Koleksiyon filtreleri ve görünüm">
        {/* Left: Filter Trigger Button & Piece Counter */}
        <div className="toolbar-left">
          <button
            type="button"
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={`toolbar-filter-btn ${isFilterOpen ? 'is-open' : ''} ${activeFilterCount > 0 ? 'has-active' : ''}`}
            aria-expanded={isFilterOpen}
            aria-controls="collection-filter-sidebar"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="filter-icon-svg">
              <line x1="4" y1="6" x2="20" y2="6" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="18" x2="20" y2="18" />
              <circle cx="8" cy="6" r="2.5" fill="currentColor" />
              <circle cx="16" cy="12" r="2.5" fill="currentColor" />
              <circle cx="10" cy="18" r="2.5" fill="currentColor" />
            </svg>
            <span className="filter-label">Filtrele</span>
            {activeFilterCount > 0 ? (
              <span className="toolbar-filter-badge">{activeFilterCount}</span>
            ) : (
              <span className="filter-plus" aria-hidden="true">+</span>
            )}
          </button>
          <span className="toolbar-item-count" aria-live="polite">
            {filteredProducts.length} <span className="count-label">Parça</span>
          </span>
        </div>

        {/* Center: Architectural Segmented Grid Switcher (2'li, 4'lü, 6'lı) */}
        <div className="toolbar-center" role="group" aria-label="Ürün ızgara görünümü">
          <div className="toolbar-segmented-track">
            {/* 2'li Duo Look Icon */}
            <button
              type="button"
              onClick={() => setColumns('2')}
              className={`grid-view-icon-btn ${columns === '2' ? 'is-active' : ''}`}
              aria-pressed={columns === '2'}
              title="2'li Büyük Ürün Görünümü"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <rect x="2" y="2" width="5" height="12" stroke="currentColor" strokeWidth="1.2" rx="0.5" />
                <rect x="9" y="2" width="5" height="12" stroke="currentColor" strokeWidth="1.2" rx="0.5" />
              </svg>
              <span className="sr-only">2’li Büyük Ürün Görünümü</span>
            </button>

            {/* 4'lü Classic Grid Icon */}
            <button
              type="button"
              onClick={() => setColumns('4')}
              className={`grid-view-icon-btn ${columns === '4' ? 'is-active' : ''}`}
              aria-pressed={columns === '4'}
              title="4'lü Klasik Editoryal Izgara"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <rect x="2" y="2" width="5" height="5" stroke="currentColor" strokeWidth="1.2" rx="0.5" />
                <rect x="9" y="2" width="5" height="5" stroke="currentColor" strokeWidth="1.2" rx="0.5" />
                <rect x="2" y="9" width="5" height="5" stroke="currentColor" strokeWidth="1.2" rx="0.5" />
                <rect x="9" y="9" width="5" height="5" stroke="currentColor" strokeWidth="1.2" rx="0.5" />
              </svg>
              <span className="sr-only">4’lü Görünüm</span>
            </button>

            {/* 6'lı Compact Catalog Icon */}
            <button
              type="button"
              onClick={() => setColumns('6')}
              className={`grid-view-icon-btn ${columns === '6' ? 'is-active' : ''}`}
              aria-pressed={columns === '6'}
              title="6'lı Kompakt Katalog Görünümü"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <rect x="1.5" y="2" width="3.5" height="5" stroke="currentColor" strokeWidth="1.1" rx="0.5" />
                <rect x="6.25" y="2" width="3.5" height="5" stroke="currentColor" strokeWidth="1.1" rx="0.5" />
                <rect x="11" y="2" width="3.5" height="5" stroke="currentColor" strokeWidth="1.1" rx="0.5" />
                <rect x="1.5" y="9" width="3.5" height="5" stroke="currentColor" strokeWidth="1.1" rx="0.5" />
                <rect x="6.25" y="9" width="3.5" height="5" stroke="currentColor" strokeWidth="1.1" rx="0.5" />
                <rect x="11" y="9" width="3.5" height="5" stroke="currentColor" strokeWidth="1.1" rx="0.5" />
              </svg>
              <span className="sr-only">6’lı Kompakt Görünüm</span>
            </button>
          </div>
        </div>

        {/* Right: Custom Luxury Sort Dropdown */}
        <div className="toolbar-right">
          <div className="collection-sort-custom-wrap" ref={sortDropdownRef}>
            {/* Hidden native select for test suite compatibility */}
            <label htmlFor="collection-sort" className="sr-only">Sıralama</label>
            <select
              id="collection-sort"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="sr-only"
              tabIndex={-1}
            >
              <option value="default">Sıralama: Önerilen</option>
              <option value="price-asc">Fiyat: Düşükten Yükseğe</option>
              <option value="price-desc">Fiyat: Yüksekten Düşüğe</option>
              <option value="name">İsim: A’dan Z’ye</option>
            </select>

            {/* Custom Luxury Dropdown Trigger Button */}
            <button
              type="button"
              onClick={() => setIsSortOpen(!isSortOpen)}
              className={`collection-sort-trigger-btn ${isSortOpen ? 'is-open' : ''}`}
              aria-haspopup="listbox"
              aria-expanded={isSortOpen}
              aria-label="Ürünleri sırala"
            >
              <span className="sort-trigger-prefix">Sırala:</span>
              <span className="sort-trigger-label">
                {SORT_OPTIONS.find((opt) => opt.id === sortBy)?.label.replace('Sıralama: ', '').replace('Fiyat: ', '').replace('İsim: ', '') || 'Önerilen'}
              </span>
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`sort-trigger-chevron ${isSortOpen ? 'is-rotated' : ''}`}
                aria-hidden="true"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>

            {/* Floating Luxury Dropdown Menu */}
            {isSortOpen && (
              <div
                className="collection-sort-popover"
                role="listbox"
                aria-label="Sıralama seçenekleri"
              >
                <div className="sort-popover-header">
                  <span>Sıralama Ölçütü</span>
                </div>
                {SORT_OPTIONS.map((opt) => {
                  const isSelected = sortBy === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => {
                        setSortBy(opt.id);
                        setIsSortOpen(false);
                      }}
                      className={`collection-sort-popover-item ${isSelected ? 'is-active' : ''}`}
                    >
                      <span className="sort-popover-item-label">{opt.label}</span>
                      {isSelected ? (
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="sort-check-svg">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : (
                        <span className="sort-popover-item-dot" aria-hidden="true" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Mobile Backdrop Overlay (Outside Main Layout to avoid grid collisions) */}
      <div
        className={`filter-backdrop ${isFilterOpen ? 'is-active' : ''}`}
        onClick={() => setIsFilterOpen(false)}
        aria-hidden="true"
      />

      {/* ── MAIN CONTENT AREA WITH PUSH-IN FILTER SIDEBAR (NARROWS CANVAS) ── */}
      <div className={`collection-main-layout ${isFilterOpen ? 'is-filter-open' : ''}`}>

        {/* Left Side Comprehensive Filter Drawer / Sidebar */}
        <aside
          id="collection-filter-sidebar"
          className={`collection-filter-sidebar ${isFilterOpen ? 'is-open' : ''}`}
          aria-label="Ürün filtreleri"
        >
          <div className="filter-sidebar-content">
            {/* Sidebar Header */}
            <div className="filter-sidebar-header">
              <div className="filter-sidebar-title-group">
                <span className="filter-sidebar-title">Filtreler</span>
                {activeFilterCount > 0 && (
                  <span className="filter-sidebar-badge">{activeFilterCount}</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsFilterOpen(false)}
                className="filter-sidebar-close-btn"
                aria-label="Filtreleri kapat"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Quick Clear All Link */}
            {activeFilterCount > 0 && (
              <div className="filter-active-pills-row">
                <span className="filter-active-count-text">{activeFilterCount} filtre uygulandı</span>
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="filter-clear-all-link"
                >
                  Tümünü Temizle
                </button>
              </div>
            )}

            {/* Scrollable Filter Categories */}
            <div className="filter-sidebar-scroll-area">
              {/* Filter Section: Stil & Model */}
              <div className="filter-section">
                <span className="filter-section-title">Stil &amp; Model</span>
                <div className="filter-chips-grid">
                  {STYLE_THUMBNAILS.map((style) => {
                    const isChecked = selectedStyles.includes(style.slug);
                    return (
                      <button
                        key={style.slug}
                        type="button"
                        onClick={() => {
                          setSelectedStyles((prev) =>
                            isChecked ? prev.filter((s) => s !== style.slug) : [...prev, style.slug]
                          );
                        }}
                        className={`filter-tag-chip ${isChecked ? 'is-selected' : ''}`}
                        aria-pressed={isChecked}
                      >
                        {style.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Filter Section: Renk */}
              <div className="filter-section">
                <span className="filter-section-title">Renk</span>
                <div className="filter-colors-grid">
                  {FILTER_COLORS.map((color) => {
                    const isChecked = selectedColors.includes(color.name);
                    return (
                      <button
                        key={color.name}
                        type="button"
                        onClick={() => {
                          setSelectedColors((prev) =>
                            isChecked ? prev.filter((c) => c !== color.name) : [...prev, color.name]
                          );
                        }}
                        className={`filter-color-pill ${isChecked ? 'is-selected' : ''}`}
                        aria-pressed={isChecked}
                      >
                        <span
                          className="filter-color-swatch"
                          style={{ backgroundColor: color.hex }}
                          aria-hidden="true"
                        />
                        <span className="filter-color-name">{color.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Filter Section: Beden */}
              <div className="filter-section">
                <span className="filter-section-title">Beden</span>
                <div className="filter-sizes-grid">
                  {DEFAULT_SIZES.map((size) => {
                    const isChecked = selectedSizes.includes(size);
                    return (
                      <button
                        key={size}
                        type="button"
                        onClick={() => {
                          setSelectedSizes((prev) =>
                            isChecked ? prev.filter((s) => s !== size) : [...prev, size]
                          );
                        }}
                        className={`filter-size-box ${isChecked ? 'is-selected' : ''}`}
                        aria-pressed={isChecked}
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Filter Section: Fiyat Aralığı */}
              <div className="filter-section">
                <span className="filter-section-title">Fiyat Aralığı</span>
                <div className="filter-prices-list">
                  {FILTER_PRICES.map((price) => {
                    const isSelected = selectedPriceRange === price.id;
                    return (
                      <button
                        key={price.id}
                        type="button"
                        onClick={() => setSelectedPriceRange(isSelected ? null : price.id)}
                        className={`filter-price-option ${isSelected ? 'is-selected' : ''}`}
                        aria-pressed={isSelected}
                      >
                        <span className={`filter-radio-circle ${isSelected ? 'is-checked' : ''}`} aria-hidden="true" />
                        <span>{price.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Filter Section: Stok Durumu */}
              <div className="filter-section filter-section--checkbox">
                <label className="filter-toggle-label">
                  <input
                    type="checkbox"
                    checked={inStockOnly}
                    onChange={(e) => setInStockOnly(e.target.checked)}
                    className="filter-toggle-input"
                  />
                  <span className="filter-toggle-switch" aria-hidden="true" />
                  <span className="filter-toggle-text">Yalnızca Stokta Olanlar</span>
                </label>
              </div>
            </div>

            {/* Bottom Apply Action (Especially useful on Mobile) */}
            <div className="filter-sidebar-footer">
              <button
                type="button"
                onClick={() => setIsFilterOpen(false)}
                className="filter-apply-btn"
              >
                Sonuçları Göster ({filteredProducts.length})
              </button>
            </div>
          </div>
        </aside>

        {/* ── RIGHT MAIN CANVAS: PRODUCTS (NARROWS ON FILTER OPEN) ── */}
        <div className="collection-canvas-wrapper">
          {productsLoading ? <p className="collection-load-state" role="status">Koleksiyon yükleniyor…</p> : productsError ? <div className="collection-load-state" role="alert"><p>{productsError}</p><button type="button" onClick={() => setProductsRetry((value) => value + 1)}>Tekrar dene</button></div> : filteredProducts.length === 0 ? (
            <div className="collection-empty-state" role="status" aria-label="Sonuç bulunamadı">
              <h2 className="empty-state-serif">Seçtiğiniz kriterlere uygun parça bulunamadı.</h2>
              <p className="empty-state-sub">Farklı bir renk, beden veya kategori seçmeyi deneyebilir veya filtreleri temizleyebilirsiniz.</p>
              <button type="button" onClick={clearAllFilters} className="empty-state-clear-btn">
                Filtreleri Temizle
              </button>
            </div>
          ) : (
            <section
              id="collection"
              className={`collection-canvas collection-canvas--${columns}`}
              data-columns={columns}
              aria-label="Koleksiyon parçaları"
            >
              {filteredProducts.map((p) => <CollectionProductCard key={p.id} product={p} layout={columns} isFavorite={isFavorite(p.id)} addingId={addingId} onWishlist={() => toggleWishlist(p)} onQuickAdd={(_, size) => handleQuickAdd(p, size)} />)}
            </section>
          )}
        </div>
      </div>

      {/* ── ATELIER HALLMARK FOOTER SIGNATURE ── */}
      {!isCategoryPage && <footer className="collection-atelier-hallmark" aria-label="Pandiones Taahhüdü">
        <div className="hallmark-inner">
          <span className="hallmark-brand">PANDIONES</span>
          <p className="hallmark-creed">
            Her parça, zanaatkâr hassasiyetiyle sınırlı sayıda üretilir. Tenle buluşan her dikişte saf ipek ve İtalyan dantelinin kusursuz uyumu hedeflenir.
          </p>
          <div className="hallmark-pillars">
            <span className="pillar-item">%100 Saf İpek &amp; Fransız Danteli</span>
            <span className="pillar-sep" aria-hidden="true">·</span>
            <span className="pillar-item">Sınırlı Edisyon</span>
            <span className="pillar-sep" aria-hidden="true">·</span>
            <span className="pillar-item">Özel Kutusunda Gönderim</span>
          </div>
        </div>
      </footer>}
    </main>
  );
}
