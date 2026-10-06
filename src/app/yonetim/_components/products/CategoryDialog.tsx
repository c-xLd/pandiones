'use client';

import React, { useEffect, useState } from 'react';
import Dialog from '@/components/ui/Dialog';
import { errorText, loadJson } from '../../_lib/request';

type CategoryOption = { id: string; slug: string; name: string; children?: { id: string; slug: string; name: string }[] };

/** Picks a category (and optional subcategory) for the selected products. */
export default function CategoryDialog({ count, onClose, onApply }: { count: number; onClose(): void; onApply(category: string, subcategory: string | null): Promise<void> }) {
  const [categories, setCategories] = useState<CategoryOption[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [category, setCategory] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoadError(null);
    try {
      const data = await loadJson<{ categories: CategoryOption[] }>('/api/admin/categories', 'Kategoriler yüklenemedi.', (body) => Array.isArray((body as { categories?: unknown } | null)?.categories));
      setCategories(data.categories);
      setCategory(data.categories[0]?.slug ?? '');
    } catch (err) {
      setLoadError(errorText(err, 'Kategoriler yüklenemedi.'));
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const children = categories?.find((item) => item.slug === category)?.children ?? [];

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (pending || !category) return;
    setPending(true);
    setError(null);
    try {
      await onApply(category, subcategory || null);
    } catch (err) {
      setError(errorText(err, 'Kategori değiştirilemedi.'));
      setPending(false);
    }
  };

  return (
    <Dialog open onClose={() => !pending && onClose()} title={`${count} ürünün kategorisi`} className="adm-dialog">
      <form className="adm-form" onSubmit={submit} noValidate>
        {loadError ? (
          <p className="adm-field-error adm-dialog__error" role="alert">
            {loadError}{' '}
            <button type="button" className="adm-link" onClick={load}>
              Tekrar dene
            </button>
          </p>
        ) : null}
        <div className="adm-form__grid">
          <div className="adm-field">
            <label htmlFor="bulk-category">Kategori</label>
            <select
              id="bulk-category"
              value={category}
              disabled={!categories}
              onChange={(e) => {
                setCategory(e.target.value);
                setSubcategory('');
              }}
            >
              {categories ? categories.map((item) => <option key={item.id} value={item.slug}>{item.name}</option>) : <option value="">Yükleniyor</option>}
            </select>
          </div>
          <div className="adm-field">
            <label htmlFor="bulk-subcategory">Alt kategori</label>
            <select id="bulk-subcategory" value={subcategory} disabled={!children.length} onChange={(e) => setSubcategory(e.target.value)}>
              <option value="">{children.length ? 'Yok' : 'Alt kategori yok'}</option>
              {children.map((child) => (
                <option key={child.id} value={child.slug}>
                  {child.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <p className="adm-field__hint">Yalnız İç giyim ve Ev giyim kategorisindeki ürünler yayında kalabilir; başka kategoriye alınan yayındaki ürün yeniden yayınlanamaz.</p>
        {error ? (
          <p className="adm-field-error adm-dialog__error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="adm-dialog__actions">
          <button type="button" className="adm-btn" onClick={onClose} disabled={pending}>
            Vazgeç
          </button>
          <button type="submit" className="adm-btn adm-btn--primary" disabled={pending || !category} aria-busy={pending}>
            {pending ? 'Kaydediliyor' : 'Kategoriyi değiştir'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
