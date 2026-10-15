'use client';

import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import Dialog from '@/components/ui/Dialog';
import { adminFetch } from '../../_lib/admin-fetch';
import { autoAlt, mediaSummaries, type MediaSummary } from '../../_lib/variant-model';
import { MEDIA_ROLES, type MediaRole } from '@/lib/products/media-domain';

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const VIDEO_TYPES = ['video/mp4', 'video/webm'];
const IMAGE_LIMIT = 10 * 1024 * 1024;
const VIDEO_LIMIT = 50 * 1024 * 1024;

export const ROLE_LABEL: Record<MediaRole, string> = {
  MODEL_FRONT: 'Manken (Ön)',
  MODEL_BACK: 'Manken (Arka)',
  MODEL_SIDE: 'Manken (Yan)',
  MODEL_WALK: 'Manken (Hareketli / Yürüyüş)',
  MODEL: 'Manken (Genel)',
  FLATLAY: 'Düz Çekim',
  PACKSHOT: 'Stüdyo Dekupe / Packshot',
  HANGER: 'Askı Çekimi',
  FABRIC_DETAIL: 'Kumaş & Doku Detayı',
  STITCH_DETAIL: 'Dikiş & İşçilik Detayı',
  CLOSEUP: 'Yakın Plan Detay',
  STYLING: 'Stil / Kombin Görünümü',
  DETAIL: 'Detay',
};
export type Role = MediaRole;
export const ROLES = MEDIA_ROLES;

/** `alt` built from name, colour and shot type at upload (`n` = its place among the colour's photos). */
type Upload = { id: string; file: File; preview: string | null; role: Role; n: number; state: 'waiting' | 'uploading' | 'done' | 'error'; message?: string };
type VideoDraft = { file: File; role: Role; posterId: string };
type ItemStatus = { tone: 'saving' | 'saved' | 'error'; text: string };
type Loaded = { product: { media: Parameters<typeof mediaSummaries>[0] } };

async function readJson<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.success === false) throw new Error(body.error || 'İşlem tamamlanamadı. Tekrar deneyin.');
  return body as T;
}

const messageOf = (error: unknown, fallback: string) => (error instanceof Error && error.message ? error.message : fallback);

/**
 * "Renk medyası": the photos and the single video of one colour (one product). Every change is saved at
 * once — shot type, description, order, cover, poster, delete — and reported per item. New photos are
 * checked here (type, 10 MB) and again on the server, each with its own shot type and description, and
 * uploaded one by one with their own status.
 */
