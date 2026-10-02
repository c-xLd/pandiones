import assert from 'node:assert/strict';
import test from 'node:test';
import { countInCategory, productInCategory } from '../src/lib/products/category-match';

const topVeBody = { slug: 'top-ve-body', children: [{ slug: 'askili-top-atlet' }, { slug: 'dantelli-body' }] };

test('a product belongs to a category through its own category, subcategory or a child', () => {
  assert.equal(productInCategory({ category: 'ev-giyim', subcategory: null }, 'ev-giyim'), true);
  assert.equal(productInCategory({ category: 'ic-giyim', subcategory: 'askili-top-atlet' }, 'top-ve-body', ['askili-top-atlet']), true);
  assert.equal(productInCategory({ category: 'ic-giyim', subcategory: 'askili-top-atlet' }, 'askili-top-atlet'), true);
  assert.equal(productInCategory({ category: 'ic-giyim', subcategory: 'dantel-takimlar' }, 'top-ve-body', ['askili-top-atlet']), false);
});

test('counts products under a root category including its children', () => {
  const products = [
    { category: 'ic-giyim', subcategory: 'askili-top-atlet' },
    { category: 'ic-giyim', subcategory: 'askili-top-atlet' },
    { category: 'ic-giyim', subcategory: 'dantel-takimlar' },
    { category: 'ev-giyim', subcategory: null },
  ];
  assert.equal(countInCategory(products, topVeBody), 2);
  assert.equal(countInCategory(products, { slug: 'ic-giyim' }), 3);
  assert.equal(countInCategory(products, { slug: 'aksesuarlar', children: [] }), 0);
});
