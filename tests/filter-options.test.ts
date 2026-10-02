import assert from 'node:assert/strict';
import test from 'node:test';
import { filterOptions } from '../src/lib/products/filter-options';

test('filter offers only the colours and sizes the listed products have', () => {
  const { colors, sizes } = filterOptions([
    { color: 'Siyah', variants: [{ size: 'L' }, { size: 'S' }] },
    { color: ' Fildişi ', variants: [{ size: 'M' }, { size: 'S' }] },
    { color: 'Siyah', variants: [] },
    { color: null, variants: null },
  ]);
  assert.deepEqual(colors, ['Fildişi', 'Siyah']);
  assert.deepEqual(sizes, ['S', 'M', 'L']);
});
