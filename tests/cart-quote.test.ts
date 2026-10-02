import assert from 'node:assert/strict';
import test from 'node:test';
import { cartLineKey, evaluateCartLine, isBlockingStatus } from '../src/lib/cart/quote';

const product = {
  id: 'p1',
  slug: 'saten-gecelik',
  name: 'Saten gecelik',
  price: 1850,
  variants: [
    { size: 'S', stock: 4 },
    { size: 'M', stock: 0 },
  ],
};

test('a line that matches the catalog is ok', () => {
  const quote = evaluateCartLine({ slug: 'saten-gecelik', size: 's', quantity: 2, price: 1850 }, product);
  assert.deepEqual(quote, { key: cartLineKey('saten-gecelik', 'S'), status: 'ok', price: 1850, stock: 4 });
});

test('a changed catalog price is reported with the current price', () => {
  const quote = evaluateCartLine({ slug: 'saten-gecelik', size: 'S', quantity: 1, price: 1500 }, product);
  assert.equal(quote.status, 'price-changed');
  assert.equal(quote.price, 1850);
  assert.equal(isBlockingStatus(quote.status), false);
});

test('quantity above stock blocks checkout and reports the available stock', () => {
  const quote = evaluateCartLine({ slug: 'saten-gecelik', size: 'S', quantity: 6, price: 1850 }, product);
  assert.equal(quote.status, 'insufficient-stock');
  assert.equal(quote.stock, 4);
  assert.equal(isBlockingStatus(quote.status), true);
});

test('a sold-out size blocks checkout', () => {
  const quote = evaluateCartLine({ slug: 'saten-gecelik', size: 'M', quantity: 1, price: 1850 }, product);
  assert.equal(quote.status, 'sold-out');
  assert.equal(isBlockingStatus(quote.status), true);
});

test('an unpublished product or a missing size is unavailable', () => {
  assert.equal(evaluateCartLine({ slug: 'yok', size: 'S', quantity: 1 }, null).status, 'unavailable');
  assert.equal(evaluateCartLine({ slug: 'saten-gecelik', size: 'XL', quantity: 1 }, product).status, 'unavailable');
});

test('sizes sort in wearing order with unknown labels last', async () => {
  const { sortBySize } = await import('../src/lib/products/sizes');
  const sorted = sortBySize([{ size: 'L' }, { size: 'Tek beden' }, { size: 'xs' }, { size: 'M' }, { size: 'XL' }]);
  assert.deepEqual(sorted.map((v) => v.size), ['xs', 'M', 'L', 'XL', 'Tek beden']);
});
