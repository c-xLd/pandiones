import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import ProductLowerContent from '../src/components/product/ProductLowerContent';
import { AuthProvider } from '../src/context/AuthContext';
import { WishlistProvider } from '../src/context/WishlistContext';
import { CartProvider } from '../src/context/CartContext';
import type { Product } from '../src/types';

const product: Product = {
  id: 'p1', slug: 'siyah-crop', name: 'Siyah Crop', price: 1590,
  color: 'Siyah', category: 'ic-giyim', image: '/assets/siyah-crop/1.png',
  description: 'Siyahın zamansız duruşu, modern kuplar ve ince detaylarla buluştu.',
  details: 'Yumuşak elastik alt bant, nefes alan astar.',
  material: '%90 Pamuk, %10 Elastan', care: 'Hassas programda 30°C’de yıkayınız.',
};

function renderLowerContent(currentProduct: Product, relatedProducts: Product[] = []) {
  return renderToStaticMarkup(
    <AuthProvider>
      <WishlistProvider>
        <CartProvider>
          <ProductLowerContent product={currentProduct} relatedProducts={relatedProducts} />
        </CartProvider>
      </WishlistProvider>
    </AuthProvider>,
  );
}

test('shows supplied product information and usable disclosures without inventing details', () => {
  const html = renderLowerContent(product);
  assert.match(html, /Ürün hakkında/);
  assert.match(html, /Siyahın zamansız duruşu/);
  assert.match(html, /Yumuşak elastik alt bant/);
  assert.match(html, /%90 Pamuk, %10 Elastan/);
  assert.match(html, /30°C’de yıkayınız/);
  assert.match(html, /<summary>Kumaş ve bakım/);
  assert.match(html, /<summary>Teslimat/);
  assert.match(html, /<summary>Değişim ve iade/);
  assert.doesNotMatch(html, /Koleksiyondan/);
});

test('only renders real related products and links to their canonical routes', () => {
  const other = { ...product, id: 'p2', slug: 'beyaz-crop', name: 'Beyaz Crop', image: '/assets/beyaz-crop/1.png' };
  const html = renderLowerContent(product, [other]);
  assert.match(html, /Koleksiyondan/);
  assert.match(html, /href="\/urun\/beyaz-crop"/);
  assert.match(html, /Beyaz Crop/);
  assert.doesNotMatch(html, /href="\/urun\/siyah-crop"/);
});

test('exposes related product choices as a semantic list', () => {
  const first = { ...product, id: 'p2', slug: 'beyaz-crop', name: 'Beyaz Crop' };
  const second = { ...product, id: 'p3', slug: 'dantel-takim', name: 'Dantel Takım' };
  const html = renderLowerContent(product, [first, second]);

  assert.match(html, /<ul[^>]*class="pdp-lower-related__grid"/);
  assert.equal((html.match(/<li\b/g) || []).length, 2);
});

test('story image is a second real view of this product, otherwise its own cover — never matched by slug', () => {
  const withMedia = {
    ...product,
    media: [
      { id: 'm1', kind: 'IMAGE', role: 'FLATLAY', url: '/media/cover.webp', alt: 'Kapak', position: 0, isCover: true },
      { id: 'm2', kind: 'IMAGE', role: 'DETAIL', url: '/media/detail.webp', alt: 'Detay', position: 1, isCover: false },
    ],
  } as Product;
  const mediaHtml = renderLowerContent(withMedia);
  assert.match(mediaHtml, /pdp-lower-about__media[\s\S]*?(\/|%2F)media(\/|%2F)detail\.webp/);

  const coverOnly = renderLowerContent(product);
  assert.match(coverOnly, /pdp-lower-about__media[\s\S]*?(\/|%2F)assets(\/|%2F)siyah-crop(\/|%2F)1\.png/);
  assert.doesNotMatch(coverOnly, /siyah-crop(\/|%2F)2\.png/);
});

test('stock alert appears only for sold-out sizes and offers only those sizes', () => {
  const partly = { ...product, variants: [
    { id: 'v1', size: 'L', stock: 0 },
    { id: 'v2', size: 'S', stock: 4 },
    { id: 'v3', size: 'M', stock: 0 },
  ] } as Product;
  const html = renderLowerContent(partly);
  assert.match(html, /id="stok-bildirimi"/);
  const sizes = [...html.matchAll(/<input[^>]*name="stock-alert-size"[^>]*>/g)]
    .map((m) => m[0].match(/value="([^"]+)"/)?.[1]);
  assert.deepEqual(sizes, ['M', 'L']);
  assert.match(html, /<label[^>]*for="[^"]+"[^>]*>E-posta<\/label>/);

  const inStock = { ...product, variants: [{ id: 'v2', size: 'S', stock: 4 }] } as Product;
  assert.doesNotMatch(renderLowerContent(inStock), /stok-bildirimi/);
});
