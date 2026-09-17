import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

test('product page exposes the full gallery and purchase controls', async () => {
  const html = await readFile(new URL('../dist/product.html', import.meta.url), 'utf8');

  assert.match(html, /class="pdp-hero"/);
  assert.match(html, /id="pdp-gallery"/);
  assert.match(html, /id="pdp-title"/);
  assert.match(html, /id="add-form"/);
  assert.match(html, /name="size"/);
  assert.match(html, /data-pdp-prev/);
  assert.match(html, /data-pdp-next/);
  assert.match(html, /<details/);
});

test('collection product actions route to the dedicated detail page', async () => {
  const script = await readFile(new URL('../dist/app.js', import.meta.url), 'utf8');

  assert.match(script, /product\.html\?id=/);
  assert.match(script, /initProductPage/);
});

test('product hero uses a distinct campaign image on its right side', async () => {
  const script = await readFile(new URL('../dist/app.js', import.meta.url), 'utf8');

  assert.match(script, /const campaignImages=/);
  assert.match(script, /pdp-image-secondary.+campaignImages\[selected\]/s);
});

test('product ribbon docks to the viewport bottom after the page starts scrolling', async () => {
  const source = await readFile(new URL('../dist/product-bar.js', import.meta.url), 'utf8').catch(() => '');
  const context = vm.createContext({});
  vm.runInContext(source, context);

  assert.equal(typeof context.productBarState, 'function');
  assert.equal(context.productBarState(0), 'expanded');
  assert.equal(context.productBarState(24), 'expanded');
  assert.equal(context.productBarState(25), 'compact');
  assert.equal(context.productBarState(900), 'compact');
});

test('product ribbon stays bottom-docked while only its density changes', async () => {
  const source = await readFile(new URL('../dist/product-bar.js', import.meta.url), 'utf8');
  const context = vm.createContext({});
  vm.runInContext(source, context);

  assert.deepEqual(
    JSON.parse(JSON.stringify(context.productBarPresentation(0))),
    { docked: 'bottom', state: 'expanded' }
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(context.productBarPresentation(400))),
    { docked: 'bottom', state: 'compact' }
  );
});

test('product gallery meets the bottom ribbon without a spacer band', async () => {
  const css = await readFile(new URL('../dist/style.css', import.meta.url), 'utf8');

  assert.match(
    css,
    /\.product-page \.pdp-hero>\.pdp-gallery\{height:100%;padding-bottom:0\}/
  );
});
