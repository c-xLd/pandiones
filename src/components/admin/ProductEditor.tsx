'use client';

import React, { useEffect, useReducer, useRef, useState } from 'react';
import type { Product, ProductMedia, ProductVariant } from '@/types';
import { TabLoading } from '@/app/yonetim/_components/TabState';

type Phase = 'editing' | 'saving' | 'uploading' | 'publishing' | 'mutating';
type EditorState = { phase: Phase; error: string | null };
type EditorAction = { type: 'BEGIN'; phase: Exclude<Phase, 'editing'> } | { type: 'SUCCESS' } | { type: 'SAVE_FAILED'; message: string };

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  if (action.type === 'BEGIN') return { phase: action.phase, error: null };
  if (action.type === 'SAVE_FAILED') return { phase: 'editing', error: action.message };
  return { phase: 'editing', error: null };
}

type AdminProduct = Product & {
  status: 'DRAFT' | 'PUBLISHED';
  familyId: string | null;
  media: ProductMedia[];
  variants: ProductVariant[];
};
type Family = { id: string; name: string; products: { id: string; color: string; category: string; status: string }[] };
type VariantDraft = { size: string; stock: string };

const initialVariants: VariantDraft[] = ['S', 'M', 'L', 'XL'].map((size) => ({ size, stock: '0' }));

async function readResponse<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.success === false) throw new Error(body.error || 'İşlem tamamlanamadı. Tekrar deneyin.');
  return body as T;
}

