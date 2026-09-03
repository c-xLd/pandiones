'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { formatPrice } from '@/lib/format';
import type { Product } from '@/lib/catalog';
import { supabase } from '@/lib/supabase';

const DEFAULT_PORTFOLIO: Product[] = [
  {
    id: 'p1',
    slug: 'simli-destekli-bustiyer-takim',
    name: 'SİMLİ BÜSTİYER TAKIM',
    categorySlug: 'ic-giyim',
    categoryName: 'Dantel Serisi',
    priceKurus: 89900,
    color: 'Siyah Simli',
    image: '/products/simli-bustiyer-takim.webp',
    imagePosition: 'center 20%',
    description: 'Özel simli kumaş ve balenli destek',
    material: 'Poliamid & Sim · Balenli Destek',
    fit: 'Destekli & Toparlayıcı',
    sizes: ['75B', '80B', '85B', '90B'],
    featuredRank: 1,
  },
  {
    id: 'p2',
    slug: 'cizgili-dantelli-takim',
    name: 'ÇİZGİLİ DANTELLİ TAKIM',
    categorySlug: 'ic-giyim',
    categoryName: 'Dantel Serisi',
    priceKurus: 94900,
    color: 'Bordo / Şarap',
    image: '/products/cizgili-dantelli-takim.webp',
    imagePosition: 'center 25%',
    description: 'Yumuşak kap ve balensiz rahatlık',
    material: '%88 Poliamid · Yumuşak Kap',
    fit: 'Balensiz Rahat Kalıp',
    sizes: ['75B', '80B', '85B', '90B'],
    featuredRank: 2,
  },
  {
    id: 'p3',
    slug: 'fitilli-v-yaka-crop-bustiyer',
    name: 'FİTİLLİ V-YAKA CROP',
    categorySlug: 'crop-bustiyer',
    categoryName: 'Crop Büstiyer',
    priceKurus: 54900,
    color: 'Melanj Gri',
    image: '/products/gri-crop-bustiyer.webp',
    imagePosition: 'center 30%',
    description: 'Günlük ve özel kombinler için',
    material: '%95 Pamuk, %5 Elastan',
    fit: 'Rahat & Esnek Fit',
    sizes: ['XS', 'S', 'M', 'L'],
    featuredRank: 3,
  },
  {
    id: 'p4',
    slug: 'fitilli-u-yaka-siyah-crop',
    name: 'FİTİLLİ U-YAKA SİYAH CROP',
    categorySlug: 'crop-bustiyer',
    categoryName: 'Günlük Seri',
    priceKurus: 57900,
    color: 'Mat Siyah',
    image: '/products/crop-siyah-main.webp',
    imagePosition: 'center 20%',
    description: 'Geniş askılı, derin U yaka kesimli büstiyer',
    material: '%92 Mikrofiber, %8 Spandeks',
    fit: 'Sıkı & Toparlayıcı Kalıp',
    sizes: ['XS', 'S', 'M', 'L'],
    featuredRank: 4,
  },
  {
    id: 'p5',
    slug: 'tul-dantelli-gecelik-takim',
    name: 'TÜL DANTELLİ GECE TAKIMI',
    categorySlug: 'gecelik',
    categoryName: 'Gecelik Serisi',
    priceKurus: 82900,
    color: 'Gece Siyahı',
    image: '/products/tul-babydoll-set.webp',
    imagePosition: 'center 15%',
    description: 'İtalyan tülü ve dantel detaylar',
    material: 'İtalyan Tülü & Fransız Dantel',
    fit: 'Dökümlü Akışkan Kesim',
    sizes: ['S', 'M', 'L', 'XL'],
    featuredRank: 5,
  },
];

