import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { VariantMatrixSection } from '../src/app/yonetim/_components/products/VariantMatrixSection';
import CategoryTreeSelect from '../src/app/yonetim/_components/products/CategoryTreeSelect';
import type { ColorGroup } from '../src/app/yonetim/_lib/variant-model';

const noop = () => {};
const base = { productName: 'Saten Takım', onChange: noop, errors: { cells: {} }, onOpenMedia: noop, onUnlinkColor: noop };

test('variant section: empty state names what is missing; no fake fields', () => {
  const html = renderToStaticMarkup(<VariantMatrixSection {...base} category="ic-giyim" subcategory="dantel-takimlar" groups={[]} />);
  assert.match(html, /Henüz hiçbir varyant yok/);
  assert.match(html, /Renk, Beden/);
  assert.match(html, /Harf beden/);
  assert.doesNotMatch(html, /ÖTV|Desi|Trendyol/);
});

test('variant section: colours as chips with ×, media strip per colour, direct add on new colours, bra sizes for bras', () => {
  const groups: ColorGroup[] = [
    {
      key: 'p1', productId: 'p1', isCurrent: true, color: 'Siyah', status: 'DRAFT', price: '1000', compareAtPrice: '', vatRate: '10',
      media: [
        { id: 'm1', kind: 'IMAGE', role: 'FLATLAY', url: '/m1.jpg', posterUrl: null, alt: 'Düz', isCover: true },
        { id: 'm2', kind: 'IMAGE', role: 'DETAIL', url: '/m2.jpg', posterUrl: null, alt: 'Detay', isCover: false },
      ],
      sizes: [{ size: '75B', stock: '2', sku: '', barcode: '' }],
    },
    { key: 'new:Pudra', productId: null, isCurrent: false, color: 'Pudra', media: [], price: '1000', compareAtPrice: '', vatRate: '10', sizes: [{ size: '75B', stock: '0', sku: '', barcode: '' }] },
  ];
  const html = renderToStaticMarkup(<VariantMatrixSection {...base} category="sutyen" subcategory="push-up-destekli" groups={groups} currentProductId="p1" onLinkProduct={noop} onRegenerateSkus={noop} />);
  assert.match(html, /Sütyen \(bant \+ kap\)/);
  assert.match(html, /aria-label="Pudra rengini kaldır"/);
  assert.doesNotMatch(html, /Siyah rengini/, 'düzenlenen ürünün rengi çıkarılamaz');
  assert.match(html, /Siyah, 1\. görsel: Düz, kapak\. Düzenle/, 'şerit her görselin çekim türünü söyler');
  assert.match(html, /Siyah, 2\. görsel: Detay\. Düzenle/);
  assert.match(html, /2 görsel/);
  assert.match(html, /Görsel<span class="visually-hidden"> ekle: Pudra/, 'kaydedilmemiş renkte de doğrudan görsel eklenir');
  assert.doesNotMatch(html, /kaydedildiğinde görsel/);
  assert.match(html, /Kaydedince oluşturulur/);
  assert.match(html, /placeholder="PAN-SATENTAK-SIYA-75B"/, 'boş stok kodu önerilen kodu gösterir');
  assert.match(html, /Kodları yeniden oluştur/);
  assert.match(html, /Mevcut bir ürünü renk olarak bağla/);
  assert.doesNotMatch(html, /Boş stok kodlarını doldur|Görsel seçimi/);
});

test('media strip: a colour without a cover says so; video tile waits for a photo', () => {
  const groups: ColorGroup[] = [
    { key: 'p1', productId: 'p1', isCurrent: true, color: 'Ekru', status: 'DRAFT', price: '900', compareAtPrice: '', vatRate: '10', media: [], sizes: [{ size: 'S', stock: '1', sku: '', barcode: '' }] },
  ];
  const html = renderToStaticMarkup(<VariantMatrixSection {...base} category="ic-giyim" subcategory="" groups={groups} />);
  assert.match(html, /Görsel yok\. Yayın için kapak gerekir\./);
  assert.match(html, /title="Önce bir görsel ekleyin; video posteri görsellerden seçilir"/);
});

test('category field shows the chosen sub-category, never a bare parent with children', () => {
  const categories = [{ id: 'c1', slug: 'sutyen', name: 'Sütyen', children: [{ id: 'c2', slug: 'push-up-destekli', name: 'Push-Up & Destekli' }] }];
  const chosen = renderToStaticMarkup(<CategoryTreeSelect categories={categories} category="sutyen" subcategory="push-up-destekli" onChange={noop} />);
  assert.match(chosen, /value="Sütyen › Push-Up &amp; Destekli"/);
  const parentOnly = renderToStaticMarkup(<CategoryTreeSelect categories={categories} category="sutyen" subcategory="" onChange={noop} />);
  assert.match(parentOnly, /value=""/);
  assert.match(parentOnly, /role="combobox"/);
});
