import assert from 'node:assert/strict';
import test from 'node:test';
import { ALL_PRODUCTS_HREF, categoryHref, isReservedRootSlug, productHref, subcategoryHref } from '../src/lib/routes';

test('catalogue addresses: /kategori, /kategori/alt-kategori, /urun/slug, /yeni-gelenler', () => {
  assert.equal(categoryHref('sutyen'), '/sutyen');
  assert.equal(subcategoryHref('sutyen', 'bralet'), '/sutyen/bralet');
  assert.equal(productHref('beyaz-crop'), '/urun/beyaz-crop');
  assert.equal(ALL_PRODUCTS_HREF, '/yeni-gelenler');
});

test('a root category cannot take a slug owned by a real page', () => {
  for (const slug of ['sepet', 'hesabim', 'urun', 'yeni-gelenler', 'API', ' odeme ']) {
    assert.equal(isReservedRootSlug(slug), true, slug);
  }
  assert.equal(isReservedRootSlug('sutyen'), false);
});
