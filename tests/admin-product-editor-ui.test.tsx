import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ProductEditorForm, editorReducer } from '../src/app/yonetim/_components/products/ProductEditor';

test('new editor: two sections, save bar with "Taslak oluştur", no separate media or colour-family section', () => {
  const html = renderToStaticMarkup(<ProductEditorForm onSaved={() => {}} />);
  assert.match(html, /Ürün bilgileri/);
  assert.match(html, /Renkler, bedenler ve medya/);
  assert.match(html, /class="adm-savebar adm-editor__savebar" data-visible="true"/);
  assert.match(html, /Taslak oluştur/);
  assert.match(html, /Taslak henüz oluşturulmadı/);
  assert.match(html, /Yayınla/);
  assert.match(html, /Taslak oluşturulunca yayın eksikleri/);
  assert.doesNotMatch(html, /Ürün medyası|Renk ailesi|Medyayı yükle|Aile oluştur ve bağla/);
  assert.doesNotMatch(html, /\/assets\/lace\.webp/);
});

test('failed save returns to editing with an accessible retry message', () => {
  const state = editorReducer({ phase: 'saving', error: null }, { type: 'SAVE_FAILED', message: 'Kaydetme başarısız' });
  assert.deepEqual(state, { phase: 'editing', error: 'Kaydetme başarısız' });
});
