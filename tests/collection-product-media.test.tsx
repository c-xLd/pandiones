import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Product } from '../src/types';
import CollectionProductCard, { shouldAutoplayCardVideo } from '../src/components/collection/CollectionProductCard';

const product: Product = {
  id: 'p1', slug: 'siyah-crop', name: 'Siyah Crop', price: 590, color: 'Siyah',
  category: 'ic-giyim', image: '/media/flat.webp', description: '', variants: [{ size: 'S', stock: 2 }],
  media: [
    { id: 'm1', kind: 'IMAGE', role: 'FLATLAY', url: '/media/flat.webp', alt: 'Düz çekim', position: 0, isCover: true },
    { id: 'm2', kind: 'IMAGE', role: 'MODEL', url: '/media/model.webp', alt: 'Manken', position: 1, isCover: false },
    { id: 'm3', kind: 'VIDEO', role: 'MODEL', url: '/media/clip.mp4', posterUrl: '/media/poster.webp', alt: 'Ürün videosu', position: 2, isCover: false },
  ],
};

test('one real media product remains one card with one price and video poster', () => {
  const html = renderToStaticMarkup(<CollectionProductCard product={product} layout="4" isFavorite={false} addingId={null} onWishlist={() => {}} onQuickAdd={() => {}} />);
  assert.equal((html.match(/<article/g) || []).length, 1);
  assert.equal((html.match(/₺/g) || []).length, 1);
  assert.match(html, /poster="\/media\/poster.webp"/);
  assert.match(html, /preload="none"/);
  // next/image serves through /_next/image?url=..., so the path may be URL-encoded.
  assert.match(html, /(\/|%2F)media(\/|%2F)model\.webp/);
});

test('only real linked sibling gets a color link', () => {
  const html = renderToStaticMarkup(<CollectionProductCard product={{ ...product, siblingColors: [] }} layout="4" isFavorite={false} addingId={null} onWishlist={() => {}} onQuickAdd={() => {}} />);
  assert.doesNotMatch(html, /collection-color-link/);
  const linked = renderToStaticMarkup(<CollectionProductCard product={{ ...product, siblingColors: [{ id: 'p2', slug: 'beyaz-crop', category: 'ic-giyim', color: 'Beyaz', image: '/beyaz.webp' }] }} layout="4" isFavorite={false} addingId={null} onWishlist={() => {}} onQuickAdd={() => {}} />);
  assert.match(linked, /href="\/urun\/beyaz-crop"/);
});

test('legacy card uses only its own image and reduced motion blocks hover autoplay', () => {
  const html = renderToStaticMarkup(<CollectionProductCard product={{ ...product, media: [], image: '/legacy.webp' }} layout="2" isFavorite={false} addingId={null} onWishlist={() => {}} onQuickAdd={() => {}} />);
  assert.match(html, /(\/|%2F)legacy\.webp/);
  assert.doesNotMatch(html, /(\/|%2F)media(\/|%2F)(model|poster)\.webp/);
  assert.equal(shouldAutoplayCardVideo(false, 'hover'), true);
  assert.equal(shouldAutoplayCardVideo(true, 'hover'), false);
  assert.equal(shouldAutoplayCardVideo(false, 'tap'), false);
});

test('a second real view brings has-views gallery; arrows and dots are removed per clean editorial design', () => {
  const html = renderToStaticMarkup(<CollectionProductCard product={product} layout="4" isFavorite={false} addingId={null} onWishlist={() => {}} onQuickAdd={() => {}} />);
  assert.match(html, /collection-piece-gallery has-views/);
  assert.doesNotMatch(html, /piece-nav-btn|piece-dot/);

  const single = renderToStaticMarkup(<CollectionProductCard product={{ ...product, media: [], image: '/legacy.webp' }} layout="4" isFavorite={false} addingId={null} onWishlist={() => {}} onQuickAdd={() => {}} />);
  assert.doesNotMatch(single, /has-views|piece-nav-btn|piece-dot/);
});
