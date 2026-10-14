'use client';

import React, { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import type { Product, ProductMedia, ProductVariant } from '@/types';
import { getPublishErrors } from '@/lib/products/media-domain';
import { publishErrorText } from '@/lib/products/publish-errors';
import { adminFetch } from '../../_lib/admin-fetch';
import { TabLoadError, TabLoading } from '../TabState';
import { VariantMatrixSection } from './VariantMatrixSection';
import Combobox from './Combobox';
import VariantMediaDialog from './VariantMediaDialog';
import StagedMediaDialog from './StagedMediaDialog';
import type { ColorCandidate } from './LinkColorPicker';
import { useConfirm } from '../ConfirmDialog';
import CategoryTreeSelect, { type CategoryNode } from './CategoryTreeSelect';
import { DEFAULT_MATERIALS, DEFAULT_CARE_INSTRUCTIONS, DEFAULT_DETAIL_PRESETS, getColorSwatch, getPersistentOptions, persistCustomOption, type StorageKey } from '../../_lib/persistent-options';
import {
  groupFromProduct,
  groupPayload,
  groupSnapshot,
  autoAlt,
  regenerateSkus,
  skusToChange,
  validateGroups,
  type ColorGroup,
  type MediaSummary,
  type StagedMedia,
  type VariantErrors,
} from '../../_lib/variant-model';

type Phase = 'editing' | 'saving' | 'publishing';
type EditorState = { phase: Phase; error: string | null };
type EditorAction = { type: 'BEGIN'; phase: Exclude<Phase, 'editing'> } | { type: 'SUCCESS' } | { type: 'SAVE_FAILED'; message: string };

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  if (action.type === 'BEGIN') return { phase: action.phase, error: null };
  if (action.type === 'SAVE_FAILED') return { phase: 'editing', error: action.message };
  return { phase: 'editing', error: null };
}

export type AdminProduct = Product & {
  status: 'DRAFT' | 'PUBLISHED';
  familyId: string | null;
  media: ProductMedia[];
  variants: ProductVariant[];
  family?: { id: string; name: string; products: { id: string; color: string; status: string }[] } | null;
};
type Fields = { name: string; category: string; subcategory: string; description: string; details: string; material: string; care: string };
type FieldErrors = Partial<Record<'name' | 'category' | 'variants', string>>;
type Saved = { fields: Fields; groups: ColorGroup[] };
type MediaTarget = { key: string; productId: string | null; color: string; focusId?: string };

const EMPTY_FIELDS: Fields = { name: '', category: '', subcategory: '', description: '', details: '', material: '', care: '' };
const NO_VARIANT_ERRORS: VariantErrors = { cells: {} };

async function readResponse<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.success === false) throw new Error(body.error || 'İşlem tamamlanamadı. Tekrar deneyin.');
  return body as T;
}

const errorMessage = (error: unknown, fallback: string) => (error instanceof Error && error.message ? error.message : fallback);

function fieldsOf(product: AdminProduct): Fields {
  return {
    name: product.name,
    category: product.category,
    subcategory: product.subcategory || '',
    description: product.description,
    details: product.details ?? '',
    material: product.material ?? '',
    care: product.care ?? '',
  };
}

function validate(fields: Fields, categories: CategoryNode[] | null): FieldErrors {
  const errors: FieldErrors = {};
  if (!fields.name.trim()) errors.name = 'Ürün adını girin.';
  const root = categories?.find((node) => node.slug === fields.category);
  if (!fields.category) errors.category = 'Kategori seçin.';
  // A category with sub-categories only gathers them: the product belongs in one of them.
  else if (root?.children?.length && !root.children.some((child) => child.slug === fields.subcategory)) errors.category = `${root.name} altında bir alt kategori seçin.`;
  return errors;
}

const snapshotOf = (fields: Fields, groups: ColorGroup[]) => JSON.stringify({ fields, groups: groups.map(groupSnapshot) });

/**
 * Details and care are stored as text but edited as a list of choices: details one per line ("• …"), care
 * joined with " · ". Older free text that does not follow the format simply becomes one choice.
 */
