'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { money } from '../_lib/format';
import { downloadCsv } from '../_lib/csv';
import { errorText, loadJson, sendJson } from '../_lib/request';
import { TabLoadError, TabLoading } from '../_components/TabState';
import { useTabNotice } from '../_components/TabNotice';
import { useConfirm } from '../_components/ConfirmDialog';
import AdminIcon from '../_components/AdminIcon';
import InlineNumber from '../_components/products/InlineNumber';
import CategoryDialog from '../_components/products/CategoryDialog';

// Opened on demand; kept out of the tab's first load.
const ProductEditor = dynamic(() => import('../_components/products/ProductEditor'), { ssr: false });

type Variant = { id: string; size: string; stock: number; pendingAlerts: number };
type Product = {
  id: string;
  slug: string;
  name: string;
  price: number;
  color: string;
  category: string;
  subcategory: string | null;
  image: string;
  status: 'DRAFT' | 'PUBLISHED';
  featured: boolean;
  createdAt: string;
  mediaCount: number;
  sales30: { quantity: number; revenue: number };
  variants: Variant[];
};
type Data = { products: Product[]; lowStockThreshold: number };
type SortKey = 'new' | 'name' | 'price' | 'stock' | 'sales' | 'alerts';
type BulkAction = 'publish' | 'draft' | 'feature' | 'unfeature';
type BulkResult = { updated: string[]; failed: { id: string; name: string; reasons: string[] }[] };

const CATEGORY_LABEL: Record<string, string> = { 'ic-giyim': 'İç giyim', 'ev-giyim': 'Ev giyim' };
const categoryLabel = (slug: string) => CATEGORY_LABEL[slug] ?? slug;
const totalStock = (p: Product) => p.variants.reduce((sum, v) => sum + v.stock, 0);
const pendingAlerts = (p: Product) => p.variants.reduce((sum, v) => sum + v.pendingAlerts, 0);
const includes = (value: string, needle: string) => value.toLocaleLowerCase('tr-TR').includes(needle);

const SORTS: { key: SortKey; label: string; value(p: Product): number | string; desc: boolean }[] = [
  { key: 'new', label: 'Eklenme', value: (p) => p.createdAt, desc: true },
  { key: 'name', label: 'Ad', value: (p) => p.name.toLocaleLowerCase('tr-TR'), desc: false },
  { key: 'price', label: 'Fiyat', value: (p) => p.price, desc: true },
  { key: 'stock', label: 'Stok', value: totalStock, desc: false },
  { key: 'sales', label: '30 gün satış', value: (p) => p.sales30.quantity, desc: true },
  { key: 'alerts', label: 'Bekleyen talep', value: pendingAlerts, desc: true },
];

const BULK_TEXT: Record<BulkAction, { label: string; done: string }> = {
  publish: { label: 'Yayınla', done: 'yayınlandı' },
  draft: { label: 'Taslağa al', done: 'taslağa alındı' },
  feature: { label: 'Vitrine al', done: 'vitrine alındı' },
  unfeature: { label: 'Vitrinden çıkar', done: 'vitrinden çıkarıldı' },
};

