'use client';

import React from 'react';
import type { ColorGroup } from '../../_lib/variant-model';

const ROLE_SHORT = { FLATLAY: 'Düz', MODEL: 'Manken', DETAIL: 'Detay' } as const;

type Tile = { id: string; kind: 'IMAGE' | 'VIDEO'; role: keyof typeof ROLE_SHORT; src: string | null; isCover: boolean };

/**
 * A colour's photos and video in gallery order, inside its group in the variant table. Each tile opens
 * "Renk medyası" on that item; "Görsel" / "Video" open it on the upload part. A colour that is not saved
 * yet shows the files chosen for it, which the next save uploads (first photo = cover).
 */
export default function VariantMediaStrip({
  group,
  disabled,
  onOpen,
}: {
  group: ColorGroup;
  disabled?: boolean;
  onOpen(group: ColorGroup, mediaId?: string): void;
}) {
  const name = group.color || 'Bu renk';
  const pending = !group.productId;
  const staged = group.staged ?? [];
  const firstStagedImage = staged.find((item) => item.kind === 'IMAGE');
  const tiles: Tile[] = pending
    ? staged.map((item) => ({
        id: item.id,
        kind: item.kind,
        role: item.role,
        src: item.kind === 'VIDEO' ? staged.find((image) => image.id === item.posterId)?.preview ?? null : item.preview,
        isCover: item.id === firstStagedImage?.id,
      }))
    : group.media.map((item) => ({ id: item.id, kind: item.kind, role: item.role, src: item.kind === 'VIDEO' ? item.posterUrl : item.url, isCover: item.isCover }));
  const imageCount = tiles.filter((item) => item.kind === 'IMAGE').length;
  const video = tiles.find((item) => item.kind === 'VIDEO');
  const hasCover = tiles.some((item) => item.isCover);
  const open = (mediaId?: string) => onOpen(group, mediaId);

  return (
    <div className="adm-vx__strip">
      <ol className="adm-vx__strip-list" aria-label={`${name} medyası`}>
        {tiles.map((item, index) => (
          <li key={item.id}>
            <button
              type="button"
              className={`adm-vx__tile${item.isCover ? ' is-cover' : ''}`}
              disabled={disabled}
              onClick={() => open(item.id)}
              aria-label={`${name}, ${index + 1}. ${item.kind === 'VIDEO' ? 'video' : 'görsel'}: ${ROLE_SHORT[item.role]}${item.isCover ? ', kapak' : ''}. Düzenle`}
            >
              {item.src ? <img src={item.src} alt="" loading="lazy" /> : null}
              {item.kind === 'VIDEO' ? (
                <span className="adm-vx__tile-play" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <path d="M9 7v10l8-5z" />
                  </svg>
                </span>
              ) : null}
              <span className="adm-vx__tile-role" aria-hidden="true">
                {item.isCover ? 'Kapak' : ROLE_SHORT[item.role]}
              </span>
            </button>
          </li>
        ))}
        <li>
          <button type="button" className="adm-vx__tile adm-vx__tile--add" disabled={disabled} onClick={() => open()}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            <span>
              Görsel<span className="visually-hidden"> ekle: {name}</span>
            </span>
          </button>
        </li>
        {!video ? (
          <li>
            <button type="button" className="adm-vx__tile adm-vx__tile--add" disabled={disabled || !imageCount} onClick={() => open()} title={imageCount ? undefined : 'Önce bir görsel ekleyin; video posteri görsellerden seçilir'}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M9 7v10l8-5z" />
              </svg>
              <span>
                Video<span className="visually-hidden"> ekle: {name}</span>
              </span>
            </button>
          </li>
        ) : null}
      </ol>
      <p className={`adm-vx__strip-sum${hasCover && !pending ? '' : ' is-warning'}`}>
        {tiles.length ? `${imageCount} görsel${video ? ', 1 video' : ''}` : 'Görsel yok.'}
        {pending && tiles.length ? '; kaydedince yüklenir.' : hasCover ? '' : tiles.length ? '. Kapak seçilmedi.' : ' Yayın için kapak gerekir.'}
      </p>
    </div>
  );
}
