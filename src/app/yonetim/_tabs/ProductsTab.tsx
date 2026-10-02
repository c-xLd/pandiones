'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import ProductEditor from '@/components/admin/ProductEditor';
import { money } from '../_lib/format';
import { downloadCsv } from '../_lib/csv';
import { errorText, loadJson, sendJson } from '../_lib/request';
import { TabLoadError, TabLoading } from '../_components/TabState';
import { useTabNotice } from '../_components/TabNotice';
import AdminIcon from '../_components/AdminIcon';

type Variant = { id: string; size: string; stock: number };
type Product = {
  id: string;
  slug: string;
  name: string;
  price: number;
  color: string;
  category: string;
  image: string;
  status: 'DRAFT' | 'PUBLISHED';
  featured: boolean;
  createdAt: string;
  variants: Variant[];
};

const LOW_STOCK = 10;
const CATEGORY_LABEL: Record<string, string> = { 'ic-giyim': 'İç giyim', 'ev-giyim': 'Ev giyim' };
const categoryLabel = (slug: string) => CATEGORY_LABEL[slug] ?? slug;
const totalStock = (product: Product) => product.variants.reduce((sum, variant) => sum + variant.stock, 0);
const includes = (value: string, needle: string) => value.toLocaleLowerCase('tr-TR').includes(needle);

