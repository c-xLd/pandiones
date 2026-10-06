'use client';

import React, { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import Dialog from '@/components/ui/Dialog';
import type { Product, ProductMedia, ProductVariant } from '@/types';
import { getPublishErrors } from '@/lib/products/media-domain';
import { publishErrorText } from '@/lib/products/publish-errors';
import { adminFetch } from '../../_lib/admin-fetch';
import { TabLoadError, TabLoading } from '../TabState';

type Phase = 'editing' | 'saving' | 'uploading' | 'publishing' | 'mutating';
type EditorState = { phase: Phase; error: string | null };
type EditorAction = { type: 'BEGIN'; phase: Exclude<Phase, 'editing'> } | { type: 'SUCCESS' } | { type: 'SAVE_FAILED'; message: string };

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  if (action.type === 'BEGIN') return { phase: action.phase, error: null };
  if (action.type === 'SAVE_FAILED') return { phase: 'editing', error: action.message };
  return { phase: 'editing', error: null };
}

type AdminProduct = Product & { status: 'DRAFT' | 'PUBLISHED'; familyId: string | null; media: ProductMedia[]; variants: ProductVariant[] };
type Family = { id: string; name: string; products: { id: string; color: string; category: string; status: string }[] };
type CategoryOption = { id: string; slug: string; name: string; children?: { id: string; slug: string; name: string }[] };
type VariantDraft = { size: string; stock: string };
type Fields = { name: string; price: string; color: string; category: string; subcategory: string; description: string; details: string; material: string; care: string };
type FieldErrors = Partial<Record<'name' | 'price' | 'color' | 'category' | 'variants', string>>;

const EMPTY_FIELDS: Fields = { name: '', price: '', color: '', category: 'ic-giyim', subcategory: '', description: '', details: '', material: '', care: '' };
const INITIAL_VARIANTS: VariantDraft[] = ['S', 'M', 'L', 'XL'].map((size) => ({ size, stock: '0' }));
const ROLE_LABEL = { FLATLAY: 'Düz çekim', MODEL: 'Manken', DETAIL: 'Detay' } as const;

async function readResponse<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.success === false) throw new Error(body.error || 'İşlem tamamlanamadı. Tekrar deneyin.');
  return body as T;
}

const errorMessage = (error: unknown, fallback: string) => (error instanceof Error && error.message ? error.message : fallback);

function fieldsOf(product: AdminProduct): Fields {
  return {
    name: product.name,
    price: String(product.price),
    color: product.color,
    category: product.category,
    subcategory: product.subcategory || '',
    description: product.description,
    details: product.details ?? '',
    material: product.material ?? '',
    care: product.care ?? '',
  };
}

function validate(fields: Fields, variants: VariantDraft[]): FieldErrors {
  const errors: FieldErrors = {};
  const price = Number(fields.price);
  if (!fields.name.trim()) errors.name = 'Ürün adını girin.';
  if (!Number.isFinite(price) || price <= 0) errors.price = 'Sıfırdan büyük bir fiyat girin.';
  if (!fields.color.trim()) errors.color = 'Rengi girin.';
  if (!fields.category) errors.category = 'Kategori seçin.';
  const sizes = variants.map((variant) => variant.size.trim());
  if (!variants.length) errors.variants = 'En az bir beden ekleyin.';
  else if (sizes.some((size) => !size)) errors.variants = 'Beden adı boş olamaz.';
  else if (new Set(sizes).size !== sizes.length) errors.variants = 'Aynı beden iki kez eklenmiş.';
  else if (variants.some((variant) => !Number.isInteger(Number(variant.stock)) || Number(variant.stock) < 0 || variant.stock.trim() === '')) errors.variants = 'Stok 0 veya daha büyük tam sayı olmalı.';
  return errors;
}

/**
 * The editor body, outside the portal so it can be rendered on its own (tests). Reports unsaved changes
 * through `onDirtyChange` so the sheet can ask before closing.
 */
