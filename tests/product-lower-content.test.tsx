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
          <ProductLowerContent product={currentProduct} relatedProducts={relatedProducts} onOpenTerms={() => {}} />
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
  assert.match(html, /href="\/koleksiyon\/ic-giyim\/beyaz-crop"/);
  assert.match(html, /Beyaz Crop/);
  assert.doesNotMatch(html, /href="\/koleksiyon\/ic-giyim\/siyah-crop"/);
});

test('exposes related product choices as a semantic list', () => {
  const first = { ...product, id: 'p2', slug: 'beyaz-crop', name: 'Beyaz Crop' };
  const second = { ...product, id: 'p3', slug: 'dantel-takim', name: 'Dantel Takım' };
  const html = renderLowerContent(product, [first, second]);

  assert.match(html, /<ul[^>]*class="pdp-lower-related-grid"/);
  assert.equal((html.match(/<li\b/g) || []).length, 2);
});

test('editorial image stays matched to the product and uses a distinct crop view when available', () => {
  const cropHtml = renderLowerContent(product);
  assert.match(cropHtml, /class="pdp-lower-story-image"[^>]*src="\/assets\/siyah-crop\/2\.png"/);

  const otherProduct = { ...product, slug: 'dantel-takim', image: '/assets/lace.webp', images: undefined };
  const otherHtml = renderLowerContent(otherProduct);
  assert.match(otherHtml, /class="pdp-lower-story-image"[^>]*src="\/assets\/lace\.webp"/);
});
