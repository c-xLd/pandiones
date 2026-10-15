'use client';

import React, { useId, useState } from 'react';
import Dialog from '@/components/ui/Dialog';
import { autoAlt, type StagedMedia } from '../../_lib/variant-model';
import { ROLE_LABEL, ROLES, type Role } from './VariantMediaDialog';

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const VIDEO_TYPES = ['video/mp4', 'video/webm'];
const IMAGE_LIMIT = 10 * 1024 * 1024;
const VIDEO_LIMIT = 50 * 1024 * 1024;

const newId = () => `staged-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

/**
 * "Renk medyası" for a colour that is not saved yet: photos and one video are chosen here, each with its
 * own shot type, and kept in the browser. The save that creates the colour uploads them.
 */
export default function StagedMediaDialog({
  productName,
  color,
  staged,
  onChange,
  onClose,
}: {
  productName: string;
  color: string;
  staged: StagedMedia[];
  onChange(next: StagedMedia[]): void;
  onClose(): void;
}) {
  const uid = useId();
  const [dragging, setDragging] = useState(false);
  const [problems, setProblems] = useState<string[]>([]);
  const [videoError, setVideoError] = useState<string | null>(null);
  const images = staged.filter((item) => item.kind === 'IMAGE');
  const video = staged.find((item) => item.kind === 'VIDEO');

  const update = (id: string, change: Partial<StagedMedia>) => onChange(staged.map((item) => (item.id === id ? { ...item, ...change } : item)));

  const coverId = staged.find((entry) => entry.isCover && entry.kind === 'IMAGE')?.id ?? images[0]?.id;

  function makeCover(id: string) {
    const itemIndex = staged.findIndex((entry) => entry.id === id);
    if (itemIndex < 0) return;
    const next = [...staged];
    const [moving] = next.splice(itemIndex, 1);
    next.unshift(moving);
    onChange(
      next.map((entry) => ({
        ...entry,
        isCover: entry.id === id,
      }))
    );
  }

  function moveStaged(from: number, to: number) {
    if (to < 0 || to >= staged.length) return;
    const next = [...staged];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  }

  function remove(item: StagedMedia) {
    if (item.preview) URL.revokeObjectURL(item.preview);
    const rest = staged.filter((entry) => entry.id !== item.id);
    const firstImage = rest.find((entry) => entry.kind === 'IMAGE');
    const hasRemainingCover = rest.some((entry) => entry.isCover && entry.kind === 'IMAGE');
    const updatedRest = rest.map((entry) => {
      if (!hasRemainingCover && entry.id === firstImage?.id) {
        return { ...entry, isCover: true };
      }
      return entry;
    });
    onChange(updatedRest.flatMap((entry) => (entry.kind === 'VIDEO' && entry.posterId === item.id ? (firstImage ? [{ ...entry, posterId: firstImage.id }] : []) : [entry])));
  }

  function addFiles(list: FileList | File[]) {
    const next: StagedMedia[] = [];
    const refused: string[] = [];
    const existingHasCover = staged.some((entry) => entry.isCover && entry.kind === 'IMAGE');
    let hasCover = existingHasCover;
    for (const file of Array.from(list)) {
      if (!IMAGE_TYPES.includes(file.type)) refused.push(`${file.name}: yalnız PNG, JPG veya WebP (video için aşağıdaki alanı kullanın).`);
      else if (file.size > IMAGE_LIMIT) refused.push(`${file.name}: en çok 10 MB.`);
      else {
        const role: Role = next.at(-1)?.role ?? images.at(-1)?.role ?? 'MODEL_FRONT';
        const isCover = !hasCover;
        if (isCover) hasCover = true;
        next.push({ id: newId(), file, kind: 'IMAGE', role, preview: URL.createObjectURL(file), isCover });
      }
    }
    setProblems(refused);
    if (next.length) onChange([...images, ...next, ...(video ? [video] : [])]);
  }

  function chooseVideo(file: File | undefined) {
    setVideoError(null);
    if (!file) return;
    if (!VIDEO_TYPES.includes(file.type)) return setVideoError('Yalnız MP4 veya WebM.');
    if (file.size > VIDEO_LIMIT) return setVideoError('En çok 50 MB.');
    onChange([...images, { id: newId(), file, kind: 'VIDEO', role: 'MODEL_FRONT', preview: null, posterId: coverId ?? images[0]?.id, isCover: false }]);
  }

  return (
    <Dialog open onClose={onClose} title={`${color} — medya`} eyebrow={productName} className="adm-dialog adm-vmedia" size="lg">
      <p className="adm-field__hint">
        Bu renk henüz kaydedilmedi. Seçtiğiniz görseller ve video burada bekler; “Taslak oluştur” ya da “Değişiklikleri kaydet” ile birlikte yüklenir. Kapak görselini seçebilir ve oklarla sıralayabilirsiniz.
      </p>

      <section className="adm-vmedia__block" aria-labelledby={`${uid}-list`}>
        <h3 id={`${uid}-list`} className="adm-vmedia__title">
          Seçilen medya <span className="adm-vmedia__count">{images.length} görsel{video ? ', 1 video' : ''}, yüklenmedi</span>
        </h3>
        {staged.length ? (
          <ol className="adm-vmedia__grid">
            {staged.map((item, index) => {
              const isCover = item.id === coverId;
              const label = `${index + 1}. ${item.kind === 'VIDEO' ? 'video' : 'görsel'}${isCover ? ', kapak' : ''}`;
              return (
                <li key={item.id} className={`adm-vmedia__item${isCover ? ' is-cover' : ''}`}>
                  <span className="adm-vmedia__thumb">
                    {item.preview ? <img src={item.preview} alt="" /> : null}
                    {item.kind === 'VIDEO' ? <span className="adm-vmedia__badge">Video</span> : null}
                    {isCover ? <span className="adm-vmedia__badge adm-vmedia__badge--cover">Kapak Görseli</span> : null}
                  </span>
                  <div className="adm-vmedia__fields">
                    <div className="adm-field">
                      <label htmlFor={`${uid}-role-${item.id}`}>Çekim türü</label>
                      <select id={`${uid}-role-${item.id}`} value={item.role} onChange={(event) => update(item.id, { role: event.target.value as Role })}>
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
                        <select id={`${uid}-poster-${item.id}`} value={item.posterId ?? ''} onChange={(event) => update(item.id, { posterId: event.target.value })}>
                          {images.map((image, imageIndex) => (
                            <option key={image.id} value={image.id}>
                              {imageIndex + 1}. {ROLE_LABEL[image.role]}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : null}
                    <p className="adm-vmedia__status">{item.file.name}</p>
                  </div>
                  <div className="adm-vmedia__actions">
                    <button
                      type="button"
                      className="adm-icon-btn"
                      disabled={index === 0}
                      onClick={() => moveStaged(index, index - 1)}
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
                      disabled={index === staged.length - 1}
                      onClick={() => moveStaged(index, index + 1)}
                      aria-label={`${label}: aşağı taşı`}
                      title="Aşağı taşı"
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </button>
                    {isCover ? (
                      <span className="adm-vmedia__cover-tag" aria-label="Geçerli kapak görseli">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                        Kapak Görseli
                      </span>
                    ) : (item.kind === 'IMAGE' || item.posterId) ? (
                      <button
                        type="button"
                        className="adm-btn adm-btn--sm adm-btn--quiet adm-btn--make-cover"
                        onClick={() => makeCover(item.id)}
                        title="Bu görseli kapak yap"
                      >
                        Kapak Yap
                      </button>
                    ) : null}
                    <button type="button" className="adm-btn adm-btn--sm adm-btn--quiet adm-btn--danger-text" onClick={() => remove(item)}>
                      Çıkar<span className="visually-hidden"> {item.file.name}</span>
                    </button>
                  </div>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="adm-field__hint">Henüz görsel seçilmedi. Görselleri aşağıya sürükleyin ya da seçin.</p>
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
          <span className="adm-field__hint">PNG, JPG veya WebP; her biri en çok 10 MB. Çekim türünü yukarıda her görsel için ayrı seçin.</span>
          <input
            id={`${uid}-files`}
            type="file"
            accept=".jpg,.jpeg,.png,.webp"
            multiple
            className="visually-hidden"
            onChange={(event) => {
              if (event.target.files?.length) addFiles(event.target.files);
              event.target.value = '';
            }}
          />
          <label htmlFor={`${uid}-files`} className="adm-btn adm-btn--sm">
            Görsel seç
          </label>
        </div>
        {problems.length ? (
          <ul className="adm-field-error" role="alert">
            {problems.map((problem) => (
              <li key={problem}>{problem}</li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="adm-vmedia__block" aria-labelledby={`${uid}-video`}>
        <h3 id={`${uid}-video`} className="adm-vmedia__title">
          Video
        </h3>
        {video ? (
          <p className="adm-field__hint">Bu rengin videosu yukarıda. Her renge bir video eklenebilir.</p>
        ) : !images.length ? (
          <p className="adm-field__hint">Video posteri için önce en az bir görsel seçin.</p>
        ) : (
          <div className="adm-field">
            <label htmlFor={`${uid}-video-file`}>Video dosyası</label>
            <input id={`${uid}-video-file`} type="file" accept=".mp4,.webm" onChange={(event) => chooseVideo(event.target.files?.[0])} aria-describedby={`${uid}-video-hint`} />
            <p id={`${uid}-video-hint`} className="adm-field__hint">
              MP4 veya WebM, en çok 50 MB. Poster ilk görsel olur; seçtikten sonra değiştirebilirsiniz.
            </p>
            {videoError ? (
              <p className="adm-field-error" role="alert">
                {videoError}
              </p>
            ) : null}
          </div>
        )}
      </section>

      <div className="adm-vmedia__submit">
        <button type="button" className="adm-btn adm-btn--primary" onClick={onClose}>
          Tamam
        </button>
      </div>
    </Dialog>
  );
}