export function ProductEditorForm({
  productId,
  onSaved,
  onDirtyChange,
}: {
  productId?: string;
  onSaved(): void;
  onDirtyChange?(dirty: boolean): void;
}) {
  const [state, dispatch] = useReducer(editorReducer, { phase: 'editing', error: null });
  const [currentId, setCurrentId] = useState(productId ?? '');
  const [product, setProduct] = useState<AdminProduct | null>(null);
  const [loading, setLoading] = useState(Boolean(productId));
  const [loadError, setLoadError] = useState<string | null>(null);
  const [fields, setFields] = useState<Fields>(EMPTY_FIELDS);
  const [variants, setVariants] = useState<VariantDraft[]>(INITIAL_VARIANTS);
  const [saved, setSaved] = useState<{ fields: Fields; variants: VariantDraft[] }>({ fields: EMPTY_FIELDS, variants: INITIAL_VARIANTS });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [categories, setCategories] = useState<CategoryOption[] | null>(null);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [families, setFamilies] = useState<Family[]>([]);
  const [newFamilyName, setNewFamilyName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [role, setRole] = useState<keyof typeof ROLE_LABEL>('FLATLAY');
  const [alt, setAlt] = useState('');
  const [posterMediaId, setPosterMediaId] = useState('');
  const [isCover, setIsCover] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const busy = state.phase !== 'editing';

  const dirty = JSON.stringify({ fields, variants }) !== JSON.stringify(saved);
  useEffect(() => onDirtyChange?.(dirty), [dirty, onDirtyChange]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 4000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  function hydrate(next: AdminProduct) {
    const nextFields = fieldsOf(next);
    const nextVariants = next.variants.map((variant) => ({ size: variant.size, stock: String(variant.stock) }));
    setProduct(next);
    setCurrentId(next.id);
    setFields(nextFields);
    setVariants(nextVariants);
    setSaved({ fields: nextFields, variants: nextVariants });
  }

  const reloadProduct = useCallback(async (id: string) => {
    const data = await readResponse<{ product: AdminProduct }>(await fetch(`/api/admin/products/${id}`, { cache: 'no-store' }));
    hydrate(data.product);
  }, []);

  const reloadFamilies = useCallback(async () => {
    const data = await readResponse<{ families: Family[] }>(await fetch('/api/admin/product-families', { cache: 'no-store' }));
    setFamilies(data.families);
  }, []);

  const reloadCategories = useCallback(async () => {
    setCategoryError(null);
    try {
      const response = await fetch('/api/admin/categories', { cache: 'no-store' });
      const data = await response.json().catch(() => null);
      if (!response.ok || !Array.isArray(data?.categories)) throw new Error(data?.error || 'Kategoriler yüklenemedi.');
      setCategories(data.categories);
    } catch (error) {
      setCategoryError(errorMessage(error, 'Kategoriler yüklenemedi.'));
    }
  }, []);

  const loadProduct = useCallback(async () => {
    if (!productId) return;
    setLoadError(null);
    setLoading(true);
    try {
      await reloadProduct(productId);
    } catch (error) {
      setLoadError(errorMessage(error, 'Ürün yüklenemedi.'));
    } finally {
      setLoading(false);
    }
  }, [productId, reloadProduct]);

  useEffect(() => {
    void reloadCategories();
    void loadProduct();
    reloadFamilies().catch((error) => dispatch({ type: 'SAVE_FAILED', message: errorMessage(error, 'Renk aileleri yüklenemedi.') }));
  }, [reloadCategories, loadProduct, reloadFamilies]);

  const setField = (key: keyof Fields, value: string) => {
    setFields((current) => ({ ...current, [key]: value, ...(key === 'category' ? { subcategory: '' } : {}) }));
    if (key in errors) setErrors((current) => ({ ...current, [key]: undefined }));
  };

  async function run(phase: Exclude<Phase, 'editing'>, action: () => Promise<void>, fallback: string, done?: string) {
    if (busy) return;
    dispatch({ type: 'BEGIN', phase });
    try {
      await action();
      onSaved();
      dispatch({ type: 'SUCCESS' });
      if (done) setNotice(done);
    } catch (error) {
      dispatch({ type: 'SAVE_FAILED', message: errorMessage(error, fallback) });
    }
  }

  function saveDraft(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validate(fields, variants);
    setErrors(nextErrors);
    const first = (['name', 'price', 'color', 'category', 'variants'] as const).find((key) => nextErrors[key]);
    if (first) {
      event.currentTarget.querySelector<HTMLElement>(`[data-field="${first}"]`)?.focus();
      return;
    }
    void run(
      'saving',
      async () => {
        const response = await adminFetch(currentId ? `/api/admin/products/${currentId}` : '/api/admin/products', {
          method: currentId ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: fields.name,
            price: Number(fields.price),
            color: fields.color,
            category: fields.category,
            subcategory: fields.subcategory || null,
            description: fields.description,
            details: fields.details,
            material: fields.material,
            care: fields.care,
            variants: variants.map((variant) => ({ size: variant.size.trim(), stock: Number(variant.stock) })),
          }),
        });
        const data = await readResponse<{ product: AdminProduct }>(response);
        await reloadProduct(data.product.id);
      },
      'Ürün kaydedilemedi.',
      currentId ? 'Değişiklikler kaydedildi.' : 'Taslak oluşturuldu. Şimdi medya ekleyebilirsiniz.',
    );
  }

  function uploadMedia(event: React.FormEvent) {
    event.preventDefault();
    if (!currentId || !file) return;
    const limit = file.type.startsWith('video/') ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > limit) return dispatch({ type: 'SAVE_FAILED', message: 'Dosya boyutu sınırı aşıyor (görsel 10 MB, video 50 MB).' });
    if (file.type.startsWith('video/') && !posterMediaId) return dispatch({ type: 'SAVE_FAILED', message: 'Video için aynı ürüne ait bir poster görseli seçin.' });
    if (!alt.trim()) return dispatch({ type: 'SAVE_FAILED', message: 'Görsel açıklamasını yazın; ekran okuyucular ve arama motorları bunu kullanır.' });
    void run(
      'uploading',
      async () => {
        const body = new FormData();
        body.set('file', file);
        body.set('role', role);
        body.set('alt', alt);
        body.set('isCover', String(isCover));
        if (posterMediaId) body.set('posterMediaId', posterMediaId);
        await readResponse(await adminFetch(`/api/admin/products/${currentId}/media`, { method: 'POST', body }));
        await reloadProduct(currentId);
        setFile(null);
        setAlt('');
        setPosterMediaId('');
        setIsCover(false);
        if (fileRef.current) fileRef.current.value = '';
      },
      'Medya yüklenemedi.',
      'Medya yüklendi.',
    );
  }

  function mutateMedia(body: { action: 'cover' | 'order'; mediaId: string; position?: number } | { mediaId: string; delete: true }, done: string) {
    if (!currentId) return;
    void run(
      'mutating',
      async () => {
        await readResponse(
          await adminFetch(`/api/admin/products/${currentId}/media`, {
            method: 'delete' in body ? 'DELETE' : 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          }),
        );
        await reloadProduct(currentId);
        setConfirmDelete(null);
      },
      'Medya düzenlenemedi.',
      done,
    );
  }

  function linkFamily(familyId: string | null) {
    if (!currentId) return;
    void run(
      'mutating',
      async () => {
        await readResponse(await adminFetch('/api/admin/product-families', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId: currentId, familyId }) }));
        await reloadProduct(currentId);
        await reloadFamilies();
      },
      'Renk ailesi bağlanamadı.',
      familyId ? 'Renk ailesine bağlandı.' : 'Renk ailesinden çıkarıldı.',
    );
  }

  function createAndLinkFamily() {
    if (!currentId || !newFamilyName.trim()) return;
    void run(
      'mutating',
      async () => {
        const data = await readResponse<{ family: Family }>(
          await adminFetch('/api/admin/product-families', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newFamilyName }) }),
        );
        await readResponse(await adminFetch('/api/admin/product-families', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId: currentId, familyId: data.family.id }) }));
        await reloadProduct(currentId);
        await reloadFamilies();
        setNewFamilyName('');
      },
      'Renk ailesi oluşturulamadı.',
      'Renk ailesi oluşturuldu ve bağlandı.',
    );
  }

  function setPublished(publish: boolean) {
    if (!currentId) return;
    void run(
      'publishing',
      async () => {
        await readResponse(await adminFetch(`/api/admin/products/${currentId}/${publish ? 'publish' : 'unpublish'}`, { method: 'POST' }));
        await reloadProduct(currentId);
      },
      publish ? 'Ürün yayınlanamadı.' : 'Ürün taslağa alınamadı.',
      publish ? 'Ürün yayında.' : 'Ürün taslağa alındı; mağazada görünmez.',
    );
  }

  if (loadError) return <TabLoadError message={loadError} onRetry={loadProduct} />;
  if (loading) return <TabLoading label="Ürün yükleniyor" />;

  const cover = product?.media.find((item) => item.isCover);
  const preview = cover?.posterUrl || cover?.url || product?.image;
  const subcategories = categories?.find((category) => category.slug === fields.category)?.children ?? [];
  const publishProblems = product
    ? publishErrorText(
        getPublishErrors({
          price: product.price,
          category: product.category,
          color: product.color,
          variants: product.variants,
          media: product.media.map(({ kind, url, posterUrl, isCover: coverFlag }) => ({ kind, url, posterUrl, isCover: coverFlag })),
        }),
      )
    : [];
  const errorProps = (key: keyof FieldErrors) => ({
    'data-field': key,
    'aria-invalid': Boolean(errors[key]) || undefined,
    'aria-describedby': errors[key] ? `pe-${key}-error` : undefined,
  });
  const fieldError = (key: keyof FieldErrors) =>
    errors[key] ? (
      <p id={`pe-${key}-error`} className="adm-field-error">
        {errors[key]}
      </p>
    ) : null;

  return (
    <div className="adm-form adm-editor">
      <div className="adm-notice-slot" aria-live="polite">
        {state.error ? (
          <p className="adm-notice adm-notice--error" role="alert">
            <span>{state.error} Form açık; düzeltip tekrar deneyebilirsiniz.</span>
          </p>
        ) : notice ? (
          <p className="adm-notice adm-notice--success">
            <span>{notice}</span>
          </p>
        ) : null}
      </div>

      <div className="adm-editor__layout">
        <div className="adm-editor__main">
          <form className="adm-sheet__panel adm-editor__section" onSubmit={saveDraft} noValidate aria-labelledby="pe-info">
            <h3 id="pe-info" className="adm-editor__heading">
              <span>01</span> Ürün bilgileri
            </h3>
            <div className="adm-form__grid">
              <div className="adm-field">
                <label htmlFor="pe-name">Ürün adı</label>
                <input id="pe-name" maxLength={160} value={fields.name} onChange={(e) => setField('name', e.target.value)} {...errorProps('name')} />
                {fieldError('name')}
              </div>
              <div className="adm-field">
                <label htmlFor="pe-price">Fiyat (₺)</label>
                <input id="pe-price" type="number" inputMode="decimal" min="0.01" step="0.01" value={fields.price} onChange={(e) => setField('price', e.target.value)} {...errorProps('price')} />
                {fieldError('price')}
              </div>
              <div className="adm-field">
                <label htmlFor="pe-color">Renk</label>
                <input id="pe-color" maxLength={80} value={fields.color} onChange={(e) => setField('color', e.target.value)} {...errorProps('color')} />
                {fieldError('color')}
              </div>
              <div className="adm-field">
                <label htmlFor="pe-category">Kategori</label>
                <select id="pe-category" value={fields.category} onChange={(e) => setField('category', e.target.value)} disabled={!categories} {...errorProps('category')}>
                  {categories ? (
                    categories.map((category) => (
                      <option key={category.id} value={category.slug}>
                        {category.name}
                      </option>
                    ))
                  ) : (
                    <option value={fields.category}>{categoryError ? 'Kategoriler yüklenemedi' : 'Yükleniyor'}</option>
                  )}
                </select>
                {fieldError('category')}
                {categoryError ? (
                  <p className="adm-field-error" role="alert">
                    {categoryError}{' '}
                    <button type="button" className="adm-link" onClick={reloadCategories}>
                      Tekrar dene
                    </button>
                  </p>
                ) : null}
              </div>
              <div className="adm-field">
                <label htmlFor="pe-subcategory">Alt kategori (isteğe bağlı)</label>
                <select id="pe-subcategory" value={fields.subcategory} onChange={(e) => setField('subcategory', e.target.value)} disabled={!subcategories.length}>
                  <option value="">{subcategories.length ? 'Yok' : 'Bu kategoride alt kategori yok'}</option>
                  {subcategories.map((sub) => (
                    <option key={sub.id} value={sub.slug}>
                      {sub.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="adm-field">
              <label htmlFor="pe-description">Açıklama</label>
              <textarea id="pe-description" rows={3} value={fields.description} onChange={(e) => setField('description', e.target.value)} />
            </div>
            <div className="adm-form__grid">
              <div className="adm-field">
                <label htmlFor="pe-details">Ürün detayları</label>
                <textarea id="pe-details" rows={2} value={fields.details} onChange={(e) => setField('details', e.target.value)} />
              </div>
              <div className="adm-field">
                <label htmlFor="pe-material">Materyal</label>
                <textarea id="pe-material" rows={2} value={fields.material} onChange={(e) => setField('material', e.target.value)} />
              </div>
            </div>
            <div className="adm-field">
              <label htmlFor="pe-care">Bakım bilgisi</label>
              <textarea id="pe-care" rows={2} value={fields.care} onChange={(e) => setField('care', e.target.value)} />
            </div>

            <fieldset className="adm-editor__sizes">
              <legend>Beden stokları</legend>
              {variants.map((variant, index) => (
                <div className="adm-editor__size" key={index}>
                  <div className="adm-field">
                    <label htmlFor={`pe-size-${index}`}>Beden</label>
                    <input
                      id={`pe-size-${index}`}
                      data-field={index === 0 ? 'variants' : undefined}
                      value={variant.size}
                      maxLength={10}
                      onChange={(e) => {
                        setVariants((items) => items.map((item, i) => (i === index ? { ...item, size: e.target.value } : item)));
                        setErrors((current) => ({ ...current, variants: undefined }));
                      }}
                    />
                  </div>
                  <div className="adm-field">
                    <label htmlFor={`pe-stock-${index}`}>Stok</label>
                    <input
                      id={`pe-stock-${index}`}
                      type="number"
                      inputMode="numeric"
                      min="0"
                      step="1"
                      value={variant.stock}
                      onChange={(e) => {
                        setVariants((items) => items.map((item, i) => (i === index ? { ...item, stock: e.target.value } : item)));
                        setErrors((current) => ({ ...current, variants: undefined }));
                      }}
                    />
                  </div>
                  <button type="button" className="adm-btn adm-btn--sm adm-btn--quiet adm-btn--danger-text" onClick={() => setVariants((items) => items.filter((_, i) => i !== index))}>
                    Kaldır<span className="visually-hidden"> {variant.size || `beden ${index + 1}`}</span>
                  </button>
                </div>
              ))}
              {fieldError('variants')}
              <button type="button" className="adm-btn adm-btn--sm adm-btn--quiet" onClick={() => setVariants((items) => [...items, { size: '', stock: '0' }])}>
                Beden ekle
              </button>
            </fieldset>

            <div className="adm-editor__save">
              {dirty ? <span className="adm-field__hint">Kaydedilmemiş değişiklik var.</span> : null}
              <button type="submit" className="adm-btn adm-btn--primary" disabled={busy} aria-busy={state.phase === 'saving'}>
                {state.phase === 'saving' ? 'Kaydediliyor' : currentId ? 'Değişiklikleri kaydet' : 'Taslak oluştur'}
              </button>
            </div>
          </form>

          <section className="adm-sheet__panel adm-editor__section" aria-labelledby="pe-media">
            <h3 id="pe-media" className="adm-editor__heading">
              <span>02</span> Ürün medyası
            </h3>
            <p className="adm-field__hint">Düz çekim, manken, detay ve video aynı ürüne ait olmalı. Görsel en çok 10 MB, video en çok 50 MB.</p>
            {!currentId ? <p className="adm-editor__hint">Önce taslağı oluşturun; sonra bu ürüne medya yükleyebilirsiniz.</p> : null}
            {product?.media.length ? (
              <ol className="adm-editor__media">
                {product.media.map((media, index) => (
                  <li key={media.id}>
                    <span className="adm-editor__thumb">
                      {media.kind === 'VIDEO' ? <video poster={media.posterUrl || undefined} preload="none" muted playsInline aria-label={media.alt} /> : <img src={media.url} alt={media.alt} />}
                    </span>
                    <span className="adm-cell">
                      <span className="adm-cell__main">
                        {ROLE_LABEL[media.role]} {media.isCover ? <span className="adm-status adm-status--success">Kapak</span> : null}
                      </span>
                      <span className="adm-cell__sub">
                        {media.kind === 'VIDEO' ? 'Video' : 'Fotoğraf'} · {media.alt}
                      </span>
                    </span>
                    <span className="adm-actions">
                      <button type="button" className="adm-icon-btn" disabled={busy || index === 0} onClick={() => mutateMedia({ action: 'order', mediaId: media.id, position: index - 1 }, 'Sıra güncellendi.')} aria-label={`${media.alt}: öne taşı`}>
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path d="m6 15 6-6 6 6" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        className="adm-icon-btn"
                        disabled={busy || index === product.media.length - 1}
                        onClick={() => mutateMedia({ action: 'order', mediaId: media.id, position: index + 1 }, 'Sıra güncellendi.')}
                        aria-label={`${media.alt}: arkaya taşı`}
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path d="m6 9 6 6 6-6" />
                        </svg>
                      </button>
                      {!media.isCover ? (
                        <button type="button" className="adm-btn adm-btn--sm adm-btn--quiet" disabled={busy} onClick={() => mutateMedia({ action: 'cover', mediaId: media.id }, 'Kapak değişti.')}>
                          Kapak yap
                        </button>
                      ) : null}
                      {confirmDelete === media.id ? (
                        <span className="adm-confirm-inline">
                          <button type="button" className="adm-btn adm-btn--sm adm-btn--danger" disabled={busy} onClick={() => mutateMedia({ mediaId: media.id, delete: true }, 'Medya silindi.')}>
                            {state.phase === 'mutating' ? 'Siliniyor' : 'Evet, sil'}
                          </button>
                          <button type="button" className="adm-btn adm-btn--sm adm-btn--quiet" onClick={() => setConfirmDelete(null)}>
                            Vazgeç
                          </button>
                        </span>
                      ) : (
                        <button type="button" className="adm-btn adm-btn--sm adm-btn--quiet adm-btn--danger-text" disabled={busy} onClick={() => setConfirmDelete(media.id)}>
                          Sil<span className="visually-hidden"> {media.alt}</span>
                        </button>
                      )}
                    </span>
                  </li>
                ))}
              </ol>
            ) : currentId ? (
              <p className="adm-editor__hint">Henüz medya yok. Yayın için gerçek bir kapak yükleyin.</p>
            ) : null}
            <form className="adm-form__grid adm-editor__upload" onSubmit={uploadMedia} noValidate>
              <div className="adm-field">
                <label htmlFor="pe-file">Fotoğraf veya video</label>
                <input ref={fileRef} id="pe-file" type="file" accept=".jpg,.jpeg,.png,.webp,.mp4,.webm" disabled={!currentId || busy} onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              </div>
              <div className="adm-field">
                <label htmlFor="pe-role">Çekim türü</label>
                <select id="pe-role" value={role} disabled={!currentId || busy} onChange={(e) => setRole(e.target.value as keyof typeof ROLE_LABEL)}>
                  <option value="FLATLAY">Düz çekim</option>
                  <option value="MODEL">Manken</option>
                  <option value="DETAIL">Detay</option>
                </select>
              </div>
              <div className="adm-field">
                <label htmlFor="pe-alt">Görsel açıklaması</label>
                <input id="pe-alt" value={alt} maxLength={240} disabled={!currentId || busy} onChange={(e) => setAlt(e.target.value)} aria-describedby="pe-alt-hint" />
                <p id="pe-alt-hint" className="adm-field__hint">
                  Ürünü ve açıyı tanımlayın.
                </p>
              </div>
              {file?.type.startsWith('video/') ? (
                <div className="adm-field">
                  <label htmlFor="pe-poster">Video posteri</label>
                  <select id="pe-poster" value={posterMediaId} disabled={!currentId || busy} onChange={(e) => setPosterMediaId(e.target.value)}>
                    <option value="">Poster seçin</option>
                    {product?.media
                      .filter((item) => item.kind === 'IMAGE')
                      .map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.alt}
                        </option>
                      ))}
                  </select>
                </div>
              ) : null}
              <div className="adm-field adm-field--check">
                <input id="pe-cover" type="checkbox" checked={isCover} disabled={!currentId || busy} onChange={(e) => setIsCover(e.target.checked)} />
                <div>
                  <label htmlFor="pe-cover">Kapak olarak kullan</label>
                </div>
              </div>
              <button type="submit" className="adm-btn adm-btn--primary adm-form__submit" disabled={!currentId || !file || busy} aria-busy={state.phase === 'uploading'}>
                {state.phase === 'uploading' ? 'Yükleniyor' : 'Medyayı yükle'}
              </button>
            </form>
          </section>

          <section className="adm-sheet__panel adm-editor__section" aria-labelledby="pe-family">
            <h3 id="pe-family" className="adm-editor__heading">
              <span>03</span> Renk ailesi
            </h3>
            <p className="adm-field__hint">Aynı modelin başka renklerini bağlayın. Her renk kendi ürün sayfası ve stok bilgisiyle kalır.</p>
            <div className="adm-form__grid">
              <div className="adm-field">
                <label htmlFor="pe-family-select">Mevcut aile</label>
                <select id="pe-family-select" value={product?.familyId ?? ''} disabled={!currentId || busy} onChange={(e) => linkFamily(e.target.value || null)}>
                  <option value="">Aile seçilmedi</option>
                  {families
                    .filter((family) => !family.products.length || family.products.some((item) => item.category === fields.category))
                    .map((family) => (
                      <option key={family.id} value={family.id}>
                        {family.name} ({family.products.map((item) => item.color).join(', ') || 'boş'})
                      </option>
                    ))}
                </select>
              </div>
              <div className="adm-field">
                <label htmlFor="pe-family-new">Yeni aile adı</label>
                <input id="pe-family-new" value={newFamilyName} maxLength={80} disabled={!currentId || busy} onChange={(e) => setNewFamilyName(e.target.value)} />
              </div>
            </div>
            <button type="button" className="adm-btn adm-btn--sm adm-editor__inline-action" disabled={!currentId || !newFamilyName.trim() || busy} onClick={createAndLinkFamily}>
              Aile oluştur ve bağla
            </button>
          </section>
        </div>

        <aside className="adm-editor__side" aria-label="Önizleme ve yayın">
          <div className="adm-editor__preview">
            <span className="adm-editor__preview-image">{preview ? <img src={preview} alt="" /> : <span>Kapak görseli eklendiğinde önizleme burada görünür.</span>}</span>
            <p className="adm-cell__main">{fields.name || 'Ürün adı'}</p>
            <p className="adm-cell__sub">{fields.price ? `${Number(fields.price).toLocaleString('tr-TR')} ₺` : 'Fiyat'}</p>
          </div>
          <div className="adm-sheet__panel adm-editor__publish">
            <h3 className="adm-editor__heading">Yayın durumu</h3>
            <span className={`adm-status adm-status--${product?.status === 'PUBLISHED' ? 'success' : 'warning'}`}>{product?.status === 'PUBLISHED' ? 'Yayında' : 'Taslak'}</span>
            {product?.status === 'PUBLISHED' ? (
              <>
                <p className="adm-field__hint">Bu ürün mağazada görünüyor.</p>
                <button type="button" className="adm-btn adm-btn--block" disabled={busy} aria-busy={state.phase === 'publishing'} onClick={() => setPublished(false)}>
                  {state.phase === 'publishing' ? 'Kaydediliyor' : 'Taslağa al'}
                </button>
              </>
            ) : (
              <>
                <p className="adm-field__hint">Yalnız yönetici görebilir.</p>
                {currentId && publishProblems.length ? (
                  <ul className="adm-editor__problems" aria-label="Yayın için eksikler">
                    {publishProblems.map((problem) => (
                      <li key={problem}>{problem}</li>
                    ))}
                  </ul>
                ) : null}
                {dirty && currentId ? <p className="adm-field__hint">Önce değişiklikleri kaydedin.</p> : null}
                <button
                  type="button"
                  className="adm-btn adm-btn--primary adm-btn--block"
                  disabled={!currentId || busy || publishProblems.length > 0 || dirty}
                  aria-busy={state.phase === 'publishing'}
                  onClick={() => setPublished(true)}
                >
                  {state.phase === 'publishing' ? 'Yayınlanıyor' : 'Yayınla'}
                </button>
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

/** The editor as a side sheet. Closing with unsaved changes asks first. */
export default function ProductEditor({ productId, onSaved, onClose }: { productId?: string; onSaved(): void; onClose(): void }) {
  const dirtyRef = useRef(false);
  const [askClose, setAskClose] = useState(false);
  const onDirtyChange = useCallback((dirty: boolean) => {
    dirtyRef.current = dirty;
    if (!dirty) setAskClose(false);
  }, []);
  const requestClose = () => (dirtyRef.current ? setAskClose(true) : onClose());

  return (
    <Dialog open onClose={requestClose} title={productId ? 'Ürünü düzenle' : 'Yeni ürün'} eyebrow="Katalog" className="adm-dialog adm-dialog--sheet adm-dialog--editor" size="lg">
      {askClose ? (
        <div className="adm-notice adm-notice--error adm-editor__leave" role="alert">
          <span>Kaydedilmemiş değişiklikler var. Kaydetmeden kapatılsın mı?</span>
          <span className="adm-confirm-inline">
            <button type="button" className="adm-btn adm-btn--sm adm-btn--danger" onClick={onClose}>
              Kaydetmeden kapat
            </button>
            <button type="button" className="adm-btn adm-btn--sm" onClick={() => setAskClose(false)} data-autofocus>
              Düzenlemeye dön
            </button>
          </span>
        </div>
      ) : null}
      <ProductEditorForm productId={productId} onSaved={onSaved} onDirtyChange={onDirtyChange} />
    </Dialog>
  );
}
