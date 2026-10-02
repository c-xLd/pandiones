import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import CollectionClient from '../src/components/collection/CollectionClient';
import { AuthProvider } from '../src/context/AuthContext';
import { WishlistProvider } from '../src/context/WishlistContext';
import { CartProvider } from '../src/context/CartContext';
import type { Product } from '../src/types';
import type { CollectionCategory } from '../src/lib/products/load-collection';

const product = (overrides: Partial<Product>): Product =>
  ({
    id: overrides.slug,
    name: 'Parça',
    price: 1500,
    color: 'Siyah',
    image: '/assets/lace.webp',
    category: 'ic-giyim',
    subcategory: null,
    description: '',
    variants: [{ id: `${overrides.slug}-m`, size: 'M', stock: 3 }],
    media: [],
    siblingColors: [],
    ...overrides,
  }) as Product;

const products = [
  product({ slug: 'dantel-takim', name: 'Dantel Takım', color: 'Siyah', subcategory: 'dantel-takimlar' }),
  product({ slug: 'fildisi-takim', name: 'Fildişi Takım', color: 'Fildişi', subcategory: 'dantel-takimlar' }),
  product({ slug: 'saten-pijama', name: 'Saten Pijama', color: 'Şampanya', category: 'ev-giyim' }),
];

const categories: CollectionCategory[] = [
  {
    id: 'c1',
    slug: 'ic-giyim',
    name: 'İç Giyim',
    image: null,
    children: [{ id: 'c1a', slug: 'dantel-takimlar', name: 'Dantel Takımlar', image: null }],
  },
  { id: 'c2', slug: 'ev-giyim', name: 'Ev Giyim', image: null, children: [] },
];

function renderCollection(category: string, error: string | null = null) {
  return renderToStaticMarkup(
    <AuthProvider>
      <WishlistProvider>
        <CartProvider>
          <CollectionClient
            currentCategory={category}
            initialProducts={products}
            categories={categories}
            initialError={error}
            rail={<nav data-test="rail" />}
          />
        </CartProvider>
      </WishlistProvider>
    </AuthProvider>,
  );
}

test('products are in the first server render, no loading placeholder', () => {
  const html = renderCollection('yeni-gelenler');
  assert.match(html, /Dantel Takım/);
  assert.match(html, /Saten Pijama/);
  assert.doesNotMatch(html, /Koleksiyon yükleniyor/);
});

test('the all-pieces page shows the server-rendered rail slot; category pages show subcategory buttons instead', () => {
  const allHtml = renderCollection('yeni-gelenler');
  assert.match(allHtml, /data-test="rail"/);

  const categoryHtml = renderCollection('ic-giyim');
  assert.match(categoryHtml, /<main[^>]*collection-page-main--category/);
  assert.match(categoryHtml, /<h1[^>]*>İç Giyim<\/h1>/);
  assert.doesNotMatch(categoryHtml, /data-test="rail"/);
  assert.match(categoryHtml, />Tümü</);
  assert.match(categoryHtml, /Dantel Takımlar/);
  assert.doesNotMatch(categoryHtml, /Saten Pijama/);
});

/** The <a> tag whose text is `text` (attribute order independent). */
const anchor = (html: string, text: string) => html.match(new RegExp(`<a [^>]*>${text}</a>`))?.[0] ?? '';

test('subcategory tabs are links to /kategori/alt-kategori; a subcategory page marks itself and links back', () => {
  const categoryHtml = renderCollection('ic-giyim');
  assert.match(anchor(categoryHtml, 'Dantel Takımlar'), /href="\/ic-giyim\/dantel-takimlar"/);
  assert.match(anchor(categoryHtml, 'Tümü'), /href="\/ic-giyim"/);
  assert.match(anchor(categoryHtml, 'Tümü'), /aria-current="page"/);
  assert.doesNotMatch(categoryHtml, /koleksiyon\//);

  const childHtml = renderCollection('dantel-takimlar');
  assert.match(childHtml, /<h1[^>]*>Dantel Takımlar<\/h1>/);
  assert.match(anchor(childHtml, 'Dantel Takımlar'), /aria-current="page"/);
  assert.match(anchor(childHtml, 'Tümü'), /href="\/ic-giyim"/);
  assert.doesNotMatch(anchor(childHtml, 'Tümü'), /aria-current/);
  assert.match(childHtml, /Dantel Takım/);
  assert.doesNotMatch(childHtml, /Saten Pijama/);
});

test('the filter panel is built on first open, and no unverified claims are shown', () => {
  const html = renderCollection('ic-giyim');
  assert.match(html, /id="collection-filter-sidebar"/);
  assert.doesNotMatch(html, /filter-sidebar-content/);
  assert.doesNotMatch(html, /Saf İpek|Sınırlı Edisyon|collection-atelier-hallmark|Stil &amp; Model/);
  assert.match(html, /<select[^>]*id="collection-sort"/);
  assert.match(html, /aria-label="Ürün ızgara görünümü"/);
});

test('a server load error is shown with a retry, not as an empty collection', () => {
  const html = renderCollection('yeni-gelenler', 'Koleksiyon yüklenemedi.');
  assert.match(html, /role="alert"/);
  assert.match(html, /Tekrar dene/);
});
