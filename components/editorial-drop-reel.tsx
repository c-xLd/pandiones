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

export default function EditorialDropReel({ initialProducts }: { initialProducts?: Product[] }) {
  const [products, setProducts] = useState<Product[]>(initialProducts && initialProducts.length > 0 ? initialProducts : DEFAULT_PORTFOLIO);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    supabase
      .from('products')
      .select('*')
      .eq('status', 'published')
      .order('featured_rank', { ascending: true })
      .limit(6)
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
      });
  }, []);

  const safeIndex = Math.min(activeIndex, products.length - 1);
  const activeProduct = products[safeIndex];

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

      <div className="portfolio-container">
        {/* Left Side: Sticky/Changing Image Feature */}
        <div className="portfolio-feature">
          <div className="portfolio-frame">
            {products.map((product, idx) => (
              <img
                key={product.id}
                src={product.image}
                alt={product.name}
                className={safeIndex === idx ? 'active' : ''}
                loading="lazy"
                decoding="async"
                width="600"
                height="800"
              />
            ))}
          </div>
          <div className="portfolio-feature-meta">
            <span className="portfolio-index">
              0{safeIndex + 1} / 0{products.length}
            </span>
            <span className="portfolio-cat">{activeProduct?.categoryName || 'Pandiones Studio'}</span>
          </div>
        </div>

        {/* Right Side: Vertical Hover List */}
        <div className="portfolio-list" role="list">
          {products.map((product, idx) => (
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
              <div className="portfolio-item-arrow">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                  <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