export default function VariantMediaDialog({
  productId,
  productName,
  color,
  focusMediaId,
  onClose,
  onChanged,
}: {
  productId: string;
  productName: string;
  color: string;
  /** The strip item that opened the dialog: focused once the list is loaded. */
  focusMediaId?: string;
  onClose(): void;
  /** The colour's media after every saved change, in order. */
  onChanged(media: MediaSummary[]): void;
}) {
  const uid = useId();
  const [media, setMedia] = useState<MediaSummary[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [status, setStatus] = useState<Record<string, ItemStatus>>({});
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [video, setVideo] = useState<VideoDraft | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const itemRefs = useRef(new Map<string, HTMLLIElement>());
  const focused = useRef(false);
  const previews = useRef<string[]>([]);
  const busy = pending !== null;

  const apply = useCallback(
    (data: Loaded) => {
      const next = mediaSummaries(data.product.media);
      setMedia(next);
      onChanged(next);
    },
    [onChanged],
  );

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const data = await readJson<Loaded>(await fetch(`/api/admin/products/${productId}`, { cache: 'no-store' }));
      const next = mediaSummaries(data.product.media);
      setMedia(next);
    } catch (error) {
      setLoadError(messageOf(error, 'Görseller yüklenemedi.'));
    }
  }, [productId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!media || focused.current || !focusMediaId) return;
    focused.current = true;
    itemRefs.current.get(focusMediaId)?.focus();
  }, [media, focusMediaId]);

  // Object URLs of the queued previews are released when the dialog goes away.
  useEffect(() => () => previews.current.forEach((url) => URL.revokeObjectURL(url)), []);

  const images = (media ?? []).filter((item) => item.kind === 'IMAGE');
  const currentVideo = (media ?? []).find((item) => item.kind === 'VIDEO');
  const coverImage = images.find((item) => item.isCover) ?? images[0];

  /** One saved change: blocks the others while it runs, reports on the item (or the dialog). */
  async function mutate(key: string, itemId: string | null, request: () => Promise<Response>, done: string, fallback: string) {
    if (busy) return false;
    setPending(key);
    setNotice(null);
    if (itemId) setStatus((current) => ({ ...current, [itemId]: { tone: 'saving', text: 'Kaydediliyor…' } }));
    try {
      apply(await readJson<Loaded>(await request()));
      if (itemId) setStatus((current) => ({ ...current, [itemId]: { tone: 'saved', text: done } }));
      else setNotice({ tone: 'success', text: done });
      return true;
    } catch (error) {
      const text = messageOf(error, fallback);
      if (itemId) setStatus((current) => ({ ...current, [itemId]: { tone: 'error', text } }));
      else setNotice({ tone: 'error', text });
      return false;
    } finally {
      setPending(null);
    }
  }

  const patch = (body: Record<string, unknown>) => () =>
    adminFetch(`/api/admin/products/${productId}/media`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

  async function remove(item: MediaSummary) {
    const ok = await mutate(
      `delete:${item.id}`,
      null,
      () => adminFetch(`/api/admin/products/${productId}/media`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mediaId: item.id }) }),
      item.kind === 'VIDEO' ? 'Video silindi.' : 'Görsel silindi.',
      'Silinemedi.',
    );
    if (ok) setConfirmDelete(null);
  }

  function addFiles(list: FileList | File[]) {
    let count = images.length + uploads.filter((item) => item.state !== 'error').length;
    const next: Upload[] = [];
    for (const file of Array.from(list)) {
      const problem = !IMAGE_TYPES.includes(file.type) ? 'Yalnız PNG, JPG veya WebP. Video için aşağıdaki video alanını kullanın.' : file.size > IMAGE_LIMIT ? 'En çok 10 MB.' : undefined;
      const role = next.at(-1)?.role ?? uploads.at(-1)?.role ?? 'MODEL_FRONT';
      const preview = problem ? null : URL.createObjectURL(file);
      if (preview) previews.current.push(preview);
      if (!problem) count += 1;
      next.push({ id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 7)}`, file, preview, role, n: count, state: problem ? 'error' : 'waiting', message: problem });
    }
    setUploads((current) => [...current, ...next]);
    setNotice(null);
  }

  const updateUpload = (id: string, change: Partial<Upload>) => setUploads((current) => current.map((item) => (item.id === id ? { ...item, ...change } : item)));

  function moveUpload(from: number, to: number) {
    if (to < 0 || to >= uploads.length) return;
    setUploads((current) => {
      const next = [...current];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  }

  function dropUpload(item: Upload) {
    if (item.preview) URL.revokeObjectURL(item.preview);
    setUploads((current) => current.filter((entry) => entry.id !== item.id));
  }

  async function uploadAll() {
    if (busy) return;
    const queue = uploads.filter((item) => item.state === 'waiting');
    setPending('upload');
    setNotice(null);
    let uploaded = 0;
    let hasCover = (media ?? []).some((item) => item.isCover);
    for (const item of queue) {
      updateUpload(item.id, { state: 'uploading', message: undefined });
      try {
        const body = new FormData();
        body.set('file', item.file);
        body.set('role', item.role);
        body.set('alt', autoAlt(productName, color, 'IMAGE', item.role, item.n));
        body.set('isCover', String(!hasCover));
        const data = await readJson<Loaded>(await adminFetch(`/api/admin/products/${productId}/media`, { method: 'POST', body }));
        apply(data);
        hasCover = true;
        uploaded += 1;
        updateUpload(item.id, { state: 'done' });
      } catch (error) {
        updateUpload(item.id, { state: 'error', message: messageOf(error, 'Yüklenemedi.') });
      }
    }
    setPending(null);
    if (uploaded) setNotice({ tone: 'success', text: `${uploaded} görsel yüklendi.` });
  }

  function chooseVideo(file: File | undefined) {
    setVideoError(null);
    if (!file) return setVideo(null);
    if (!VIDEO_TYPES.includes(file.type)) return setVideoError('Yalnız MP4 veya WebM.');
    if (file.size > VIDEO_LIMIT) return setVideoError('En çok 50 MB.');
    setVideo({ file, role: 'MODEL_FRONT', posterId: coverImage?.id ?? '' });
  }

  async function uploadVideo() {
    if (!video || busy) return;
    if (!video.posterId) return setVideoError('Poster olarak bir görsel seçin.');
    setPending('video');
    setVideoError(null);
    try {
      const body = new FormData();
      body.set('file', video.file);
      body.set('role', video.role);
      body.set('alt', autoAlt(productName, color, 'VIDEO', video.role, 1));
      body.set('posterMediaId', video.posterId);
      body.set('isCover', 'false');
      apply(await readJson<Loaded>(await adminFetch(`/api/admin/products/${productId}/media`, { method: 'POST', body })));
      setVideo(null);
      setNotice({ tone: 'success', text: 'Video yüklendi.' });
    } catch (error) {
      setVideoError(messageOf(error, 'Video yüklenemedi.'));
    } finally {
      setPending(null);
    }
  }

  const waiting = uploads.filter((item) => item.state === 'waiting').length;
  const uploading = pending === 'upload' || pending === 'video';

  return (
    <Dialog open onClose={() => !uploading && onClose()} title={`${color} — medya`} eyebrow={productName} className="adm-dialog adm-vmedia" size="lg">
      <p className="adm-field__hint">Değişiklikler hemen kaydedilir. Görseller sırasıyla ürün sayfasındaki galeride görünür; kapak, listelerde ve renk seçiminde kullanılır.</p>

      <div className="adm-notice-slot" aria-live="polite">
        {notice ? (
          <p className={`adm-notice adm-notice--${notice.tone}`} role={notice.tone === 'error' ? 'alert' : undefined}>
            <span>{notice.text}</span>
          </p>
        ) : null}
      </div>

      <section className="adm-vmedia__block" aria-labelledby={`${uid}-saved`}>
        <h3 id={`${uid}-saved`} className="adm-vmedia__title">
          Yüklü medya {media ? <span className="adm-vmedia__count">{images.length} görsel{currentVideo ? ', 1 video' : ''}</span> : null}
        </h3>
        {loadError ? (
          <p className="adm-field-error" role="alert">
            {loadError}{' '}
            <button type="button" className="adm-link" onClick={load}>
              Tekrar dene
            </button>
          </p>
        ) : !media ? (
          <p className="adm-field__hint" role="status">
            Görseller yükleniyor…
          </p>
        ) : media.length ? (
          <ol className="adm-vmedia__grid">
            {media.map((item, index) => {
              const itemStatus = status[item.id];
              const label = item.alt || `${index + 1}. medya`;
              return (
                <li
                  key={item.id}
                  ref={(node) => {
                    if (node) itemRefs.current.set(item.id, node);
                    else itemRefs.current.delete(item.id);
                  }}
                  tabIndex={-1}
                  className={`adm-vmedia__item${item.isCover ? ' is-cover' : ''}`}
                  aria-label={`${index + 1}. ${item.kind === 'VIDEO' ? 'video' : 'görsel'}${item.isCover ? ', kapak' : ''}`}
                >
                  <span className="adm-vmedia__thumb">
                    {item.kind === 'VIDEO' ? (
                      <>
                        <video src={item.url} poster={item.posterUrl || undefined} preload="none" muted playsInline controls aria-label={label} />
                        <span className="adm-vmedia__badge">Video</span>
                      </>
                    ) : (
                      <img src={item.url} alt={item.alt} loading="lazy" />
                    )}
                    {item.isCover ? <span className="adm-vmedia__badge adm-vmedia__badge--cover">Kapak Görseli</span> : null}
                  </span>

                  <div className="adm-vmedia__fields">
                    <div className="adm-field">
                      <label htmlFor={`${uid}-role-${item.id}`}>Çekim türü</label>
                      <select
                        id={`${uid}-role-${item.id}`}
                        value={item.role}
                        disabled={busy}
                        onChange={(event) => {
                          const nextRole = event.target.value as Role;
                          const nextAlt = autoAlt(productName, color, item.kind, nextRole, index + 1);
                          void mutate(
                            `meta:${item.id}`,
                            item.id,
                            patch({ action: 'meta', mediaId: item.id, role: nextRole, alt: nextAlt }),
                            'Çekim türü kaydedildi.',
                            'Çekim türü kaydedilemedi.',
                          );
                        }}
                      >
                        {ROLES.map((role) => (
                          <option key={role} value={role}>
                            {ROLE_LABEL[role]}
                          </option>
                        ))}
                      </select>
                    </div>
                    {item.kind === 'VIDEO' ? (
                      <div className="adm-field">
                        <label htmlFor={`${uid}-poster-${item.id}`}>Video posteri</label>
                        <select
                          id={`${uid}-poster-${item.id}`}
                          value={images.find((image) => image.url === item.posterUrl)?.id ?? ''}
                          disabled={busy || !images.length}
                          onChange={(event) => void mutate(`poster:${item.id}`, item.id, patch({ action: 'poster', mediaId: item.id, posterMediaId: event.target.value }), 'Poster değişti.', 'Poster değiştirilemedi.')}
                        >
                          {!images.some((image) => image.url === item.posterUrl) ? <option value="">Poster seçin</option> : null}
                          {images.map((image, imageIndex) => (
                            <option key={image.id} value={image.id}>
                              {imageIndex + 1}. {ROLE_LABEL[image.role]}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : null}
                    <p className={`adm-vmedia__status adm-vmedia__status--${itemStatus?.tone ?? 'idle'}`} role={itemStatus?.tone === 'error' ? 'alert' : 'status'}>
                      {itemStatus?.text ?? ''}
                    </p>
                  </div>

                  <div className="adm-vmedia__actions">
                    <button
                      type="button"
                      className="adm-icon-btn"
                      disabled={busy || index === 0}
                      onClick={() => void mutate('order', null, patch({ action: 'order', mediaId: item.id, position: index - 1 }), 'Sıra güncellendi.', 'Sıra değiştirilemedi.')}
                      aria-label={`${label}: yukarı taşı`}
                      title="Yukarı taşı"
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="m6 15 6-6 6 6" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      className="adm-icon-btn"
                      disabled={busy || index === media.length - 1}
                      onClick={() => void mutate('order', null, patch({ action: 'order', mediaId: item.id, position: index + 1 }), 'Sıra güncellendi.', 'Sıra değiştirilemedi.')}
                      aria-label={`${label}: aşağı taşı`}
                      title="Aşağı taşı"
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </button>
                    {item.isCover ? (
                      <span className="adm-vmedia__cover-tag" aria-label="Geçerli kapak görseli">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                        Kapak Görseli
                      </span>
                    ) : (item.kind === 'IMAGE' || item.posterUrl) ? (
                      <button
                        type="button"
                        className="adm-btn adm-btn--sm adm-btn--quiet adm-btn--make-cover"
                        disabled={busy}
                        onClick={() => void mutate('cover', null, patch({ action: 'cover', mediaId: item.id }), 'Kapak yapıldı.', 'Kapak değiştirilemedi.')}
                        title="Bu görseli kapak yap"
                      >
                        Kapak Yap
                      </button>
                    ) : null}
                    {confirmDelete === item.id ? (
                      <span className="adm-confirm-inline">
                        <button type="button" className="adm-btn adm-btn--sm adm-btn--danger" disabled={busy} aria-busy={pending === `delete:${item.id}`} onClick={() => void remove(item)}>
                          {pending === `delete:${item.id}` ? 'Siliniyor' : 'Evet, sil'}
                        </button>
                        <button type="button" className="adm-btn adm-btn--sm adm-btn--quiet" disabled={busy} onClick={() => setConfirmDelete(null)}>
                          Vazgeç
                        </button>
                      </span>
                    ) : (
                      <button type="button" className="adm-btn adm-btn--sm adm-btn--quiet adm-btn--danger-text" disabled={busy} onClick={() => setConfirmDelete(item.id)}>
                        Sil<span className="visually-hidden"> {label}</span>
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="adm-field__hint">Bu renge henüz görsel yüklenmedi. Görselleri aşağıya sürükleyin ya da seçin; ilk görsel kapak olur.</p>
        )}
      </section>

      <section className="adm-vmedia__block" aria-labelledby={`${uid}-add`}>
        <h3 id={`${uid}-add`} className="adm-vmedia__title">
          Görsel ekle
        </h3>
        <div
          className={`adm-vmedia__drop${dragging ? ' is-dragging' : ''}`}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            if (event.dataTransfer.files.length) addFiles(event.dataTransfer.files);
          }}
        >
          <span>Görselleri buraya sürükleyin</span>
          <span className="adm-field__hint">PNG, JPG veya WebP; her biri en çok 10 MB. Çekim türünü her görsel için ayrı seçin; alt metin otomatik olarak türetilir.</span>
          <input
            id={`${uid}-files`}
            type="file"
            accept=".jpg,.jpeg,.png,.webp"
            multiple
            className="visually-hidden"
            disabled={uploading}
            onChange={(event) => {
              if (event.target.files?.length) addFiles(event.target.files);
              event.target.value = '';
            }}
          />
          <label htmlFor={`${uid}-files`} className="adm-btn adm-btn--sm">
            Görsel seç
          </label>
        </div>

        {uploads.length ? (
          <>
            <ul className="adm-vmedia__queue" aria-label="Yüklenecek görseller">
              {uploads.map((item, uploadIndex) => (
                <li key={item.id} className={`is-${item.state}`}>
                  <span className="adm-vmedia__qthumb">{item.preview ? <img src={item.preview} alt="" /> : null}</span>
                  <span className="adm-vmedia__qname">{item.file.name}</span>
                  {item.state === 'waiting' || item.state === 'error' ? (
                    <select
                      aria-label={`${item.file.name} çekim türü`}
                      value={item.role}
                      disabled={uploading || !item.preview}
                      onChange={(event) => updateUpload(item.id, { role: event.target.value as Role })}
                    >
                      {ROLES.map((role) => (
                        <option key={role} value={role}>
                          {ROLE_LABEL[role]}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="adm-vmedia__qmeta">
                      {ROLE_LABEL[item.role]}
                    </span>
                  )}
                  <span className="adm-vmedia__qstate" role={item.state === 'error' ? 'alert' : undefined}>
                    {item.state === 'waiting' ? item.message ?? 'Bekliyor' : item.state === 'uploading' ? 'Yükleniyor' : item.state === 'done' ? 'Yüklendi' : item.message}
                  </span>
                  <span className="adm-vmedia__qactions">
                    {item.state === 'waiting' && uploads.length > 1 ? (
                      <>
                        <button
                          type="button"
                          className="adm-icon-btn"
                          aria-label={`${item.file.name}: yukarı taşı`}
                          disabled={uploading || uploadIndex === 0}
                          onClick={() => moveUpload(uploadIndex, uploadIndex - 1)}
                          title="Yukarı taşı"
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="m6 15 6-6 6 6" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          className="adm-icon-btn"
                          aria-label={`${item.file.name}: aşağı taşı`}
                          disabled={uploading || uploadIndex === uploads.length - 1}
                          onClick={() => moveUpload(uploadIndex, uploadIndex + 1)}
                          title="Aşağı taşı"
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="m6 9 6 6 6-6" />
                          </svg>
                        </button>
                      </>
                    ) : null}
                    {item.state === 'error' && item.preview ? (
                      <button type="button" className="adm-link" disabled={uploading} onClick={() => updateUpload(item.id, { state: 'waiting', message: undefined })}>
                        Tekrar dene
                      </button>
                    ) : null}
                    {item.state !== 'uploading' ? (
                      <button type="button" className="adm-icon-btn" aria-label={`${item.file.name} listeden çıkar`} disabled={uploading} onClick={() => dropUpload(item)}>
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M6 6l12 12M18 6 6 18" />
                        </svg>
                      </button>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
            <div className="adm-vmedia__submit">
              <button type="button" className="adm-btn adm-btn--primary" disabled={busy || !waiting} aria-busy={pending === 'upload'} onClick={uploadAll}>
                {pending === 'upload' ? 'Yükleniyor' : waiting ? `${waiting} görseli yükle` : 'Yüklenecek görsel yok'}
              </button>
            </div>
          </>
        ) : null}
      </section>

      <section className="adm-vmedia__block" aria-labelledby={`${uid}-video`}>
        <h3 id={`${uid}-video`} className="adm-vmedia__title">
          Video
        </h3>
        {currentVideo ? (
          <p className="adm-field__hint">Bu rengin videosu yukarıda. Her renge bir video eklenebilir; yenisi için önce mevcut videoyu silin.</p>
        ) : !media ? null : !images.length ? (
          <p className="adm-field__hint">Video posteri için önce en az bir görsel yükleyin.</p>
        ) : (
          <div className="adm-vmedia__video">
            <div className="adm-field">
              <label htmlFor={`${uid}-video-file`}>Video dosyası</label>
              <input id={`${uid}-video-file`} type="file" accept=".mp4,.webm" disabled={busy} onChange={(event) => chooseVideo(event.target.files?.[0])} aria-describedby={`${uid}-video-hint`} />
              <p id={`${uid}-video-hint`} className="adm-field__hint">
                MP4 veya WebM, en çok 50 MB. Sessiz oynatılır.
              </p>
            </div>
            {video ? (
              <>
                <div className="adm-field">
                  <label htmlFor={`${uid}-video-poster`}>Poster</label>
                  <select id={`${uid}-video-poster`} value={video.posterId} disabled={busy} onChange={(event) => setVideo({ ...video, posterId: event.target.value })}>
                    {images.map((image, imageIndex) => (
                      <option key={image.id} value={image.id}>
                        {imageIndex + 1}. {ROLE_LABEL[image.role]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="adm-field">
                  <label htmlFor={`${uid}-video-role`}>Çekim türü</label>
                  <select id={`${uid}-video-role`} value={video.role} disabled={busy} onChange={(event) => setVideo({ ...video, role: event.target.value as Role })}>
                    {ROLES.map((role) => (
                      <option key={role} value={role}>
                        {ROLE_LABEL[role]}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            ) : null}
            {videoError ? (
              <p className="adm-field-error" role="alert">
                {videoError}
              </p>
            ) : null}
            <div className="adm-vmedia__submit">
              <button type="button" className="adm-btn adm-btn--primary" disabled={busy || !video} aria-busy={pending === 'video'} onClick={uploadVideo}>
                {pending === 'video' ? 'Yükleniyor' : 'Videoyu yükle'}
              </button>
            </div>
          </div>
        )}
      </section>
    </Dialog>
  );
}