/** Ürünler: dense table with in-place price/stock, sales and waiting requests, bulk actions and copies. */
export default function ProductsTab({ initialSearch = '' }: { initialSearch?: string }) {
  const [data, setData] = useState<Data | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState(initialSearch);
  const [category, setCategory] = useState('');
  const [view, setView] = useState<'' | 'PUBLISHED' | 'DRAFT' | 'LOW' | 'WAITING'>('');
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({ key: 'new', desc: true });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null | undefined>(undefined);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [featuring, setFeaturing] = useState<string | null>(null);
  const { notice, success, error } = useTabNotice();
  const { ask, dialog } = useConfirm();

  useEffect(() => setSearch(initialSearch), [initialSearch]);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      setData(await loadJson<Data>('/api/admin/products', 'Ürünler yüklenemedi.', (body) => Array.isArray((body as Data | null)?.products)));
    } catch (err) {
      setLoadError(errorText(err, 'Ürünler yüklenemedi.'));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const patchProduct = (id: string, next: Partial<Product>) =>
    setData((current) => (current ? { ...current, products: current.products.map((p) => (p.id === id ? { ...p, ...next } : p)) } : current));

  const visible = useMemo(() => {
    if (!data) return [];
    const needle = search.trim().toLocaleLowerCase('tr-TR');
    const rule = SORTS.find((item) => item.key === sort.key)!;
    return data.products
      .filter((p) => {
        if (category && p.category !== category) return false;
        if (view === 'PUBLISHED' && p.status !== 'PUBLISHED') return false;
        if (view === 'DRAFT' && p.status !== 'DRAFT') return false;
        if (view === 'LOW' && !p.variants.some((v) => v.stock <= data.lowStockThreshold)) return false;
        if (view === 'WAITING' && pendingAlerts(p) === 0) return false;
        return !needle || includes(p.name, needle) || includes(p.slug, needle) || includes(p.color, needle);
      })
      .sort((a, b) => {
        const x = rule.value(a);
        const y = rule.value(b);
        const order = x < y ? -1 : x > y ? 1 : 0;
        return sort.desc ? -order : order;
      });
  }, [data, search, category, view, sort]);

  if (loadError && !data) return <TabLoadError message={loadError} onRetry={load} />;
  if (!data) return <TabLoading label="Ürünler yükleniyor" />;

  const { products, lowStockThreshold } = data;
  const lowCount = products.filter((p) => p.variants.some((v) => v.stock <= lowStockThreshold)).length;
  const waitingSizes = products.reduce((sum, p) => sum + p.variants.filter((v) => v.pendingAlerts > 0).length, 0);
  const categories = Array.from(new Set(products.map((p) => p.category))).sort();
  const visibleIds = visible.map((p) => p.id);
  const allVisible = visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));
  const someVisible = visibleIds.some((id) => selected.has(id));

  const toggleSort = (key: SortKey) => {
    const rule = SORTS.find((item) => item.key === key)!;
    setSort((current) => (current.key === key ? { key, desc: !current.desc } : { key, desc: rule.desc }));
  };
  const ariaSort = (key: SortKey) => (sort.key === key ? (sort.desc ? 'descending' : 'ascending') : 'none');
  const sortButton = (k: SortKey, children: React.ReactNode) => (
    <button type="button" className="adm-sort" onClick={() => toggleSort(k)} data-active={sort.key === k || undefined}>
      {children}
      <span aria-hidden="true">{sort.key === k ? (sort.desc ? '↓' : '↑') : ''}</span>
    </button>
  );

  const runBulk = (action: BulkAction) => {
    const ids = [...selected];
    ask({
      title: `${ids.length} ürün: ${BULK_TEXT[action].label.toLocaleLowerCase('tr-TR')}?`,
      message:
        action === 'publish' ? (
          <p>Kapak, fiyat, renk ve beden bilgisi eksik ürünler yayınlanmaz; nedenleri size yazılır.</p>
        ) : action === 'draft' ? (
          <p>Ürünler mağazadan kalkar; sepetteki müşteriler bu ürünleri satın alamaz.</p>
        ) : (
          <p>Ana sayfadaki vitrin seçimi değişir.</p>
        ),
      confirmLabel: BULK_TEXT[action].label,
      pendingLabel: 'Kaydediliyor',
      danger: action === 'draft',
      onConfirm: async () => {
        const result = await sendJson<BulkResult>('/api/admin/products/bulk', 'POST', { ids, action }, 'Toplu işlem yapılamadı.');
        afterBulk(result, BULK_TEXT[action].done);
      },
    });
  };

  const afterBulk = (result: BulkResult, done: string) => {
    setSelected(new Set());
    void load();
    if (result.failed.length) {
      error(`${result.updated.length} ürün ${done}. Yapılamayan: ${result.failed.map((item) => `${item.name} (${item.reasons.join(' ')})`).join('; ')}`);
    } else success(`${result.updated.length} ürün ${done}.`);
  };

  const duplicate = (product: Product) =>
    ask({
      title: `${product.name} kopyalansın mı?`,
      message: <p>Aynı bilgi ve bedenlerle yeni bir taslak oluşur. Stoklar 0 başlar, görseller kopyalanmaz; yayınlamadan önce medya ekleyin.</p>,
      confirmLabel: 'Taslak olarak kopyala',
      pendingLabel: 'Kopyalanıyor',
      onConfirm: async () => {
        const result = await sendJson<{ product: { id: string; name: string } }>(`/api/admin/products/${product.id}/duplicate`, 'POST', {}, 'Ürün kopyalanamadı.');
        success(`${result.product.name} taslak olarak oluşturuldu.`);
        await load();
        setEditingId(result.product.id);
      },
    });

  const toggleFeatured = async (product: Product) => {
    if (featuring) return;
    setFeaturing(product.id);
    try {
      await sendJson('/api/admin/products', 'PATCH', { productId: product.id, featured: !product.featured }, 'Vitrin durumu güncellenemedi.');
      patchProduct(product.id, { featured: !product.featured });
      success(`${product.name} ${product.featured ? 'vitrinden çıkarıldı' : 'vitrine alındı'}.`);
    } catch (err) {
      error(errorText(err, 'Vitrin durumu güncellenemedi.'));
    } finally {
      setFeaturing(null);
    }
  };

  const exportCsv = () =>
    downloadCsv(
      `pandiones-urunler-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Ürün kodu', 'Ürün adı', 'Durum', 'Kategori', 'Renk', 'Fiyat (TL)', 'Bedenler', 'Toplam stok', '30 gün satış (adet)', '30 gün ciro (TL)', 'Bekleyen talep'],
      (selected.size ? products.filter((p) => selected.has(p.id)) : visible).map((p) => [
        p.slug,
        p.name,
        p.status === 'PUBLISHED' ? 'Yayında' : 'Taslak',
        categoryLabel(p.category),
        p.color,
        p.price,
        p.variants.map((v) => `${v.size}:${v.stock}`).join(' '),
        totalStock(p),
        p.sales30.quantity,
        p.sales30.revenue,
        pendingAlerts(p),
      ]),
    );

  const tiles = [
    { view: 'PUBLISHED' as const, count: products.filter((p) => p.status === 'PUBLISHED').length, label: 'Yayında', hint: 'Mağazada görünen ürünler' },
    { view: 'DRAFT' as const, count: products.filter((p) => p.status === 'DRAFT').length, label: 'Taslak', hint: 'Yalnız panelde görünür' },
    { view: 'LOW' as const, count: lowCount, label: 'Eşik altı stok', hint: `En az bir bedeni ${lowStockThreshold} adet veya altında`, alert: lowCount > 0 },
    { view: 'WAITING' as const, count: waitingSizes, label: 'Talep bekleyen beden', hint: '“Gelince haber ver” bırakılmış' },
  ];

  return (
    <div className="adm-tab">
      <div className="adm-tasks">
        {tiles.map((tile) => (
          <button key={tile.view} type="button" className="adm-task" data-empty={tile.count === 0} data-alert={tile.alert || undefined} aria-pressed={view === tile.view} onClick={() => setView(view === tile.view ? '' : tile.view)}>
            <span className="adm-task__count">{tile.count}</span>
            <span className="adm-task__label">{tile.label}</span>
            <span className="adm-task__hint">{tile.hint}</span>
          </button>
        ))}
      </div>

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
          <span className="visually-hidden">Sıralama</span>
          <select className="adm-select" value={`${sort.key}:${sort.desc ? 'd' : 'a'}`} onChange={(e) => {
            const [key, dir] = e.target.value.split(':');
            setSort({ key: key as SortKey, desc: dir === 'd' });
          }}>
            {SORTS.map((rule) => (
              <option key={rule.key} value={`${rule.key}:${rule.desc ? 'd' : 'a'}`}>
                {rule.label}
              </option>
            ))}
          </select>
        </label>
        <div className="adm-toolbar__end">
          <button type="button" className="adm-btn adm-btn--sm" onClick={exportCsv} disabled={!visible.length}>
            <AdminIcon name="download" />
            <span>{selected.size ? `Seçilenleri CSV (${selected.size})` : 'CSV indir'}</span>
          </button>
          <button type="button" className="adm-pill" onClick={() => setEditingId(null)}>
            <span>Yeni ürün</span>
            <span className="adm-pill__icon" aria-hidden="true">
              <AdminIcon name="plus" />
            </span>
          </button>
        </div>
      </div>

      {notice}
      {loadError ? (
        <p className="adm-notice adm-notice--error" role="alert">
          <span>{loadError}</span>
          <button type="button" className="adm-btn adm-btn--sm" onClick={load}>
            Tekrar dene
          </button>
        </p>
      ) : null}

      {products.length === 0 ? (
        <p className="adm-empty">Katalogda ürün yok. “Yeni ürün” ile ilk taslağı oluşturun.</p>
      ) : visible.length === 0 ? (
        <p className="adm-empty">Bu filtrelerle eşleşen ürün yok.</p>
      ) : (
        <div className="adm-table-wrap">
          <div className="adm-table-scroll">
            <table className="adm-table adm-products-table">
              <caption className="visually-hidden">Ürünler, {visible.length} satır. Sütun başlıklarıyla sıralanabilir.</caption>
              <thead>
                <tr>
                  <th scope="col" className="adm-check">
                    <input
                      type="checkbox"
                      checked={allVisible}
                      ref={(el) => {
                        if (el) el.indeterminate = !allVisible && someVisible;
                      }}
                      onChange={(e) =>
                        setSelected((current) => {
                          const next = new Set(current);
                          for (const id of visibleIds) {
                            if (e.target.checked) next.add(id);
                            else next.delete(id);
                          }
                          return next;
                        })
                      }
                      aria-label="Listelenen tüm ürünleri seç"
                    />
                  </th>
                  <th scope="col" aria-sort={ariaSort('name')}>
                    {sortButton('name', 'Ürün')}
                  </th>
                  <th scope="col">Durum</th>
                  <th scope="col" aria-sort={ariaSort('price')}>
                    {sortButton('price', 'Fiyat')}
                  </th>
                  <th scope="col" aria-sort={ariaSort('stock')}>
                    {sortButton('stock', 'Beden stokları')}
                  </th>
                  <th scope="col" className="adm-num" aria-sort={ariaSort('sales')}>
                    {sortButton('sales', '30 gün')}
                  </th>
                  <th scope="col" className="adm-end">
                    <span className="visually-hidden">İşlem</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.map((product) => {
                  const stock = totalStock(product);
                  const isSelected = selected.has(product.id);
                  return (
                    <tr key={product.id} data-selected={isSelected || undefined}>
                      <td className="adm-check">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) =>
                            setSelected((current) => {
                              const next = new Set(current);
                              if (e.target.checked) next.add(product.id);
                              else next.delete(product.id);
                              return next;
                            })
                          }
                          aria-label={`${product.name} seç`}
                        />
                      </td>
                      <td data-label="Ürün">
                        <div className="adm-row adm-row--flush">
                          <span className="adm-row__thumb" aria-hidden="true">
                            {product.image ? <img src={product.image} alt="" loading="lazy" /> : null}
                          </span>
                          <div className="adm-cell">
                            <button type="button" className="adm-link adm-cell__main" onClick={() => setEditingId(product.id)}>
                              {product.name}
                            </button>
                            <span className="adm-cell__sub">
                              {product.color} · {categoryLabel(product.category)}
                              {product.subcategory ? ` / ${product.subcategory}` : ''}
                            </span>
                            <span className="adm-cell__sub">{product.mediaCount ? `${product.mediaCount} medya` : 'Medya yok'}</span>
                          </div>
                        </div>
                      </td>
                      <td data-label="Durum">
                        <div className="adm-cell adm-cell--gap">
                          <span className={`adm-status adm-status--${product.status === 'DRAFT' ? 'warning' : 'success'}`}>{product.status === 'DRAFT' ? 'Taslak' : 'Yayında'}</span>
                          <span className="adm-switch-row">
                            <button
                              type="button"
                              role="switch"
                              className="adm-switch"
                              aria-checked={product.featured}
                              aria-label={`${product.name}: vitrinde göster`}
                              disabled={featuring === product.id}
                              aria-busy={featuring === product.id}
                              onClick={() => toggleFeatured(product)}
                            />
                            <span className="adm-cell__sub" aria-hidden="true">
                              Vitrin
                            </span>
                          </span>
                        </div>
                      </td>
                      <td data-label="Fiyat">
                        <InlineNumber
                          label={`${product.name} fiyatı (₺)`}
                          value={product.price}
                          step={0.01}
                          min={0.01}
                          suffix="₺"
                          className="adm-inline--price"
                          validate={(next) => (Number.isFinite(next) && next > 0 && next <= 1_000_000 ? null : 'Sıfırdan büyük fiyat girin.')}
                          save={async (price) => {
                            const result = await sendJson<{ product: { price: number } }>('/api/admin/products', 'PATCH', { productId: product.id, price }, 'Fiyat kaydedilemedi.');
                            patchProduct(product.id, { price: result.product.price });
                          }}
                        />
                      </td>
                      <td data-label="Beden stokları">
                        <div className="adm-sizes">
                          {product.variants.map((variant) => (
                            <InlineNumber
                              key={variant.id}
                              label={`${product.name}, ${variant.size} bedeni stoğu`}
                              visibleLabel={variant.size}
                              value={variant.stock}
                              className="adm-inline--size"
                              tone={variant.stock === 0 ? 'danger' : variant.stock <= lowStockThreshold ? 'warning' : undefined}
                              badge={
                                variant.pendingAlerts ? (
                                  <span className="adm-inline__badge" title={`${variant.pendingAlerts} kişi stok bekliyor`}>
                                    {variant.pendingAlerts} bekliyor
                                  </span>
                                ) : null
                              }
                              validate={(next) => (Number.isInteger(next) && next >= 0 ? null : '0 veya büyük tam sayı.')}
                              save={async (next) => {
                                const result = await sendJson<{ product: { variants: { id: string; size: string; stock: number }[] } }>(
                                  '/api/admin/products',
                                  'PATCH',
                                  { variantId: variant.id, stock: next },
                                  'Stok kaydedilemedi.',
                                );
                                const saved = new Map(result.product.variants.map((v) => [v.id, v.stock]));
                                // A restock from 0 e-mails waiting customers on the server; reload so the request counts stay true.
                                if (variant.stock === 0 && next > 0 && variant.pendingAlerts > 0) void load();
                                else patchProduct(product.id, { variants: product.variants.map((v) => ({ ...v, stock: saved.get(v.id) ?? v.stock })) });
                              }}
                            />
                          ))}
                          <span className={`adm-sizes__total ${stock === 0 ? 'adm-text-danger' : ''}`}>Toplam {stock}</span>
                        </div>
                      </td>
                      <td className="adm-num" data-label="30 gün">
                        <div className="adm-cell">
                          <span className="adm-cell__main">{product.sales30.quantity} adet</span>
                          <span className="adm-cell__sub">{money(product.sales30.revenue)}</span>
                        </div>
                      </td>
                      <td className="adm-end">
                        <div className="adm-actions">
                          <button type="button" className="adm-btn adm-btn--sm" onClick={() => setEditingId(product.id)}>
                            Düzenle<span className="visually-hidden"> {product.name}</span>
                          </button>
                          <button type="button" className="adm-icon-btn" onClick={() => duplicate(product)} aria-label={`${product.name}: kopyala`}>
                            <AdminIcon name="copy" />
                          </button>
                          {product.status === 'PUBLISHED' ? (
                            <Link href={`/urun/${product.slug}`} target="_blank" rel="noopener" className="adm-icon-btn" aria-label={`${product.name}: ürün sayfası (yeni sekme)`}>
                              <AdminIcon name="arrow" />
                            </Link>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selected.size > 0 ? (
        <div className="adm-dock" role="region" aria-label="Seçili ürünler">
          <span className="adm-dock__count">{selected.size} ürün seçili</span>
          {(Object.keys(BULK_TEXT) as BulkAction[]).map((action) => (
            <button key={action} type="button" className="adm-btn adm-btn--sm" onClick={() => runBulk(action)}>
              {BULK_TEXT[action].label}
            </button>
          ))}
          <button type="button" className="adm-btn adm-btn--sm" onClick={() => setCategoryOpen(true)}>
            Kategori değiştir
          </button>
          <button type="button" className="adm-btn adm-btn--sm adm-btn--quiet" onClick={() => setSelected(new Set())}>
            Seçimi kaldır
          </button>
        </div>
      ) : null}

      {categoryOpen ? (
        <CategoryDialog
          count={selected.size}
          onClose={() => setCategoryOpen(false)}
          onApply={async (nextCategory, subcategory) => {
            const result = await sendJson<BulkResult>('/api/admin/products/bulk', 'POST', { ids: [...selected], action: 'category', category: nextCategory, subcategory }, 'Kategori değiştirilemedi.');
            setCategoryOpen(false);
            afterBulk(result, 'yeni kategoriye alındı');
          }}
        />
      ) : null}
      {editingId !== undefined ? <ProductEditor key={editingId ?? 'new'} productId={editingId ?? undefined} onSaved={() => void load()} onClose={() => setEditingId(undefined)} /> : null}
      {dialog}
    </div>
  );
}
