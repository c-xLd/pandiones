'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { flushSync } from 'react-dom';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { Product } from '@/types';
import CollectionProductCard from '@/components/collection/CollectionProductCard';
import { productInCategory } from '@/lib/products/category-match';
import { filterOptions } from '@/lib/products/filter-options';
import type { CollectionCategory } from '@/lib/products/load-collection';
import { ALL_PRODUCTS_HREF, categoryHref, subcategoryHref } from '@/lib/routes';

interface CollectionClientProps {
  /** 'yeni-gelenler' for every product, otherwise a root or child category slug. */
  currentCategory: 'yeni-gelenler' | string;
  title?: string;
  /** Rendered on the server so the first paint already has the products. */
  initialProducts: Product[];
  categories: CollectionCategory[];
  initialError?: string | null;
  /** Category rail for /yeni-gelenler, rendered on the server (no hydration cost). */
  rail?: React.ReactNode;
  /** "Az kaldı" threshold from Yönetim → Ayarlar (server-read and passed down). */
  lowStockThreshold?: number;
}

type GridColumns = '2' | '4' | '6';
type SortOption = 'default' | 'price-asc' | 'price-desc' | 'name';

/** Swatch colours for product colour names; unknown names get a neutral swatch. */
const COLOR_SWATCHES: Record<string, string> = {
  siyah: '#1c1c1c',
  beyaz: '#ffffff',
  fildişi: '#f6f4ee',
  şampanya: '#e8d9cc',
  kahve: '#48372d',
  bordo: '#58111a',
  'gül kurusu': '#b5797a',
  pembe: '#e8b8be',
  'bebek mavisi': '#bcd3e6',
};

const swatchFor = (color: string) => COLOR_SWATCHES[color.toLocaleLowerCase('tr-TR')] ?? '#d4d4d8';

/** Cards whose cover is likely visible without scrolling, per grid layout. */
const ABOVE_THE_FOLD: Record<GridColumns, number> = { '2': 1, '4': 4, '6': 6 };

const FILTER_PRICES = [
  { id: 'under-1500', label: '1.500 ₺ altı' },
  { id: '1500-2500', label: '1.500 ₺ - 2.500 ₺' },
  { id: 'above-2500', label: '2.500 ₺ ve üzeri' },
];

/** `short` is the trigger label, so it fits a phone toolbar. */
const SORT_OPTIONS: { id: SortOption; label: string; short: string }[] = [
  { id: 'default', label: 'Önerilen Sıralama', short: 'Önerilen' },
  { id: 'price-asc', label: 'Fiyat: Düşükten Yükseğe', short: 'Fiyat ↑' },
  { id: 'price-desc', label: 'Fiyat: Yüksekten Düşüğe', short: 'Fiyat ↓' },
  { id: 'name', label: 'İsim: A’dan Z’ye', short: 'A–Z' },
];

