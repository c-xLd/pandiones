import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import CollectionClient from '../src/app/koleksiyon/CollectionClient';
import { AuthProvider } from '../src/context/AuthContext';
import { WishlistProvider } from '../src/context/WishlistContext';
import { CartProvider } from '../src/context/CartContext';

function renderCollection(category: 'tumu' | 'ic-giyim' | 'ev-giyim') {
  return renderToStaticMarkup(
    <AuthProvider>
      <WishlistProvider>
        <CartProvider>
          <CollectionClient currentCategory={category} />
        </CartProvider>
      </WishlistProvider>
    </AuthProvider>,
  );
}

test('category pages show an image-led category index without redundant edition claims', () => {
  const html = renderCollection('ic-giyim');

  assert.match(html, /<main[^>]*collection-page-main--category/);
  assert.match(html, /<h1[^>]*>İç Giyim<\/h1>/);
  assert.match(html, /<nav[^>]*class="collection-category-index"[^>]*aria-label="Koleksiyonları keşfet"/);
  assert.match(html, /class="collection-category-index-link"[^>]*href="\/koleksiyon"/);
  assert.match(html, /class="collection-category-index-link is-current"[^>]*aria-current="page"[^>]*href="\/koleksiyon\/ic-giyim"/);
  assert.match(html, /<img[^>]*src="\/assets\/campaign-portrait\.jpeg"[^>]*alt=""/);
  assert.doesNotMatch(html, /Edisyon 2026|Sınırlı Atölye Üretimi|FIG\. 02/);
});

test('category controls remain usable while the extra atelier footer stays only on the all-products page', () => {
  const categoryHtml = renderCollection('ev-giyim');
  const allHtml = renderCollection('tumu');

  assert.match(categoryHtml, /href="\/koleksiyon\/ic-giyim"/);
  assert.doesNotMatch(categoryHtml, /class="filters"/);
  assert.match(categoryHtml, /<select[^>]*id="collection-sort"/);
  assert.match(categoryHtml, /aria-label="Ürün ızgara görünümü"/);
  assert.doesNotMatch(categoryHtml, /collection-atelier-hallmark/);
  assert.match(allHtml, /collection-atelier-hallmark/);
});
