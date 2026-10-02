import React from 'react';
import Link from 'next/link';
import { countInCategory, type CategorizedProduct } from '@/lib/products/category-match';
import { ALL_PRODUCTS_HREF, categoryHref } from '@/lib/routes';

export type RailCategory = {
  id: string;
  slug: string;
  name: string;
  children: Array<{ slug: string }>;
};

type CategoryRailProps = {
  categories: RailCategory[];
  products: CategorizedProduct[];
  /** Counts are shown only once products are loaded; never a placeholder number. */
  productsReady: boolean;
};

/** One row of text tabs: "Tümü" and every active root category, each with its real piece count. */
export default function CategoryRail({ categories, products, productsReady }: CategoryRailProps) {
  const items = [
    { key: 'yeni-gelenler', href: ALL_PRODUCTS_HREF, label: 'Yeni Gelenler', count: products.length, current: true },
    ...categories.map((category) => ({
      key: category.slug,
      href: categoryHref(category.slug),
      label: category.name,
      count: countInCategory(products, category),
      current: false,
    })),
  ];

  return (
    <nav className="category-rail" aria-label="Kategoriler">
      <ul className="category-rail__list">
        {items.map((item, index) => {
          const empty = productsReady && item.count === 0;
          return (
            <li key={item.key} className="category-rail__item" style={{ '--i': index } as React.CSSProperties}>
              <Link
                href={item.href}
                className={`category-rail__link${item.current ? ' is-current' : ''}${empty ? ' is-empty' : ''}`}
                aria-current={item.current ? 'page' : undefined}
              >
                {item.label}
                {productsReady && empty ? (
                  <span className="sr-only">, henüz ürün yok</span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
