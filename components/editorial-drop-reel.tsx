'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { formatPrice } from '@/lib/format';
import type { Product } from '@/lib/catalog';
import { supabase } from '@/lib/supabase';

export default function EditorialDropReel({ initialProducts }: { initialProducts?: Product[] }) {
  const [products, setProducts] = useState<Product[]>(initialProducts || []);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (products.length === 0) {
      supabase
        .from('products')
        .select('*')
        .eq('status', 'published')
        .order('featured_rank', { ascending: true })
        .limit(4)
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
    }
  }, [products.length]);

  if (products.length === 0) {
    return null;
  }

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
        {/* Left Side: Sticky Image Feature */}
        <div className="portfolio-feature">
          <div className="portfolio-frame">
            {products.map((product, idx) => (
              <img
                key={product.id}
                src={product.image}
                alt={product.name}
                className={safeIndex === idx ? 'active' : ''}
              />
            ))}
          </div>
          <div className="portfolio-feature-meta">
            <span className="portfolio-index">
              0{safeIndex + 1} / 0{products.length}
            </span>
            <span className="portfolio-cat">{activeProduct?.categoryName}</span>
          </div>
        </div>

        {/* Right Side: Interactive List */}
        <div className="portfolio-list" role="list">
          {products.map((product, idx) => (
            <Link
              href={`/${product.slug}`}
              key={product.id}
              className={`portfolio-item ${activeIndex === idx ? 'active' : ''}`}
              onMouseEnter={() => setActiveIndex(idx)}
              onFocus={() => setActiveIndex(idx)}
              role="listitem"
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