export default function CollectionClient({
  currentCategory,
  initialProducts,
  categories,
  initialError = null,
  rail = null,
  lowStockThreshold,
}: CollectionClientProps) {
  const [columns, setColumns] = useState<GridColumns>('4');
  const [sortBy, setSortBy] = useState<SortOption>('default');
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState<string | null>(initialError);
  const [addingId, setAddingId] = useState<string | null>(null);

  // Comprehensive Filter State
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedPriceRange, setSelectedPriceRange] = useState<string | null>(null);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);

  const sortDropdownRef = useRef<HTMLDivElement>(null);
  const sortTriggerRef = useRef<HTMLButtonElement>(null);
  const sortListRef = useRef<HTMLDivElement>(null);
  const filterTriggerRef = useRef<HTMLButtonElement>(null);
  const filterSidebarRef = useRef<HTMLElement>(null);

  const { addToCart, showToast, setIsBagOpen } = useCart();
  const { toggleWishlist, isFavorite } = useWishlist();

  // Only used by "Tekrar dene" when the server could not read the catalogue.
  const retryProducts = () => {
    setProductsLoading(true);
    setProductsError(null);
    fetch('/api/products')
      .then((res) => {
        if (!res.ok) throw new Error('Koleksiyon yüklenemedi.');
        return res.json();
      })
      .then((data) => {
        if (!Array.isArray(data)) throw new Error('Koleksiyon verisi beklenmeyen biçimde geldi.');
        setProducts(data.filter((p: Product) => p.category !== 'hediye-karti'));
      })
      .catch((error) => setProductsError(error instanceof Error ? error.message : 'Koleksiyon yüklenemedi.'))
      .finally(() => setProductsLoading(false));
  };

  // Where this page sits in the category tree: a root category, or a child of one.
  const placement = useMemo(() => {
    for (const root of categories) {
      if (root.slug === currentCategory) return { root, node: { slug: root.slug, name: root.name }, childSlugs: root.children.map((c) => c.slug) };
      const child = root.children.find((c) => c.slug === currentCategory);
      if (child) return { root, node: { slug: child.slug, name: child.name }, childSlugs: [] as string[] };
    }
    return null;
  }, [categories, currentCategory]);

  // Subcategory tabs are links to /kategori/alt-kategori. On a child page they list its siblings.
  // /yeni-gelenler has no tabs here; its root categories are in the rail.
  const subcategories = useMemo<{ id: string; slug: string; name: string; href: string }[]>(() => {
    if (!placement) return [];
    const rootSlug = placement.root.slug;
    return placement.root.children.map((child) => ({
      id: child.id,
      slug: child.slug,
      name: child.name,
      href: subcategoryHref(rootSlug, child.slug),
    }));
  }, [placement]);

  // "Hepsine bakın" opens the parent category (or this page when it is the parent).
  const allHref = placement ? categoryHref(placement.root.slug) : ALL_PRODUCTS_HREF;
  const onAllPage = placement?.root.slug === currentCategory;

  // Mark the toolbar while it is pinned under the header so the glass surface can fade in.
  useEffect(() => {
    const toolbar = document.getElementById('collection-toolbar');
    if (!toolbar) return;
    let stuck = false;
    const check = () => {
      const pinnedAt = parseFloat(getComputedStyle(toolbar).top) || 0;
      const next = window.scrollY > 0 && toolbar.getBoundingClientRect().top <= pinnedAt + 1;
      if (next !== stuck) {
        stuck = next;
        toolbar.dataset.stuck = String(next);
      }
    };
    check();
    window.addEventListener('scroll', check, { passive: true });
    window.addEventListener('resize', check);
    return () => {
      window.removeEventListener('scroll', check);
      window.removeEventListener('resize', check);
    };
  }, []);

  const FIXED_LABELS: Record<string, string> = { 'yeni-gelenler': 'Yeni Gelenler', 'ic-giyim': 'İç Giyim', 'ev-giyim': 'Ev Giyim' };
  const categoryLabel = FIXED_LABELS[currentCategory] ?? placement?.node.name ?? 'Kadın Koleksiyonu';

  const isCategoryPage = currentCategory !== 'yeni-gelenler';

  // Subcategories are shown only as the text buttons under the title.
  const pillItems = subcategories;

  // Filter options come from the products on this page, never a fixed list.
  const categoryProducts = useMemo(() => {
    const childSlugs = placement?.childSlugs ?? [];
    return products.filter(
      (p) =>
        currentCategory === 'yeni-gelenler' ||
        productInCategory({ category: p.category, subcategory: p.subcategory }, currentCategory, childSlugs)
    );
  }, [products, currentCategory, placement]);

  const { colors: colorOptions, sizes: sizeOptions } = useMemo(() => filterOptions(categoryProducts), [categoryProducts]);

  // The filter panel's contents are built on first open, not in the initial render (smaller DOM, less hydration).
  const [filterPanelReady, setFilterPanelReady] = useState(false);
  useEffect(() => {
    if (isFilterOpen) setFilterPanelReady(true);
  }, [isFilterOpen]);

  // Active filters count
  const activeFilterCount =
    selectedColors.length +
    selectedSizes.length +
    (selectedPriceRange ? 1 : 0) +
    (inStockOnly ? 1 : 0);

  // Every active filter stays visible (and removable) while the panel is closed.
  const activeChips: { key: string; label: string; remove: () => void }[] = [
    ...selectedColors.map((color) => ({
      key: `color-${color}`,
      label: color,
      remove: () => setSelectedColors((prev) => prev.filter((c) => c !== color)),
    })),
    ...selectedSizes.map((size) => ({
      key: `size-${size}`,
      label: `Beden ${size}`,
      remove: () => setSelectedSizes((prev) => prev.filter((s) => s !== size)),
    })),
    ...(selectedPriceRange
      ? [{
          key: `price-${selectedPriceRange}`,
          label: FILTER_PRICES.find((price) => price.id === selectedPriceRange)?.label ?? '',
          remove: () => setSelectedPriceRange(null),
        }]
      : []),
    ...(inStockOnly ? [{ key: 'stock', label: 'Yalnızca stokta olanlar', remove: () => setInStockOnly(false) }] : []),
  ];

  const clearAllFilters = () => {
    setSelectedColors([]);
    setSelectedSizes([]);
    setSelectedPriceRange(null);
    setInStockOnly(false);
  };

  // Keyboard navigation & outside click handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isSortOpen) {
          setIsSortOpen(false);
          sortTriggerRef.current?.focus();
        }
        if (isFilterOpen) {
          setIsFilterOpen(false);
          if (filterSidebarRef.current?.contains(document.activeElement)) filterTriggerRef.current?.focus();
        }
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

  // Sort listbox: focus the selected option on open; arrows, Home/End move between options.
  useEffect(() => {
    if (!isSortOpen) return;
    sortListRef.current?.querySelector<HTMLButtonElement>('[aria-selected="true"]')?.focus();
  }, [isSortOpen]);

  const onSortListKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const options = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="option"]'));
    const current = options.indexOf(document.activeElement as HTMLButtonElement);
    const next =
      e.key === 'ArrowDown' ? (current + 1) % options.length
        : e.key === 'ArrowUp' ? (current - 1 + options.length) % options.length
          : e.key === 'Home' ? 0
            : e.key === 'End' ? options.length - 1
              : null;
    if (next !== null) {
      e.preventDefault();
      options[next]?.focus();
    } else if (e.key === 'Tab') {
      setIsSortOpen(false);
    }
  };

  // Below 1024px the filter panel is a drawer over the page: lock the page, keep Tab inside, return focus on close.
  useEffect(() => {
    if (!isFilterOpen || !filterPanelReady) return;
    if (!window.matchMedia('(max-width: 1023px)').matches) return;
    const sidebar = filterSidebarRef.current;
    if (!sidebar) return;
    const trigger = filterTriggerRef.current;
    const focusable = () =>
      Array.from(sidebar.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled])'));
    focusable()[0]?.focus();

    const trapTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const items = focusable();
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', trapTab);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', trapTab);
      if (sidebar.contains(document.activeElement)) trigger?.focus();
    };
  }, [isFilterOpen, filterPanelReady]);

  // Comprehensive reactive filtering logic
  const filteredProducts = useMemo(() => {
    let list = categoryProducts;

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
    return [...list].sort((a, b) => {
      if (sortBy === 'price-asc') return a.price - b.price;
      if (sortBy === 'price-desc') return b.price - a.price;
      if (sortBy === 'name') return a.name.localeCompare(b.name, 'tr');
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });
  }, [categoryProducts, selectedColors, selectedSizes, selectedPriceRange, inStockOnly, sortBy]);

  // Cross-fade the grid between layouts where the browser supports view transitions (not under reduced motion).
  const changeColumns = (next: GridColumns) => {
    if (next === columns) return;
    const canAnimate =
      typeof document.startViewTransition === 'function' &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!canAnimate) {
      setColumns(next);
      return;
    }
    const transition = document.startViewTransition(() => flushSync(() => setColumns(next)));
    // A transition skipped by the browser (tab hidden, another one starting) is not an error here.
    transition.ready.catch(() => {});
    transition.finished.catch(() => {});
  };

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
      {/* ── Centered header: path, title, piece count, optional category description; rail below ── */}
      <section className="collection-header-section collection-header-section--centered" aria-labelledby="collection-title">
        <div className="collection-header-top">
          <h1 id="collection-title" className="collection-serif-title">
            {categoryLabel}
          </h1>
        </div>

        {/* /yeni-gelenler: one rail of every root category. Category pages use the subcategory tabs below. */}
        {!isCategoryPage ? rail : null}

        {/* ── Subcategory tabs (category pages): category-rail for subcategories ── */}
        {isCategoryPage && pillItems.length > 0 && (
          <nav className="category-rail" aria-label="Alt kategoriler">
            <ul className="category-rail__list">
              <li className="category-rail__item" style={{ '--i': 0 } as React.CSSProperties}>
                <Link
                  href={allHref}
                  className={`category-rail__link${onAllPage ? ' is-current' : ''}`}
                  aria-current={onAllPage ? 'page' : undefined}
                >
                  Tümü
                </Link>
              </li>
              {pillItems.map((sub, idx) => {
                const isCurrent = sub.slug === currentCategory;
                return (
                  <li key={sub.id} className="category-rail__item" style={{ '--i': idx + 1 } as React.CSSProperties}>
                    <Link
                      href={sub.href}
                      className={`category-rail__link${isCurrent ? ' is-current' : ''}`}
                      aria-current={isCurrent ? 'page' : undefined}
                    >
                      {sub.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        )}
      </section>

      {/* ── INTEGRATED LUXURY TOOLBAR ── */}
      <section id="collection-toolbar" className="collection-toolbar" aria-label="Koleksiyon filtreleri ve görünüm">
        {/* Left: Filter Trigger Button & Piece Counter */}
        <div className="toolbar-left">
          <button
            ref={filterTriggerRef}
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
              <span className="toolbar-filter-badge">
                {activeFilterCount}
                <span className="sr-only"> filtre uygulandı</span>
              </span>
            ) : null}
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
              onClick={() => changeColumns('2')}
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
              onClick={() => changeColumns('4')}
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
              onClick={() => changeColumns('6')}
              className={`grid-view-icon-btn grid-view-icon-btn--dense ${columns === '6' ? 'is-active' : ''}`}
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
              ref={sortTriggerRef}
              type="button"
              onClick={() => setIsSortOpen(!isSortOpen)}
              className={`collection-sort-trigger-btn ${isSortOpen ? 'is-open' : ''}`}
              aria-haspopup="listbox"
              aria-expanded={isSortOpen}
              aria-label="Ürünleri sırala"
            >
              <span className="sort-trigger-prefix">Sırala:</span>
              <span className="sort-trigger-label">
                {SORT_OPTIONS.find((opt) => opt.id === sortBy)?.short ?? 'Önerilen'}
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
                ref={sortListRef}
                className="collection-sort-popover"
                role="listbox"
                aria-label="Sıralama seçenekleri"
                onKeyDown={onSortListKeyDown}
              >
                {SORT_OPTIONS.map((opt) => {
                  const isSelected = sortBy === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      tabIndex={isSelected ? 0 : -1}
                      onClick={() => {
                        setSortBy(opt.id);
                        setIsSortOpen(false);
                        sortTriggerRef.current?.focus();
                      }}
                      className={`collection-sort-popover-item ${isSelected ? 'is-active' : ''}`}
                    >
                      <span className="sort-popover-item-label">{opt.label}</span>
                      {isSelected ? (
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="sort-check-svg">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : null}
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
          ref={filterSidebarRef}
          id="collection-filter-sidebar"
          className={`collection-filter-sidebar ${isFilterOpen ? 'is-open' : ''}`}
          aria-label="Ürün filtreleri"
        >
          {filterPanelReady ? <div className="filter-sidebar-content">
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
              {/* Filter Section: Renk */}
              {colorOptions.length > 1 ? <div className="filter-section" role="group" aria-labelledby="filter-title-color">
                <span id="filter-title-color" className="filter-section-title">Renk</span>
                <div className="filter-colors-grid">
                  {colorOptions.map((color) => {
                    const isChecked = selectedColors.includes(color);
                    return (
                      <button
                        key={color}
                        type="button"
                        onClick={() => {
                          setSelectedColors((prev) =>
                            isChecked ? prev.filter((c) => c !== color) : [...prev, color]
                          );
                        }}
                        className={`filter-color-pill ${isChecked ? 'is-selected' : ''}`}
                        aria-pressed={isChecked}
                      >
                        <span
                          className="filter-color-swatch"
                          style={{ backgroundColor: swatchFor(color) }}
                          aria-hidden="true"
                        />
                        <span className="filter-color-name">{color}</span>
                      </button>
                    );
                  })}
                </div>
              </div> : null}

              {/* Filter Section: Beden */}
              {sizeOptions.length > 0 ? <div className="filter-section" role="group" aria-labelledby="filter-title-size">
                <span id="filter-title-size" className="filter-section-title">Beden</span>
                <div className="filter-sizes-grid">
                  {sizeOptions.map((size) => {
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
              </div> : null}

              {/* Filter Section: Fiyat Aralığı */}
              <div className="filter-section" role="group" aria-labelledby="filter-title-price">
                <span id="filter-title-price" className="filter-section-title">Fiyat Aralığı</span>
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
                className="btn btn--primary btn--block filter-apply-btn"
              >
                Sonuçları Göster ({filteredProducts.length})
              </button>
            </div>
          </div> : null}
        </aside>

        {/* ── RIGHT MAIN CANVAS: PRODUCTS (NARROWS ON FILTER OPEN) ── */}
        <div className="collection-canvas-wrapper">
          {activeChips.length > 0 && !productsLoading && !productsError ? (
            <div className="collection-active-filters" role="group" aria-label="Uygulanan filtreler">
              <ul className="collection-active-filters__list">
                {activeChips.map((chip) => (
                  <li key={chip.key}>
                    <button
                      type="button"
                      className="collection-active-chip"
                      onClick={chip.remove}
                      aria-label={`${chip.label} filtresini kaldır`}
                    >
                      <span>{chip.label}</span>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
              {activeChips.length > 1 ? (
                <button type="button" className="collection-active-filters__clear" onClick={clearAllFilters}>
                  Tümünü temizle
                </button>
              ) : null}
            </div>
          ) : null}
          {productsLoading ? (<div aria-busy="true"><p className="visually-hidden" role="status">Koleksiyon yükleniyor</p><div className="collection-skeleton__grid" aria-hidden="true">{Array.from({ length: 4 }, (_, index) => <div key={index} className="collection-skeleton__card"><span className="skeleton-block collection-skeleton__media" /><span className="skeleton-block collection-skeleton__line" /><span className="skeleton-block collection-skeleton__line collection-skeleton__line--short" /></div>)}</div></div>) : productsError ? <div className="collection-load-state" role="alert"><p>{productsError}</p><button type="button" className="btn btn--secondary" onClick={retryProducts}>Tekrar dene</button></div> : filteredProducts.length === 0 ? (
            activeFilterCount > 0 ? (
              <div className="collection-empty-state" role="status" aria-label="Sonuç bulunamadı">
                <h2 className="empty-state-serif">Seçtiğiniz kriterlere uygun parça bulunamadı.</h2>
                <p className="empty-state-sub">Farklı bir renk, beden veya kategori seçmeyi deneyebilir veya filtreleri temizleyebilirsiniz.</p>
                <button type="button" onClick={clearAllFilters} className="btn btn--primary empty-state-clear-btn">
                  Filtreleri Temizle
                </button>
              </div>
            ) : (
              <div className="collection-empty-state" role="status" aria-label="Bu kategoride ürün yok">
                <h2 className="empty-state-serif">Bu kategoride henüz parça yok.</h2>
                <p className="empty-state-sub">Yeni parçalar eklendiğinde burada listelenecek. Şimdilik tüm parçalara göz atabilirsiniz.</p>
                <Link href={ALL_PRODUCTS_HREF} className="btn btn--primary empty-state-clear-btn">
                  Tüm parçaları gör
                </Link>
              </div>
            )
          ) : (
            <section
              id="collection"
              className={`collection-canvas collection-canvas--${columns}`}
              data-columns={columns}
              aria-label="Koleksiyon parçaları"
            >
              {filteredProducts.map((p, index) => <CollectionProductCard key={p.id} product={p} layout={columns} lowStockThreshold={lowStockThreshold} priority={index < ABOVE_THE_FOLD[columns]} isFavorite={isFavorite(p.id)} addingId={addingId} onWishlist={() => toggleWishlist(p)} onQuickAdd={(_, size) => handleQuickAdd(p, size)} />)}
            </section>
          )}
        </div>
      </div>

    </main>
  );
}
