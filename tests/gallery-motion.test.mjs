import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

test('continuous gallery wraps forward and backward without stopping, and preserves pause', async () => {
  const source = await readFile(new URL('../dist/gallery-motion.js', import.meta.url), 'utf8').catch(() => '');
  const context = vm.createContext({});
  vm.runInContext(source, context);
  assert.equal(typeof context.galleryOffset, 'function', 'gallery motion engine is available');
  assert.equal(context.galleryOffset(990, 20, 1000), 10);
  assert.equal(context.galleryOffset(10, -20, 1000), 990);
  assert.equal(context.galleryOffset(310, 0, 1000), 310);
  assert.equal(context.galleryOffset(999, 3002, 1000), 1);
  assert.equal(context.galleryOffset(0, 20, 0), 0);
});
