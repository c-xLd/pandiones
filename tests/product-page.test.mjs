import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

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
