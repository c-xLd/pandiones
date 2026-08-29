'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatPrice } from '@/lib/format';

const PORTFOLIO_PRODUCTS = [
  {
    id: 'p1',
    slug: 'simli-destekli-bustiyer-takim',
    name: 'SİMLİ BÜSTİYER',
    priceKurus: 129999,
    image: '/products/simli-bustiyer-takim.jpg',
    material: 'Poliamid / Sim',
    categoryName: 'Dantel Serisi',
  },
  {
    id: 'p2',
    slug: 'ikili-toparlayici-u-yaka-bustiyer-paketi',
    name: 'U-YAKA BÜSTİYER',
    priceKurus: 189999,
    image: '/products/ikili-u-yaka.jpg',
    material: 'Toparlayıcı Doku',
    categoryName: 'Günlük Serisi',
  },
  {
    id: 'p3',
    slug: 'v-yaka-ince-askili-sutyen',
    name: 'V-YAKA SÜTYEN',
    priceKurus: 89999,
    image: '/products/v-yaka.jpg',
    material: 'Soft Mikro',
    categoryName: 'Temel Serisi',
  },
  {
    id: 'p4',
    slug: 'kalin-askili-sirt-dekolteli-crop',
    name: 'SIRT DEKOLTELİ CROP',
    priceKurus: 109999,
    image: '/products/sirt-dekolteli-crop.jpg',
    material: 'Korse Kumaş',
    categoryName: 'Couture',
  },
];

export default function EditorialDropReel() {
  const [activeIndex, setActiveIndex] = useState(0);

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
            {PORTFOLIO_PRODUCTS.map((product, idx) => (
              <img
                key={product.id}
                src={product.image}
                alt={product.name}
                className={activeIndex === idx ? 'active' : ''}
              />
            ))}
          </div>
          <div className="portfolio-feature-meta">
            <span className="portfolio-index">0{activeIndex + 1} / 0{PORTFOLIO_PRODUCTS.length}</span>
            <span className="portfolio-cat">{PORTFOLIO_PRODUCTS[activeIndex].categoryName}</span>
          </div>
        </div>

        {/* Right Side: Interactive List */}
        <div className="portfolio-list" role="list">
          {PORTFOLIO_PRODUCTS.map((product, idx) => (
            <Link
              href={`/urun/${product.slug}`}
              key={product.id}
              className={`portfolio-item ${activeIndex === idx ? 'active' : ''}`}
              onMouseEnter={() => setActiveIndex(idx)}
              onFocus={() => setActiveIndex(idx)}
              role="listitem"
            >
              <div className="portfolio-item-num">0{idx + 1}</div>
              <div className="portfolio-item-content">
                <h3>{product.name}</h3>
                <p>{product.material}</p>
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