/** Ürünler ve beden stokları. */
export default function ProductsTab({ initialSearch = '' }: { initialSearch?: string }) {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState(initialSearch);
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState<'' | 'PUBLISHED' | 'DRAFT' | 'LOW_STOCK'>('');
  const [editingId, setEditingId] = useState<string | null | undefined>(undefined);
  const [featuring, setFeaturing] = useState<string | null>(null);
  const { notice, success, error } = useTabNotice();

  useEffect(() => setSearch(initialSearch), [initialSearch]);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      setProducts(await loadJson<Product[]>('/api/admin/products', 'Ürünler yüklenemedi.', Array.isArray));
    } catch (err) {
      setLoadError(errorText(err, 'Ürünler yüklenemedi.'));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const replace = (next: Partial<Product> & { id: string }) =>
    setProducts((current) => current?.map((item) => (item.id === next.id ? { ...item, ...next } : item)) ?? null);

  const toggleFeatured = async (product: Product) => {
    if (featuring) return;
    setFeaturing(product.id);
    try {
      await sendJson('/api/admin/products', 'PATCH', { productId: product.id, featured: !product.featured }, 'Vitrin durumu güncellenemedi.');
      replace({ id: product.id, featured: !product.featured });
      success(`${product.name} ${product.featured ? 'vitrinden kaldırıldı' : 'vitrine alındı'}.`);
    } catch (err) {
      error(errorText(err, 'Vitrin durumu güncellenemedi.'));
    } finally {
      setFeaturing(null);
    }
  };

  if (loadError) return <TabLoadError message={loadError} onRetry={() => { setProducts(null); void load(); }} />;
  if (!products) return <TabLoading label="Ürünler yükleniyor" />;

  const categories = Array.from(new Set(products.map((p) => p.category))).sort();
  const needle = search.trim().toLocaleLowerCase('tr-TR');
  const visible = products.filter((p) => {
    if (category && p.category !== category) return false;
    if (status === 'PUBLISHED' && p.status !== 'PUBLISHED') return false;
    if (status === 'DRAFT' && p.status !== 'DRAFT') return false;
    if (status === 'LOW_STOCK' && totalStock(p) > LOW_STOCK) return false;
    return !needle || includes(p.name, needle) || includes(p.slug, needle) || includes(p.color, needle);
  });

  const exportCsv = () =>
    downloadCsv(
      `pandiones-urun-stok-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Ürün kodu', 'Ürün adı', 'Kategori', 'Renk', 'Fiyat (TL)', 'Toplam stok', 'Eklenme tarihi'],
      products.map((p) => [p.slug, p.name, p.category, p.color, p.price, totalStock(p), new Date(p.createdAt).toLocaleDateString('tr-TR')]),
    );

  return (
    <div className="adm-tab">
      <div className="adm-tab__head">
        <p className="adm-tab__summary">{products.length ? `${products.length} ürün` : 'Henüz ürün yok'}</p>
        <div className="adm-tab__actions">
          {products.length > 0 ? (
            <button type="button" className="adm-btn" onClick={exportCsv}>
              <AdminIcon name="download" />
              <span>CSV indir</span>
            </button>
          ) : null}
          <button type="button" className="adm-pill" onClick={() => setEditingId(null)}>
            <span>Yeni ürün</span>
            <span className="adm-pill__icon" aria-hidden="true">
              <AdminIcon name="plus" />
            </span>
          </button>
        </div>
      </div>

      {products.length > 0 ? (
        <div className="adm-toolbar">
          <label className="adm-search adm-toolbar__grow">
            <span className="visually-hidden">Ürün adı, kod veya renk ara</span>
            <AdminIcon name="search" />
            <input type="search" placeholder="Ad, kod veya renk" value={search} onChange={(e) => setSearch(e.target.value)} />
          </label>
          <label>
            <span className="visually-hidden">Kategori</span>
            <select className="adm-select" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">Tüm kategoriler</option>
              {categories.map((slug) => (
                <option key={slug} value={slug}>
                  {categoryLabel(slug)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="visually-hidden">Durum</span>
            <select className="adm-select" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
              <option value="">Tüm durumlar</option>
              <option value="PUBLISHED">Yayında</option>
              <option value="DRAFT">Taslak</option>
              <option value="LOW_STOCK">Düşük stok (≤{LOW_STOCK})</option>
            </select>
          </label>
        </div>
      ) : null}

      {notice}

      {products.length === 0 ? (
        <p className="adm-empty">Katalogda ürün yok. “Yeni ürün” ile ilk taslağı oluşturun.</p>
      ) : visible.length === 0 ? (
        <p className="adm-empty">Bu filtrelerle eşleşen ürün yok.</p>
      ) : (
        <ul className="adm-product-grid">
          {visible.map((product) => {
            const stock = totalStock(product);
            return (
              <li key={product.id} className="adm-card">
                <article className="adm-card__core adm-product" aria-labelledby={`product-${product.id}`}>
                  <div className="adm-product__head">
                    <span className="adm-product__thumb">
                      {product.image ? <img src={product.image} alt="" loading="lazy" /> : <span>Görsel yok</span>}
                    </span>
                    <div className="adm-product__info">
                      <h3 id={`product-${product.id}`} className="adm-product__name">
                        {product.name}
                      </h3>
                      <p className="adm-cell__sub">
                        {product.color} · {categoryLabel(product.category)}
                      </p>
                      <p className="adm-product__price">{money(product.price)}</p>
                      <div className="adm-product__tags">
                        <span className={`adm-status adm-status--${product.status === 'DRAFT' ? 'warning' : 'success'}`}>
                          {product.status === 'DRAFT' ? 'Taslak' : 'Yayında'}
                        </span>
                        <span className={stock <= 5 ? 'adm-text-danger adm-product__stock' : 'adm-cell__sub adm-product__stock'}>Toplam stok {stock}</span>
                      </div>
                    </div>
                  </div>

                  <div className="adm-product__feature">
                    <span id={`featured-${product.id}`}>Vitrinde göster</span>
                    <button
                      type="button"
                      role="switch"
                      className="adm-switch"
                      aria-checked={product.featured}
                      aria-labelledby={`featured-${product.id} product-${product.id}`}
                      disabled={featuring === product.id}
                      aria-busy={featuring === product.id}
                      onClick={() => toggleFeatured(product)}
                    />
                  </div>

                  <fieldset className="adm-product__sizes">
                    <legend>Beden stokları</legend>
                    {product.variants.length ? (
                      <div className="adm-product__size-grid">
                        {product.variants.map((variant) => (
                          <VariantStock
                            key={variant.id}
                            productName={product.name}
                            variant={variant}
                            onSaved={(variants) => replace({ id: product.id, variants })}
                          />
                        ))}
                      </div>
                    ) : (
                      <p className="adm-cell__sub">Beden tanımlı değil. Düzenle ile beden ekleyin.</p>
                    )}
                  </fieldset>

                  <div className="adm-product__actions">
                    <button type="button" className="adm-btn adm-btn--sm" onClick={() => setEditingId(product.id)}>
                      <AdminIcon name="edit" />
                      <span>
                        Düzenle<span className="visually-hidden"> {product.name}</span>
                      </span>
                    </button>
                    {product.status === 'PUBLISHED' ? (
                      <Link href={`/urun/${product.slug}`} target="_blank" rel="noopener" className="adm-btn adm-btn--sm adm-btn--quiet">
                        Ürün sayfası<span className="visually-hidden"> (yeni sekmede açılır)</span>
                        <AdminIcon name="arrow" />
                      </Link>
                    ) : null}
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      )}

      {editingId !== undefined ? (
        <ProductEditor productId={editingId ?? undefined} onSaved={() => void load()} onClose={() => setEditingId(undefined)} />
      ) : null}
    </div>
  );
}

/** One size's stock: saves on blur or Enter only when the value changed, with its own pending and error state. */
function VariantStock({ productName, variant, onSaved }: { productName: string; variant: Variant; onSaved(variants: Variant[]): void }) {
  const [value, setValue] = useState(String(variant.stock));
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const inputId = `stock-${variant.id}`;

  useEffect(() => setValue(String(variant.stock)), [variant.stock]);

  useEffect(() => {
    if (state !== 'saved') return;
    const timer = window.setTimeout(() => setState('idle'), 2000);
    return () => window.clearTimeout(timer);
  }, [state]);

  const save = async () => {
    if (state === 'saving') return;
    const trimmed = value.trim();
    const stock = Number(trimmed);
    if (trimmed === String(variant.stock)) {
      if (state === 'error') setState('idle');
      return;
    }
    if (trimmed === '' || !Number.isInteger(stock) || stock < 0) {
      setState('error');
      setMessage('0 veya daha büyük tam sayı girin.');
      return;
    }
    setState('saving');
    setMessage(null);
    try {
      const data = await sendJson<{ product: { variants: Variant[] } }>('/api/admin/products', 'PATCH', { variantId: variant.id, stock }, 'Stok kaydedilemedi.');
      onSaved(data.product.variants);
      setState('saved');
    } catch (err) {
      setState('error');
      setMessage(errorText(err, 'Stok kaydedilemedi.'));
    }
  };

  return (
    <div className="adm-size" data-state={state}>
      <label htmlFor={inputId}>
        {variant.size}
        <span className="visually-hidden"> bedeni stoğu, {productName}</span>
      </label>
      <input
        id={inputId}
        type="number"
        inputMode="numeric"
        min={0}
        step={1}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          if (state === 'error') setState('idle');
        }}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            void save();
          }
          if (e.key === 'Escape') {
            setValue(String(variant.stock));
            setState('idle');
          }
        }}
        aria-invalid={state === 'error' || undefined}
        aria-describedby={state === 'error' ? `${inputId}-error` : undefined}
        aria-busy={state === 'saving'}
        readOnly={state === 'saving'}
      />
      <span className="adm-size__state" aria-live="polite">
        {state === 'saving' ? 'Kaydediliyor' : state === 'saved' ? 'Kaydedildi' : ''}
      </span>
      {state === 'error' && message ? (
        <span id={`${inputId}-error`} className="adm-field-error" role="alert">
          {message}
        </span>
      ) : null}
    </div>
  );
}
