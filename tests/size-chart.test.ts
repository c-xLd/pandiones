import assert from 'node:assert/strict';
import test from 'node:test';
import { recommendSize, sizeForMeasure, SIZE_CHART } from '../src/lib/products/size-chart';

test('the chart lists the sold sizes with Turkish numbering', () => {
  assert.deepEqual(SIZE_CHART.map((row) => `${row.size}/${row.tr}`), ['S/36', 'M/38', 'L/40', 'XL/42']);
});

test('a measurement inside a range maps to that size; a shared boundary goes up', () => {
  assert.equal(sizeForMeasure('bust', 84).row.size, 'S');
  assert.equal(sizeForMeasure('bust', 86).row.size, 'M');
  assert.equal(sizeForMeasure('hip', 105).row.size, 'XL');
});

test('measurements outside the chart are flagged, not guessed', () => {
  assert.deepEqual(
    [sizeForMeasure('waist', 55).kind, sizeForMeasure('waist', 55).row.size],
    ['below', 'S'],
  );
  assert.deepEqual([sizeForMeasure('hip', 120).kind, sizeForMeasure('hip', 120).row.size], ['above', 'XL']);
});

test('the recommendation is the largest size any measurement needs', () => {
  const result = recommendSize({ bust: 84, waist: 68, hip: 90 });
  assert.equal(result.row?.size, 'M');
  assert.equal(result.mixed, true);
  assert.equal(result.outOfRange, false);
});

test('no measurement means no recommendation', () => {
  const result = recommendSize({ bust: null, waist: undefined, hip: 0 });
  assert.equal(result.row, null);
});

test('bra size: band from underbust, cup from the difference', async () => {
  const { braSize } = await import('../src/lib/products/size-chart');
  assert.deepEqual(braSize(75, 89), { kind: 'size', band: 75, cup: 'B', difference: 14 });
  assert.deepEqual(braSize(80, 97), { kind: 'size', band: 80, cup: 'D', difference: 17 });
  assert.equal((braSize(72.5, 86) as { band: number }).band, 70);
  const { braTypicalBust, BRA_BANDS, BRA_CUPS } = await import('../src/lib/products/size-chart');
  assert.equal(braTypicalBust(BRA_BANDS[1], BRA_CUPS[1]), 89);
  assert.deepEqual(braSize(60, 75), { kind: 'out-of-range', reason: 'band', difference: 15 });
  assert.deepEqual(braSize(75, 80), { kind: 'out-of-range', reason: 'cup', difference: 5 });
});
