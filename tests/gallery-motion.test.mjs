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

test('mobile gallery stays still while desktop advances unless paused', async () => {
  const source = await readFile(new URL('../dist/gallery-motion.js', import.meta.url), 'utf8');
  const context = vm.createContext({});
  vm.runInContext(source, context);
  assert.equal(typeof context.galleryAutoplays, 'function');
  assert.equal(context.galleryAutoplays(true, false), false);
  assert.equal(context.galleryAutoplays(true, true), false);
  assert.equal(context.galleryAutoplays(false, false), true);
  assert.equal(context.galleryAutoplays(false, true), false);
  assert.equal(context.galleryAutoplays(false, false, true), false, 'hover suspends flow');
  assert.equal(context.galleryAutoplays(false, false, false, true), false, 'keyboard inspection suspends flow');
  assert.equal(context.galleryAutoplays(false, false, false, false), true, 'leaving resumes unpaused flow');
  assert.equal(context.galleryAutoplays(false, true, false, false), false, 'manual pause survives pointer leaving');
});

test('continuous gallery cycle includes every inter-card gutter', async () => {
  const source = await readFile(new URL('../dist/gallery-motion.js', import.meta.url), 'utf8');
  const context = vm.createContext({});
  vm.runInContext(source, context);

  assert.equal(typeof context.galleryCycleWidth, 'function');
  assert.equal(context.galleryCycleWidth([240, 240], 16), 512);
  assert.equal(context.galleryCycleWidth([300, 260], 12), 584);
  assert.equal(context.galleryCycleWidth([], 16), 0);
});