const LIST_FORMAT = {
  details: { split: (text: string) => text.split('\n').map((line) => line.replace(/^[•\-]\s*/, '').trim()).filter(Boolean), join: (items: string[]) => items.map((item) => `• ${item}`).join('\n') },
  care: { split: (text: string) => text.split(' · ').map((item) => item.trim()).filter(Boolean), join: (items: string[]) => items.join(' · ') },
};

/** Preset options plus the ones the admin added (remembered in this browser) plus the value in use. */
function usePresetOptions(key: StorageKey, defaults: readonly string[], inUse: string[]) {
  const [stored, setStored] = useState<string[]>([...defaults]);
  useEffect(() => setStored(getPersistentOptions(key, defaults)), [key, defaults]);
  const options = [...new Set([...stored, ...inUse])].map((value) => ({ value }));
  const remember = (value: string) => {
    persistCustomOption(key, value);
    setStored(getPersistentOptions(key, defaults));
  };
  return { options, remember };
}

/**
 * The product editor page body (`/yonetim/urunler/yeni`, `/yonetim/urunler/[id]`): product details and the
 * colour × size table, whose colours carry their photos and video. Texts and the table are saved together
 * from the save bar; media is saved at once in "Renk medyası". Reports unsaved changes through
 * `onDirtyChange`; leaving the page with unsaved changes asks first.
 */
