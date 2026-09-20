import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertFamilyCandidate,
  getPublishErrors,
  normalizeColor,
  selectCardMedia,
} from '../src/lib/products/media-domain';

test('normalization rejects duplicate colors within one family', () => {
  assert.equal(normalizeColor(' Siyah '), 'siyah');
  assert.throws(
    () => assertFamilyCandidate(
      { id: 'new', category: 'ic-giyim', color: ' siyah ' },
      [{ id: 'existing', category: 'ic-giyim', color: 'Siyah' }],
    ),
    { code: 'COLOR_CONFLICT' },
  );
});

test('a family cannot mix categories', () => {
  assert.throws(
    () => assertFamilyCandidate(
      { id: 'new', category: 'ev-giyim', color: 'Beyaz' },
      [{ id: 'existing', category: 'ic-giyim', color: 'Siyah' }],
    ),
    { code: 'CATEGORY_CONFLICT' },
  );
});

test('legacy product keeps its own image as card cover', () => {
  assert.deepEqual(
    selectCardMedia({ image: '/assets/lace.webp', media: [] }).cover,
    { kind: 'IMAGE', src: '/assets/lace.webp', alt: '' },
  );
});

test('card cover and secondary are selected by cover flag and position', () => {
  const selected = selectCardMedia({
    image: '/legacy.webp',
    media: [
      { kind: 'IMAGE', role: 'DETAIL', url: '/detail.webp', alt: 'Detay', position: 3, isCover: false },
      { kind: 'IMAGE', role: 'MODEL', url: '/model.webp', alt: 'Manken', position: 1, isCover: false },
      { kind: 'IMAGE', role: 'FLATLAY', url: '/flat.webp', alt: 'Düz çekim', position: 2, isCover: true },
    ],
  });
  assert.equal(selected.cover.src, '/flat.webp');
  assert.equal(selected.secondary?.src, '/model.webp');
});

test('publishing requires one real cover and a poster for a video cover', () => {
  const base = {
    price: 590,
    category: 'ic-giyim',
    color: 'Siyah',
    variants: [{ size: 'S', stock: 2 }],
  };
  assert.ok(getPublishErrors({ ...base, media: [] }).includes('cover'));
  assert.ok(getPublishErrors({ ...base, media: [
    { kind: 'VIDEO', url: '/clip.mp4', posterUrl: null, isCover: true },
  ] }).includes('poster'));
  assert.deepEqual(getPublishErrors({ ...base, media: [
    { kind: 'IMAGE', url: '/flat.webp', isCover: true },
  ] }), []);
});