export default function EditorialDropReel({
  initialProducts,
  mood,
}: {
  initialProducts?: Product[];
  mood?: 'soft' | 'bold';
}) {
  const [products, setProducts] = useState<Product[]>(
    initialProducts && initialProducts.length > 0 ? initialProducts : DEFAULT_PORTFOLIO
  );
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    supabase
      .from('products')
      .select('*')
      .eq('status', 'published')
      .order('featured_rank', { ascending: true })
      .limit(8)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setProducts(
            data.map((row) => ({
              id: row.id,
              slug: row.slug,
              name: row.name,
              categorySlug: row.category_slug,
              categoryName: row.category_name,
              priceKurus: row.price_kurus,
              color: row.color,
              image: row.image,
              imagePosition: row.image_position,
              description: row.description,
              material: row.material,
              fit: row.fit,
              sizes: typeof row.sizes_json === 'string' ? JSON.parse(row.sizes_json) : row.sizes_json,
              featuredRank: row.featured_rank,
            }))
          );
        }
      })
      .catch((err) => {
        console.warn('Portfolio Supabase fetch error, using default portfolio:', err);
      });
  }, []);

  // Filter or prioritize based on mood if provided
  const displayedProducts = mood
    ? [...products].sort((a, b) => {
        if (mood === 'soft') {
          const aSoft = a.categorySlug === 'crop-bustiyer' ? -1 : 1;
          const bSoft = b.categorySlug === 'crop-bustiyer' ? -1 : 1;
          return aSoft - bSoft;
        } else {
          const aBold = a.categorySlug === 'ic-giyim' || a.categorySlug === 'gecelik' ? -1 : 1;
          const bBold = b.categorySlug === 'ic-giyim' || b.categorySlug === 'gecelik' ? -1 : 1;
          return aBold - bBold;
        }
      }).slice(0, 5)
    : products.slice(0, 5);

  const safeIndex = Math.min(activeIndex, displayedProducts.length - 1);
  const activeProduct = displayedProducts[safeIndex];

  return (
    <section className="editorial-portfolio" aria-labelledby="portfolio-title">
      <div className="portfolio-header">
        <p className="section-kicker">SEÇİLİ PORTFOLYO / THE DROP</p>
        <h2 id="portfolio-title">
          Kusursuz
          <br />
          <i>silüetler.</i>
        </h2>
      </div>

      {/* Desktop Master-Detail View (>=901px) */}
      <div className="portfolio-container portfolio-desktop-view">
        {/* Left Side: Sticky/Changing Image Feature */}
        <div className="portfolio-feature">
          <div className="portfolio-frame">
            {displayedProducts.map((product, idx) => (
              <img
                key={product.id}
                src={product.image}
                alt={product.name}
                className={safeIndex === idx ? 'active' : ''}
                loading="lazy"
                decoding="async"
                width="600"
                height="800"
                onError={(e) => {
                  const target = e.currentTarget;
                  if (!target.dataset.fallback) {
                    target.dataset.fallback = 'true';
                    target.src = '/products/simli-bustiyer-takim.webp';
                  }
                }}
              />
            ))}
          </div>
          <div className="portfolio-feature-meta">
            <span className="portfolio-index">
              0{safeIndex + 1} / 0{displayedProducts.length}
            </span>
            <span className="portfolio-cat">{activeProduct?.categoryName || 'Pandiones Studio'}</span>
          </div>
        </div>

        {/* Right Side: Vertical Hover List */}
        <div className="portfolio-list" role="list">
          {displayedProducts.map((product, idx) => (
            <Link
              href={`/${product.slug}`}
              key={product.id}
              className={`portfolio-item ${safeIndex === idx ? 'active' : ''}`}
              onMouseEnter={() => setActiveIndex(idx)}
              onFocus={() => setActiveIndex(idx)}
              role="listitem"
              prefetch={true}
            >
              <div className="portfolio-item-num">0{idx + 1}</div>
              <div className="portfolio-item-content">
                <h3>{product.name}</h3>
                <p>{product.material || product.categoryName}</p>
              </div>
              <div className="portfolio-item-price">
                {formatPrice(product.priceKurus)}
              </div>
              <div className="portfolio-item-arrow" aria-hidden="true">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                  <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Mobile Touch-First Scroll-Snap Reel (<900px) */}
      <div className="portfolio-mobile-view">
        <div className="portfolio-mobile-reel" role="region" aria-label="Seçili ürünler yatay listesi">
          {displayedProducts.map((product, idx) => (
            <article key={product.id} className="portfolio-mobile-card">
              <Link
                href={`/${product.slug}`}
                className="portfolio-mobile-media"
                aria-label={`${product.name} ürün detayını incele`}
                prefetch={true}
              >
                <img
                  src={product.image}
                  alt={`${product.name} - ${product.color}`}
                  loading="lazy"
                  decoding="async"
                  width="480"
                  height="640"
                  style={{ objectPosition: product.imagePosition || 'center 25%' }}
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (!target.dataset.fallback) {
                      target.dataset.fallback = 'true';
                      target.src = '/products/simli-bustiyer-takim.webp';
                    }
                  }}
                />
                <span className="portfolio-mobile-badge">0{idx + 1}</span>
                <span className="portfolio-mobile-quick-view">İNCELE ↗</span>
              </Link>
              <div className="portfolio-mobile-content">
                <div className="portfolio-mobile-header">
                  <span className="portfolio-mobile-cat">{product.categoryName}</span>
                  <span className="portfolio-mobile-price">{formatPrice(product.priceKurus)}</span>
                </div>
                <h3>
                  <Link href={`/${product.slug}`} prefetch={true}>
                    {product.name}
                  </Link>
                </h3>
                <p>{product.material || product.description}</p>
                <div className="portfolio-mobile-footer">
                  <Link href={`/${product.slug}`} className="portfolio-mobile-cta" prefetch={true}>
                    <span>Detayları Keşfet</span>
                    <span aria-hidden="true">→</span>
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
        <div className="portfolio-mobile-cue" aria-hidden="true">
          <span>KAYDIR</span>
          <i>—</i>
          <span>{displayedProducts.length} SEÇKİ</span>
        </div>
      </div>
    </section>
  );
}