export function ProductEditorForm({
  productId,
  onSaved,
  onDirtyChange,
  onCreated,
  onProductLoaded,
}: {
  productId?: string;
  onSaved(): void;
  onDirtyChange?(dirty: boolean): void;
  onCreated?(productId: string): void;
  onProductLoaded?(product: AdminProduct): void;
}) {
  const [state, dispatch] = useReducer(editorReducer, { phase: 'editing', error: null });
  const [currentId, setCurrentId] = useState(productId ?? '');
  const [product, setProduct] = useState<AdminProduct | null>(null);
  const [loading, setLoading] = useState(Boolean(productId));
  const [loadError, setLoadError] = useState<string | null>(null);
  const [fields, setFields] = useState<Fields>(EMPTY_FIELDS);
  const [groups, setGroups] = useState<ColorGroup[]>([]);
  const [saved, setSaved] = useState<Saved>({ fields: EMPTY_FIELDS, groups: [] });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [variantErrors, setVariantErrors] = useState<VariantErrors>(NO_VARIANT_ERRORS);
  const [categories, setCategories] = useState<CategoryNode[] | null>(null);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [mediaFor, setMediaFor] = useState<MediaTarget | null>(null);
  const [previewKey, setPreviewKey] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const busy = state.phase !== 'editing';
  const { ask, dialog: confirmDialog } = useConfirm();
  const detailItems = LIST_FORMAT.details.split(fields.details);
  const careItems = LIST_FORMAT.care.split(fields.care);
  const detailPresets = usePresetOptions('pandiones_custom_details', DEFAULT_DETAIL_PRESETS, detailItems);
  const materialPresets = usePresetOptions('pandiones_custom_materials', DEFAULT_MATERIALS, fields.material ? [fields.material] : []);
  const carePresets = usePresetOptions('pandiones_custom_care', DEFAULT_CARE_INSTRUCTIONS, careItems);

  const dirty = snapshotOf(fields, groups) !== snapshotOf(saved.fields, saved.groups);
  useEffect(() => onDirtyChange?.(dirty), [dirty, onDirtyChange]);

  // Leaving the page with unsaved changes asks first (same as Ayarlar).
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 5000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  /** The product and the other colours of its family (each its own product), as table groups. */
  const hydrate = useCallback(async (next: AdminProduct) => {
    const siblingIds = (next.family?.products ?? []).filter((item) => item.id !== next.id).map((item) => item.id);
    const siblings = await Promise.all(
      siblingIds.map(async (id) => {
        try {
          return (await readResponse<{ product: AdminProduct }>(await fetch(`/api/admin/products/${id}`, { cache: 'no-store' }))).product;
        } catch {
          return null;
        }
      }),
    );
    const nextFields = fieldsOf(next);
    const nextGroups = [groupFromProduct(next, true), ...siblings.filter((item): item is AdminProduct => Boolean(item)).map((item) => groupFromProduct(item, false))];
    setProduct(next);
    setCurrentId(next.id);
    setFields(nextFields);
    setGroups(nextGroups);
    setSaved({ fields: nextFields, groups: nextGroups });
    if (siblings.some((item) => !item)) setNotice('Ailedeki bazı renkler yüklenemedi; sayfayı yenileyin.');
    onProductLoaded?.(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reloadProduct = useCallback(async (id: string) => {
    const data = await readResponse<{ product: AdminProduct }>(await fetch(`/api/admin/products/${id}`, { cache: 'no-store' }));
    await hydrate(data.product);
  }, [hydrate]);

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
  }, [reloadCategories, loadProduct]);

  const setField = (key: keyof Fields, value: string) => {
    setFields((current) => ({ ...current, [key]: value }));
    if (key in errors) setErrors((current) => ({ ...current, [key]: undefined }));
  };

  /** Saved media of one colour changed in "Renk medyası": only that colour's media (unsaved edits stay). */
  const applyMedia = useCallback((targetId: string, media: MediaSummary[]) => {
    const cover = media.find((item) => item.isCover);
    const patch = (group: ColorGroup) => (group.productId === targetId ? { ...group, media, image: cover ? cover.posterUrl || cover.url : undefined } : group);
    setGroups((current) => current.map(patch));
    setSaved((current) => ({ ...current, groups: current.groups.map(patch) }));
  }, []);

  /** A saved colour's ×: the product leaves the family (it is not deleted and keeps its page). */
  function unlinkColor(group: ColorGroup) {
    if (!group.productId) return;
    const targetId = group.productId;
    ask({
      title: `${group.color} rengi bu modelden çıkarılsın mı?`,
      message: 'Ürün silinmez; kendi sayfası, stoğu ve görselleriyle kalır, yalnız bu modelin renk seçeneklerinden çıkar. Tablodaki bu renge ait kaydedilmemiş değişiklikler kaybolur.',
      confirmLabel: 'Modelden çıkar',
      pendingLabel: 'Çıkarılıyor',
      onConfirm: async () => {
        await readResponse(await adminFetch('/api/admin/product-families', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId: targetId, familyId: null }) }));
        setGroups((current) => current.filter((item) => item.productId !== targetId));
        setSaved((current) => ({ ...current, groups: current.groups.filter((item) => item.productId !== targetId) }));
        setNotice(`${group.color} bu modelden çıkarıldı.`);
      },
    });
  }

  /** "Mevcut ürünü bağla": the product joins the family and appears as a saved colour. */
  function linkProduct(candidate: ColorCandidate) {
    if (!currentId) return;
    ask({
      title: `${candidate.name} – ${candidate.color} bu modelin rengi olarak bağlansın mı?`,
      message: 'Fiyatı, stoğu, görselleri ve sayfası kendi kaydında kalır. Başka bir modelin renkleri arasındaysa oradan çıkar. Tablodaki kaydedilmemiş değişiklikler korunur.',
      confirmLabel: 'Bağla',
      pendingLabel: 'Bağlanıyor',
      onConfirm: async () => {
        await readResponse(await adminFetch(`/api/admin/products/${currentId}/colors`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId: candidate.id }) }));
        const linked = (await readResponse<{ product: AdminProduct }>(await fetch(`/api/admin/products/${candidate.id}`, { cache: 'no-store' }))).product;
        const group = groupFromProduct(linked, false);
        setGroups((current) => [...current, group]);
        setSaved((current) => ({ ...current, groups: [...current.groups, group] }));
        setNotice(`${linked.color} bu modele bağlandı.`);
      },
    });
  }

  function askRegenerateSkus() {
    const count = skusToChange(groups, fields.name);
    if (!count) {
      setNotice('Stok kodları zaten ürün adına, renge ve bedene uygun.');
      return;
    }
    ask({
      title: `${count} stok kodu yeniden oluşturulsun mu?`,
      message: 'Kodlar ürün adı, renk ve bedenden yeniden türetilir; elle yazılanlar da değişir. Kaydetmeden önce Vazgeç ile geri alabilirsiniz.',
      confirmLabel: 'Yeniden oluştur',
      onConfirm: async () => changeGroups(regenerateSkus(groups, fields.name)),
    });
  }

  const changeGroups = (next: ColorGroup[]) => {
    setGroups(next);
    if (variantErrors.general || Object.keys(variantErrors.cells).length) setVariantErrors(validateGroups(next));
  };

  /** Back to the last saved state; media stays as it is (it is saved on its own). */
  function discard() {
    const mediaByKey = new Map(groups.map((group) => [group.key, group]));
    setFields(saved.fields);
    setGroups(saved.groups.map((group) => ({ ...group, media: mediaByKey.get(group.key)?.media ?? group.media, image: mediaByKey.get(group.key)?.image ?? group.image })));
    setErrors({});
    setVariantErrors(NO_VARIANT_ERRORS);
    dispatch({ type: 'SUCCESS' });
  }

  async function run(phase: Exclude<Phase, 'editing'>, action: () => Promise<void>, fallback: string, done?: string) {
    if (busy) return false;
    dispatch({ type: 'BEGIN', phase });
    try {
      await action();
      onSaved();
      dispatch({ type: 'SUCCESS' });
      if (done) setNotice(done);
      return true;
    } catch (error) {
      dispatch({ type: 'SAVE_FAILED', message: errorMessage(error, fallback) });
      return false;
    }
  }

  /**
   * Saves this product, then every other colour that changed, then creates the colours added here (as
   * drafts in the family). Colours are separate products, so a failure on one is reported by name and the
   * others stay saved. Files chosen for a colour before it existed are uploaded once it does.
   */
  function save() {
    const nextErrors = validate(fields, categories);
    const nextVariantErrors = validateGroups(groups);
    if (!groups.some((group) => group.isCurrent)) nextVariantErrors.general = 'Önce bu ürünün rengini ekleyin.';
    setErrors(nextErrors);
    setVariantErrors(nextVariantErrors);
    const first = (['name', 'category'] as const).find((key) => nextErrors[key]) ?? (nextVariantErrors.general || Object.keys(nextVariantErrors.cells).length ? 'variants' : null);
    if (first) {
      formRef.current?.querySelector<HTMLElement>(`[data-field="${first}"]`)?.focus();
      return;
    }
    const current = groups.find((group) => group.isCurrent) as ColorGroup;
    const isNew = !currentId;
    void run(
      'saving',
      async () => {
        const text = {
          name: fields.name,
          category: fields.category,
          subcategory: fields.subcategory || null,
          description: fields.description,
          details: fields.details,
          material: fields.material,
          care: fields.care,
        };
        const response = await adminFetch(currentId ? `/api/admin/products/${currentId}` : '/api/admin/products', {
          method: currentId ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...text, ...groupPayload(current) }),
        });
        const id = (await readResponse<{ product: AdminProduct }>(response)).product.id;
        const failures: string[] = [];
        if (current.staged?.length) failures.push(...(await uploadStaged(id, current)));
        const savedSnapshots = new Map(saved.groups.map((group) => [group.key, groupSnapshot(group)]));

        for (const group of groups.filter((item) => !item.isCurrent)) {
          try {
            let targetId = group.productId;
            if (!targetId) {
              const created = await readResponse<{ product: AdminProduct }>(
                await adminFetch(`/api/admin/products/${id}/colors`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ color: group.color.trim() }) }),
              );
              targetId = created.product.id;
              if (group.staged?.length) failures.push(...(await uploadStaged(targetId, group)));
            } else if (savedSnapshots.get(group.key) === groupSnapshot(group)) {
              continue;
            }
            const { color: _color, ...money } = groupPayload(group);
            await readResponse(await adminFetch(`/api/admin/products/${targetId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(money) }));
          } catch (error) {
            failures.push(`${group.color}: ${errorMessage(error, 'kaydedilemedi')}`);
          }
        }
        // With a failure the new product stays on this page (now saved) so the message is not lost in navigation.
        if (isNew && onCreated && !failures.length) onCreated(id);
        else await reloadProduct(id);
        if (failures.length) throw new Error(`Bu ürün kaydedildi; şu renkler kaydedilemedi: ${failures.join('; ')}`);
      },
      'Ürün kaydedilemedi.',
      isNew ? 'Taslak oluşturuldu.' : 'Değişiklikler kaydedildi.',
    );
  }

  /**
   * Uploads the files chosen for a colour before it was saved: photos in order (the first one is the cover),
   * then the video with its staged poster. Returns what failed, by colour and file name.
   */
  async function uploadStaged(targetId: string, group: ColorGroup): Promise<string[]> {
    const failures: string[] = [];
    const uploadedIds = new Map<string, string>();
    let hasCover = false;
    const send = async (item: StagedMedia, extra: Record<string, string>) => {
      const body = new FormData();
      body.set('file', item.file);
      body.set('role', item.role);
      const images = (group.staged ?? []).filter((entry) => entry.kind === 'IMAGE');
      body.set('alt', item.alt.trim() || autoAlt(fields.name, group.color, item.kind, item.role, images.indexOf(item) + 1));
      for (const [key, value] of Object.entries(extra)) body.set(key, value);
      return readResponse<{ media: { id: string } }>(await adminFetch(`/api/admin/products/${targetId}/media`, { method: 'POST', body }));
    };
    for (const item of group.staged ?? []) {
      try {
        if (item.kind === 'IMAGE') {
          const data = await send(item, { isCover: String(!hasCover) });
          uploadedIds.set(item.id, data.media.id);
          hasCover = true;
        } else {
          const poster = item.posterId ? uploadedIds.get(item.posterId) : undefined;
          if (!poster) throw new Error('posteri yüklenemedi');
          await send(item, { isCover: 'false', posterMediaId: poster });
        }
        if (item.preview) URL.revokeObjectURL(item.preview);
      } catch (error) {
        failures.push(`${group.color}, ${item.file.name}: ${errorMessage(error, 'yüklenemedi')}`);
      }
    }
    return failures;
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

  const currentGroup = groups.find((group) => group.isCurrent);
  const previewGroup = groups.find((group) => group.key === previewKey) ?? currentGroup;
  const preview = previewGroup?.image;
  const publishProblems = product
    ? publishErrorText(
        getPublishErrors({
          price: product.price,
          category: product.category,
          color: product.color,
          variants: product.variants,
          media: (currentGroup?.media ?? []).map(({ kind, url, posterUrl, isCover }) => ({ kind, url, posterUrl, isCover })),
        }),
      )
    : [];
  const otherColors = groups.filter((group) => !group.isCurrent && group.productId);
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
  const saveStatus =
    state.phase === 'saving'
      ? { tone: 'saving', text: groups.some((group) => group.staged?.length) ? 'Kaydediliyor, görseller yükleniyor…' : 'Kaydediliyor…' }
      : state.error
        ? { tone: 'error', text: 'Kaydedilemedi; ayrıntı sayfanın üstünde.' }
        : dirty
          ? { tone: 'idle', text: 'Kaydedilmemiş değişiklikler var.' }
          : !currentId
            ? { tone: 'idle', text: 'Taslak henüz oluşturulmadı.' }
            : { tone: 'idle', text: '' };

  return (
    <form
      ref={formRef}
      className="adm-form adm-editor"
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
      noValidate
    >
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
          <section className="adm-fieldset" aria-labelledby="pe-info">
            <div className="adm-fieldset__core">
              <h2 id="pe-info" className="adm-editor__heading">
                Ürün bilgileri
              </h2>
              <div className="adm-form__grid">
                <div className="adm-field">
                  <label htmlFor="pe-name">Ürün adı</label>
                  <input id="pe-name" maxLength={160} value={fields.name} onChange={(e) => setField('name', e.target.value)} {...errorProps('name')} />
                  {fieldError('name')}
                </div>
                <div className="adm-field">
                  <label htmlFor="pe-category">Kategori</label>
                  <div data-field="category" tabIndex={-1}>
                    <CategoryTreeSelect
                      id="pe-category"
                      categories={categories ?? []}
                      category={fields.category}
                      subcategory={fields.subcategory}
                      disabled={!categories}
                      invalid={Boolean(errors.category)}
                      describedBy={errors.category ? 'pe-category-error' : undefined}
                      placeholder={categories ? 'Kategori' : categoryError ? 'Kategoriler yüklenemedi' : 'Kategoriler yükleniyor'}
                      onChange={({ category, subcategory }) => {
                        setFields((current) => ({ ...current, category, subcategory }));
                        setErrors((current) => ({ ...current, category: undefined }));
                      }}
                    />
                  </div>
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
              </div>
              <div className="adm-field">
                <label htmlFor="pe-description">Açıklama</label>
                <textarea id="pe-description" rows={3} value={fields.description} onChange={(e) => setField('description', e.target.value)} />
              </div>
              <div className="adm-field">
                <label htmlFor="pe-details">Ürün detayları</label>
                <Combobox
                  id="pe-details"
                  label="Ürün detayları"
                  placeholder="Detay seçin ya da yazıp ekleyin"
                  multiple
                  options={detailPresets.options}
                  value={detailItems}
                  onChange={(items) => setField('details', LIST_FORMAT.details.join(items))}
                  allowCreate
                  createLabel={(value) => `“${value}” detayını ekle`}
                  onCreate={detailPresets.remember}
                  disabled={busy}
                />
              </div>
              <div className="adm-form__grid">
                <div className="adm-field">
                  <label htmlFor="pe-material">Materyal</label>
                  <Combobox
                    id="pe-material"
                    label="Materyal"
                    placeholder="Materyal seçin ya da yazın"
                    options={materialPresets.options}
                    value={fields.material}
                    onChange={(value) => setField('material', value)}
                    allowCreate
                    createLabel={(value) => `“${value}” materyalini kullan`}
                    onCreate={materialPresets.remember}
                    disabled={busy}
                  />
                  {fields.material ? (
                    <button type="button" className="adm-link adm-field__clear" onClick={() => setField('material', '')} disabled={busy}>
                      Materyali temizle
                    </button>
                  ) : null}
                </div>
                <div className="adm-field">
                  <label htmlFor="pe-care">Bakım bilgisi</label>
                  <Combobox
                    id="pe-care"
                    label="Bakım bilgisi"
                    placeholder="Bakım talimatı seçin"
                    multiple
                    options={carePresets.options}
                    value={careItems}
                    onChange={(items) => setField('care', LIST_FORMAT.care.join(items))}
                    allowCreate
                    createLabel={(value) => `“${value}” talimatını ekle`}
                    onCreate={carePresets.remember}
                    disabled={busy}
                  />
                </div>
              </div>
            </div>
          </section>

          <div className="adm-fieldset">
            <div className="adm-fieldset__core">
              <VariantMatrixSection
                productName={fields.name}
                category={fields.category}
                subcategory={fields.subcategory}
                groups={groups}
                onChange={changeGroups}
                errors={variantErrors}
                disabled={busy}
                onOpenMedia={(group, mediaId) => setMediaFor({ key: group.key, productId: group.productId, color: group.color, focusId: mediaId })}
                onUnlinkColor={unlinkColor}
                currentProductId={currentId || null}
                onLinkProduct={linkProduct}
                onRegenerateSkus={askRegenerateSkus}
              />
            </div>
          </div>
        </div>

        <aside className="adm-editor__side" aria-label="Önizleme ve yayın">
          <div className="adm-editor__preview">
            <span className="adm-editor__preview-image">{preview ? <img src={preview} alt="" /> : <span>Kapak görseli eklendiğinde önizleme burada görünür.</span>}</span>
            {groups.length > 1 ? (
              <div className="adm-editor__preview-colors" role="group" aria-label="Önizlenen renk">
                {groups.map((group) => (
                  <button
                    key={group.key}
                    type="button"
                    className="adm-editor__preview-color"
                    aria-pressed={group.key === previewGroup?.key}
                    onClick={() => setPreviewKey(group.key)}
                    title={group.color}
                  >
                    <span className="adm-vx__swatch" style={{ background: getColorSwatch(group.color) }} aria-hidden="true" />
                    <span className="visually-hidden">{group.color}</span>
                  </button>
                ))}
              </div>
            ) : null}
            <p className="adm-cell__main">{fields.name || 'Ürün adı'}</p>
            <p className="adm-cell__sub">
              {previewGroup?.color ? `${previewGroup.color}, ` : ''}
              {previewGroup?.price ? `${Number(previewGroup.price).toLocaleString('tr-TR')} ₺` : 'fiyat girilmedi'}
            </p>
          </div>
          <div className="adm-fieldset adm-editor__publish">
            <div className="adm-fieldset__core">
              <h2 className="adm-editor__heading adm-editor__heading--sm">Yayın durumu</h2>
              <span className={`adm-status adm-status--${product?.status === 'PUBLISHED' ? 'success' : 'warning'}`}>{product?.status === 'PUBLISHED' ? 'Yayında' : 'Taslak'}</span>
              {product?.status === 'PUBLISHED' ? (
                <>
                  <p className="adm-field__hint">{product.color} mağazada görünüyor.</p>
                  <button type="button" className="adm-btn adm-btn--block" disabled={busy} aria-busy={state.phase === 'publishing'} onClick={() => setPublished(false)}>
                    {state.phase === 'publishing' ? 'Kaydediliyor' : 'Taslağa al'}
                  </button>
                </>
              ) : (
                <>
                  <p className="adm-field__hint">{currentId ? 'Yalnız yönetici görebilir.' : 'Taslak oluşturulunca yayın eksikleri burada listelenir.'}</p>
                  {currentId && publishProblems.length ? (
                    <ul className="adm-editor__problems" aria-label={`${product?.color ?? 'Bu renk'} için yayın eksikleri`}>
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
              {otherColors.length ? (
                <p className="adm-field__hint">
                  Diğer renkler ({otherColors.map((group) => group.color).join(', ')}) kendi sayfalarından yayınlanır.
                </p>
              ) : null}
            </div>
          </div>
        </aside>
      </div>

      <div className="adm-savebar adm-editor__savebar" data-visible={!currentId || dirty || busy || Boolean(state.error)}>
        <p role="status" aria-live="polite" className={`adm-savebar__status adm-savebar__status--${saveStatus.tone}`}>
          {saveStatus.text}
        </p>
        <div className="adm-savebar__actions">
          <button type="button" className="adm-btn" disabled={!dirty || busy} onClick={discard}>
            Vazgeç
          </button>
          <button type="submit" className="adm-btn adm-btn--primary" disabled={busy || (Boolean(currentId) && !dirty)} aria-busy={state.phase === 'saving'}>
            {state.phase === 'saving' ? 'Kaydediliyor' : currentId ? 'Değişiklikleri kaydet' : 'Taslak oluştur'}
          </button>
        </div>
      </div>

      {mediaFor && !mediaFor.productId ? (
        <StagedMediaDialog
          productName={fields.name || 'Ürün'}
          color={mediaFor.color}
          staged={groups.find((group) => group.key === mediaFor.key)?.staged ?? []}
          onChange={(staged) => changeGroups(groups.map((group) => (group.key === mediaFor.key ? { ...group, staged } : group)))}
          onClose={() => setMediaFor(null)}
        />
      ) : null}
      {mediaFor?.productId ? (
        <VariantMediaDialog
          productId={mediaFor.productId}
          productName={fields.name || 'Ürün'}
          color={mediaFor.color}
          focusMediaId={mediaFor.focusId}
          onClose={() => setMediaFor(null)}
          onChanged={(media) => applyMedia(mediaFor.productId as string, media)}
        />
      ) : null}
      {confirmDialog}
    </form>
  );
}