export default function ProductEditor({ productId, onSaved, onClose }: {
  productId?: string;
  onSaved(): void;
  onClose(): void;
}) {
  const [state, dispatch] = useReducer(editorReducer, { phase: 'editing', error: null });
  const [currentId, setCurrentId] = useState(productId ?? '');
  const [product, setProduct] = useState<AdminProduct | null>(null);
  const [loading, setLoading] = useState(!!productId);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [color, setColor] = useState('');
  const [category, setCategory] = useState('ic-giyim');
  const [subcategory, setSubcategory] = useState('');
  const [availableCategories, setAvailableCategories] = useState<{ id: string; slug: string; name: string; children?: { id: string; slug: string; name: string }[] }[]>([]);
  const [description, setDescription] = useState('');
  const [details, setDetails] = useState('');
  const [material, setMaterial] = useState('');
  const [care, setCare] = useState('');
  const [variants, setVariants] = useState<VariantDraft[]>(initialVariants);
  const [families, setFamilies] = useState<Family[]>([]);
  const [newFamilyName, setNewFamilyName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [role, setRole] = useState<'FLATLAY' | 'MODEL' | 'DETAIL'>('FLATLAY');
  const [alt, setAlt] = useState('');
  const [posterMediaId, setPosterMediaId] = useState('');
  const [isCover, setIsCover] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);
  const busy = state.phase !== 'editing';

  function hydrate(next: AdminProduct) {
    setProduct(next);
    setCurrentId(next.id);
    setName(next.name);
    setPrice(String(next.price));
    setColor(next.color);
    setCategory(next.category);
    setSubcategory((next as any).subcategory || '');
    setDescription(next.description);
    setDetails(next.details ?? '');
    setMaterial(next.material ?? '');
    setCare(next.care ?? '');
    setVariants(next.variants.map((variant) => ({ size: variant.size, stock: String(variant.stock) })));
  }

  async function reloadProduct(id: string) {
    const data = await readResponse<{ product: AdminProduct }>(await fetch(`/api/admin/products/${id}`, { cache: 'no-store' }));
    hydrate(data.product);
  }

  async function reloadFamilies() {
    const data = await readResponse<{ families: Family[] }>(await fetch('/api/admin/product-families', { cache: 'no-store' }));
    setFamilies(data.families);
  }

  async function reloadCategories() {
    try {
      const res = await fetch('/api/admin/categories', { cache: 'no-store' });
      const data = await res.json();
      if (data?.categories && Array.isArray(data.categories)) {
        setAvailableCategories(data.categories);
      }
    } catch {
      // Fallback
    }
  }

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, []);

  useEffect(() => {
    reloadCategories();
  }, []);

  useEffect(() => {
    if (!loading) firstInputRef.current?.focus();
  }, [loading]);

  useEffect(() => {
    let cancelled = false;
    if (productId) {
      reloadProduct(productId).catch((error) => {
        if (!cancelled) dispatch({ type: 'SAVE_FAILED', message: error instanceof Error ? error.message : 'Ürün yüklenemedi.' });
      }).finally(() => { if (!cancelled) setLoading(false); });
    }
    reloadFamilies().catch((error) => {
      if (!cancelled) dispatch({ type: 'SAVE_FAILED', message: error instanceof Error ? error.message : 'Renk aileleri yüklenemedi.' });
    });
    return () => { cancelled = true; };
  }, [productId]);

  function onDialogKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') { event.preventDefault(); onClose(); return; }
    if (event.key !== 'Tab') return;
    const controls = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])') ?? []);
    if (!controls.length) return;
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }

  async function saveDraft(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    const parsedPrice = Number(price);
    const parsedVariants = variants.map((variant) => ({ size: variant.size.trim(), stock: Number(variant.stock) }));
    if (!name.trim() || !color.trim() || !Number.isFinite(parsedPrice) || parsedPrice <= 0 ||
      parsedVariants.some((variant) => !variant.size || !Number.isInteger(variant.stock) || variant.stock < 0)) {
      dispatch({ type: 'SAVE_FAILED', message: 'Ad, renk, pozitif fiyat ve beden stoklarını kontrol edin.' });
      return;
    }
    dispatch({ type: 'BEGIN', phase: 'saving' });
    try {
      const response = await fetch(currentId ? `/api/admin/products/${currentId}` : '/api/admin/products', {
        method: currentId ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, price: parsedPrice, color, category, subcategory: subcategory || null, description, details, material, care, variants: parsedVariants }),
      });
      const data = await readResponse<{ product: AdminProduct }>(response);
      await reloadProduct(data.product.id);
      onSaved();
      dispatch({ type: 'SUCCESS' });
    } catch (error) { dispatch({ type: 'SAVE_FAILED', message: error instanceof Error ? error.message : 'Taslak kaydedilemedi.' }); }
  }

  async function uploadMedia(event: React.FormEvent) {
    event.preventDefault();
    if (!currentId || !file || busy) return;
    const limit = file.type.startsWith('video/') ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > limit) { dispatch({ type: 'SAVE_FAILED', message: 'Dosya boyutu sınırı aşıyor (görsel 10 MB, video 50 MB).' }); return; }
    if (file.type.startsWith('video/') && !posterMediaId) { dispatch({ type: 'SAVE_FAILED', message: 'Video için aynı ürüne ait bir poster görseli seçin.' }); return; }
    dispatch({ type: 'BEGIN', phase: 'uploading' });
    try {
      const body = new FormData();
      body.set('file', file); body.set('role', role); body.set('alt', alt);
      body.set('isCover', String(isCover));
      if (posterMediaId) body.set('posterMediaId', posterMediaId);
      await readResponse(await fetch(`/api/admin/products/${currentId}/media`, { method: 'POST', body }));
      await reloadProduct(currentId);
      setFile(null); setAlt(''); setPosterMediaId(''); setIsCover(false);
      onSaved(); dispatch({ type: 'SUCCESS' });
    } catch (error) { dispatch({ type: 'SAVE_FAILED', message: error instanceof Error ? error.message : 'Medya yüklenemedi.' }); }
  }

  async function mutateMedia(body: { action: 'cover' | 'order'; mediaId: string; position?: number } | { mediaId: string; delete: true }) {
    if (!currentId || busy) return;
    dispatch({ type: 'BEGIN', phase: 'mutating' });
    try {
      await readResponse(await fetch(`/api/admin/products/${currentId}/media`, {
        method: 'delete' in body ? 'DELETE' : 'PATCH',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      }));
      await reloadProduct(currentId);
      onSaved(); dispatch({ type: 'SUCCESS' });
    } catch (error) { dispatch({ type: 'SAVE_FAILED', message: error instanceof Error ? error.message : 'Medya düzenlenemedi.' }); }
  }

  async function linkFamily(familyId: string | null) {
    if (!currentId || busy) return;
    dispatch({ type: 'BEGIN', phase: 'mutating' });
    try {
      await readResponse(await fetch('/api/admin/product-families', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: currentId, familyId }),
      }));
      await reloadProduct(currentId);
      await reloadFamilies();
      onSaved(); dispatch({ type: 'SUCCESS' });
    } catch (error) { dispatch({ type: 'SAVE_FAILED', message: error instanceof Error ? error.message : 'Renk ailesi bağlanamadı.' }); }
  }

  async function createAndLinkFamily() {
    if (!currentId || !newFamilyName.trim() || busy) return;
    dispatch({ type: 'BEGIN', phase: 'mutating' });
    try {
      const data = await readResponse<{ family: Family }>(await fetch('/api/admin/product-families', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newFamilyName }),
      }));
      await readResponse(await fetch('/api/admin/product-families', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId: currentId, familyId: data.family.id }),
      }));
      await reloadProduct(currentId); await reloadFamilies();
      setNewFamilyName(''); onSaved(); dispatch({ type: 'SUCCESS' });
    } catch (error) { dispatch({ type: 'SAVE_FAILED', message: error instanceof Error ? error.message : 'Renk ailesi oluşturulamadı.' }); }
  }

  async function publish() {
    if (!currentId || busy) return;
    dispatch({ type: 'BEGIN', phase: 'publishing' });
    try {
      await readResponse(await fetch(`/api/admin/products/${currentId}/publish`, { method: 'POST' }));
      await reloadProduct(currentId); onSaved(); dispatch({ type: 'SUCCESS' });
    } catch (error) { dispatch({ type: 'SAVE_FAILED', message: error instanceof Error ? error.message : 'Ürün yayınlanamadı.' }); }
  }

  const cover = product?.media.find((item) => item.isCover);
  const preview = cover?.posterUrl || cover?.url || product?.image;

  return (
    <div className="modal-overlay product-editor-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div ref={dialogRef} className="modal-content product-editor" role="dialog" aria-modal="true" aria-labelledby="product-editor-title" onKeyDown={onDialogKeyDown}>
        <div className="product-editor-head">
          <div>
            <p className="product-editor-kicker">KOLEKSİYON YÖNETİMİ</p>
            <h2 id="product-editor-title">{currentId ? 'Parçayı Düzenle' : 'Yeni Parça'}</h2>
            <p>{product?.status === 'PUBLISHED' ? 'Yayında' : 'Taslak'} · Gerçek medya ve renkleri bu ürüne bağlayın.</p>
          </div>
          <button type="button" className="product-editor-close" onClick={onClose} aria-label="Düzenleyiciyi kapat">×</button>
        </div>

        {state.error && <p className="product-editor-error" role="alert">{state.error} Form açık; düzeltip tekrar deneyebilirsiniz.</p>}
        {loading ? <TabLoading label="Ürün yükleniyor" /> : <div className="product-editor-grid">
          <div className="product-editor-main">
            <form onSubmit={saveDraft} className="product-editor-section">
              <div className="product-editor-section-head"><span>01</span><h3>Ürün bilgileri</h3></div>
              <div className="product-editor-fields">
                <label>Ürün adı<input ref={firstInputRef} required maxLength={160} value={name} onChange={(event) => setName(event.target.value)} /></label>
                <label>Fiyat (₺)<input required type="number" min="0.01" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} /></label>
                <label>Renk<input required maxLength={80} value={color} onChange={(event) => setColor(event.target.value)} /></label>
                <label>Kategori
                  <select
                    value={category}
                    onChange={(event) => {
                      setCategory(event.target.value);
                      setSubcategory('');
                    }}
                  >
                    {availableCategories.length > 0 ? (
                      availableCategories.map((c) => (
                        <option key={c.id} value={c.slug}>
                          {c.name}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="ic-giyim">İç Giyim</option>
                        <option value="ev-giyim">Ev Giyim</option>
                      </>
                    )}
                  </select>
                </label>
                <label>Alt Kategori (Opsiyonel)
                  <select
                    value={subcategory}
                    onChange={(event) => setSubcategory(event.target.value)}
                  >
                    <option value="">Seçiniz (Tümü)</option>
                    {availableCategories
                      .find((c) => c.slug === category)
                      ?.children?.map((sub) => (
                        <option key={sub.id} value={sub.slug}>
                          {sub.name}
                        </option>
                      ))}
                  </select>
                </label>
                <label className="product-editor-wide">Açıklama<textarea rows={3} value={description} onChange={(event) => setDescription(event.target.value)} /></label>
                <label>Ürün detayları<textarea rows={2} value={details} onChange={(event) => setDetails(event.target.value)} /></label>
                <label>Materyal<textarea rows={2} value={material} onChange={(event) => setMaterial(event.target.value)} /></label>
                <label className="product-editor-wide">Bakım bilgisi<textarea rows={2} value={care} onChange={(event) => setCare(event.target.value)} /></label>
              </div>
              <div className="product-editor-variants">
                <h4>Beden stokları</h4>
                {variants.map((variant, index) => <div className="product-editor-variant" key={index}>
                  <label>Beden<input aria-label={`Beden ${index + 1}`} value={variant.size} onChange={(event) => setVariants((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, size: event.target.value } : item))} /></label>
                  <label>Stok<input aria-label={`${variant.size || index + 1} stok`} type="number" min="0" step="1" value={variant.stock} onChange={(event) => setVariants((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, stock: event.target.value } : item))} /></label>
                  <button type="button" onClick={() => setVariants((items) => items.filter((_, itemIndex) => itemIndex !== index))} aria-label={`${variant.size} bedenini kaldır`}>Kaldır</button>
                </div>)}
                <button type="button" className="product-editor-text-button" onClick={() => setVariants((items) => [...items, { size: '', stock: '0' }])}>+ Beden ekle</button>
              </div>
              <button type="submit" className="product-editor-primary" disabled={busy}>{state.phase === 'saving' ? 'Kaydediliyor…' : currentId ? 'Değişiklikleri kaydet' : 'Taslak oluştur'}</button>
            </form>

            <section className="product-editor-section" aria-labelledby="editor-media-title">
              <div className="product-editor-section-head"><span>02</span><h3 id="editor-media-title">Ürün medyası</h3></div>
              <p>Düz çekim, manken, detay ve video aynı ürüne ait olmalı. Görsel en çok 10 MB, video en çok 50 MB.</p>
              {!currentId && <p className="product-editor-hint">Önce taslağı oluşturun; sonra bu ürüne medya yükleyebilirsiniz.</p>}
              {product?.media.length ? <ol className="product-editor-media-list">{product.media.map((media, index) => <li key={media.id}>
                <div className="product-editor-media-thumb">{media.kind === 'VIDEO' ? <video poster={media.posterUrl || undefined} preload="none" muted playsInline aria-label={media.alt} /> : <img src={media.url} alt={media.alt} />}</div>
                <div className="product-editor-media-meta"><strong>{media.role === 'FLATLAY' ? 'Düz çekim' : media.role === 'MODEL' ? 'Manken' : 'Detay'}</strong><span>{media.kind === 'VIDEO' ? 'Video' : 'Fotoğraf'} · {media.alt}</span>{media.isCover && <em>Kapak</em>}</div>
                <div className="product-editor-media-actions">
                  <button type="button" disabled={busy || index === 0} onClick={() => mutateMedia({ action: 'order', mediaId: media.id, position: index - 1 })} aria-label={`${media.alt} öne taşı`}>↑</button>
                  <button type="button" disabled={busy || index === product.media.length - 1} onClick={() => mutateMedia({ action: 'order', mediaId: media.id, position: index + 1 })} aria-label={`${media.alt} arkaya taşı`}>↓</button>
                  {!media.isCover && <button type="button" disabled={busy} onClick={() => mutateMedia({ action: 'cover', mediaId: media.id })}>Kapak yap</button>}
                  <button type="button" disabled={busy} onClick={() => { if (window.confirm('Bu medyayı silmek istiyor musunuz?')) mutateMedia({ mediaId: media.id, delete: true }); }}>Sil</button>
                </div>
              </li>)}</ol> : currentId && <p className="product-editor-hint">Henüz medya yok. Yayın için gerçek bir kapak yükleyin.</p>}
              <form onSubmit={uploadMedia} className="product-editor-upload">
                <label>Fotoğraf veya video<input type="file" accept=".jpg,.jpeg,.png,.webp,.mp4,.webm" disabled={!currentId || busy} onChange={(event) => setFile(event.target.files?.[0] ?? null)} /></label>
                <label>Çekim türü<select value={role} disabled={!currentId || busy} onChange={(event) => setRole(event.target.value as typeof role)}><option value="FLATLAY">Düz çekim</option><option value="MODEL">Manken</option><option value="DETAIL">Detay</option></select></label>
                <label>Görsel açıklaması<input value={alt} maxLength={240} disabled={!currentId || busy} onChange={(event) => setAlt(event.target.value)} placeholder="Ürünü ve açıyı tanımlayın" /></label>
                {file?.type.startsWith('video/') && <label>Video posteri<select value={posterMediaId} disabled={!currentId || busy} onChange={(event) => setPosterMediaId(event.target.value)}><option value="">Poster seçin</option>{product?.media.filter((item) => item.kind === 'IMAGE').map((item) => <option key={item.id} value={item.id}>{item.alt}</option>)}</select></label>}
                <label className="product-editor-check"><input type="checkbox" checked={isCover} disabled={!currentId || busy} onChange={(event) => setIsCover(event.target.checked)} /> Kapak olarak kullan</label>
                <button type="submit" disabled={!currentId || !file || !alt.trim() || busy}>{state.phase === 'uploading' ? 'Yükleniyor…' : 'Medyayı yükle'}</button>
              </form>
            </section>

            <section className="product-editor-section" aria-labelledby="editor-family-title">
              <div className="product-editor-section-head"><span>03</span><h3 id="editor-family-title">Renk ailesi</h3></div>
              <p>Aynı modelin başka renklerini bağlayın. Her renk kendi ürün sayfası ve stok bilgisiyle kalır.</p>
              <label>Mevcut aile<select value={product?.familyId ?? ''} disabled={!currentId || busy} onChange={(event) => linkFamily(event.target.value || null)}><option value="">Aile seçilmedi</option>{families.filter((family) => !family.products.length || family.products.some((item) => item.category === category)).map((family) => <option key={family.id} value={family.id}>{family.name} ({family.products.map((item) => item.color).join(', ') || 'boş'})</option>)}</select></label>
              <div className="product-editor-family-new"><label>Yeni aile adı<input value={newFamilyName} disabled={!currentId || busy} onChange={(event) => setNewFamilyName(event.target.value)} placeholder="Örn. Crop 01" /></label><button type="button" disabled={!currentId || !newFamilyName.trim() || busy} onClick={createAndLinkFamily}>Aile oluştur ve bağla</button></div>
            </section>
          </div>

          <aside className="product-editor-side">
            <div className="product-editor-preview">
              <div className="product-editor-preview-image">{preview ? <img src={preview} alt={name || 'Ürün önizlemesi'} /> : <span>Kapak görseli eklendiğinde önizleme burada görünür.</span>}</div>
              <p>{name || 'Ürün adı'}</p><strong>{price ? `${Number(price).toLocaleString('tr-TR')} ₺` : 'Fiyat'}</strong>
              <small>Gerçek koleksiyon kartı oranı · 2:3</small>
            </div>
            <div className="product-editor-publish"><h3>Yayın durumu</h3><p>{product?.status === 'PUBLISHED' ? 'Bu ürün mağazada yayında.' : 'Yalnız yönetici görebilir. Kapak ve zorunlu alanlar tamamlanınca yayınlayın.'}</p><button type="button" disabled={!currentId || busy || product?.status === 'PUBLISHED'} onClick={publish}>{state.phase === 'publishing' ? 'Yayınlanıyor…' : 'Yayınla'}</button></div>
          </aside>
        </div>}
      </div>
    </div>
  );
}
