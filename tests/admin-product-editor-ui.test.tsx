import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ProductEditor, { editorReducer } from '../src/components/admin/ProductEditor';

test('new editor shows draft, media role and publish steps without an invented image', () => {
  const html = renderToStaticMarkup(<ProductEditor onSaved={() => {}} onClose={() => {}} />);
  assert.match(html, /Taslak oluştur/);
  assert.match(html, /Düz çekim/);
  assert.match(html, /Manken/);
  assert.match(html, /Detay/);
  assert.match(html, /Kapak/);
  assert.match(html, /Yayınla/);
  assert.match(html, /Önce taslağı oluşturun/);
  assert.doesNotMatch(html, /\/assets\/lace\.webp/);
});

test('failed save returns to editing with an accessible retry message', () => {
  const state = editorReducer({ phase: 'saving', error: null }, { type: 'SAVE_FAILED', message: 'Kaydetme başarısız' });
  assert.deepEqual(state, { phase: 'editing', error: 'Kaydetme başarısız' });
});
