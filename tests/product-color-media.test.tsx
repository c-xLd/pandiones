import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Product, SiblingColor } from '../src/types';
import ProductColorLinks from '../src/components/product/ProductColorLinks';
import { toGalleryFrames } from '../src/lib/products/media-domain';

const black = { id: 'black', slug: 'siyah-crop', category: 'ic-giyim', color: 'Siyah', image: '/siyah.webp', name: 'Siyah Crop', price: 590, description: '' } as Product;

test('real sibling color links to its canonical product route', () => {
  const white = { id: 'white', slug: 'beyaz-crop', category: 'ic-giyim', color: 'Beyaz', image: '/beyaz.webp' } as SiblingColor;
  const html = renderToStaticMarkup(<ProductColorLinks current={black} siblings={[white]} />);
  assert.match(html, /href="\/urun\/beyaz-crop"/);
  assert.doesNotMatch(html, /stokta/i);
  assert.equal((html.match(/href=/g) || []).length, 1);
});

test('legacy no-media product keeps only its own image', () => {
  assert.deepEqual(toGalleryFrames({ image: '/assets/lace.webp', media: [] }).map((frame) => frame.src), ['/assets/lace.webp']);
});

test('real media gallery is ordered and video retains poster', () => {
  const frames = toGalleryFrames({ image: '/legacy.webp', media: [
    { id: 'v', kind: 'VIDEO', url: '/v.mp4', posterUrl: '/poster.webp', alt: 'Video', position: 2, isCover: false },
    { id: 'f', kind: 'IMAGE', url: '/flat.webp', alt: 'Düz çekim', position: 0, isCover: true },
  ] });
  assert.deepEqual(frames.map((frame) => frame.src), ['/flat.webp', '/v.mp4']);
  assert.equal(frames[1].posterSrc, '/poster.webp');
});
