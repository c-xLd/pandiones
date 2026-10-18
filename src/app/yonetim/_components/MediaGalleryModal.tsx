'use client';

import React, { useCallback, useEffect, useId, useMemo, useState } from 'react';
import Dialog from '@/components/ui/Dialog';
import type { GalleryMediaCategory, GalleryMediaItem } from '@/lib/admin/media-gallery';

type MediaGalleryModalProps = {
  open: boolean;
  onClose: () => void;
  onSelect: (url: string, item?: GalleryMediaItem) => void;
  currentUrl?: string;
  initialMedia?: GalleryMediaItem[];
  title?: string;
  eyebrow?: string;
};

export default function MediaGalleryModal({
  open,
  onClose,
  onSelect,
  currentUrl,
  initialMedia,
  title = 'Galeriden Görsel Seç',
  eyebrow = 'MEDYA ARŞİVİ',
}: MediaGalleryModalProps) {
  const searchId = useId();
  const [items, setItems] = useState<GalleryMediaItem[]>(initialMedia ?? []);
  const [loading, setLoading] = useState<boolean>(!initialMedia || initialMedia.length === 0);
  const [query, setQuery] = useState<string>('');
  const [category, setCategory] = useState<GalleryMediaCategory | 'all'>('all');
  const [selectedUrl, setSelectedUrl] = useState<string>(currentUrl ?? '');

  // Reset selected URL when modal opens
  useEffect(() => {
    if (open) {
      setSelectedUrl(currentUrl ?? '');
      setQuery('');
      setCategory('all');
    }
  }, [open, currentUrl]);

  // Fetch media from API if not supplied via props
  useEffect(() => {
    if (!open) return;
    if (initialMedia && initialMedia.length > 0) {
      setItems(initialMedia);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    fetch('/api/admin/media')
      .then((res) => {
        if (!res.ok) throw new Error('Medya listesi alınamadı.');
        return res.json();
      })
      .then((data) => {
        if (!cancelled && Array.isArray(data.items)) {
          setItems(data.items);
        }
      })
      .catch((err) => {
        console.warn('Media fetch error:', err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, initialMedia]);

  // Filter items based on active category and search query
  const filteredItems = useMemo(() => {
    let result = items;
    if (category !== 'all') {
      result = result.filter((item) => {
        if (category === 'campaign') return item.category === 'campaign' || item.role === 'POSTER' || item.role === 'CAMPAIGN';
        return item.category === category;
      });
    }

    if (query.trim()) {
      const q = query.trim().toLowerCase();
      result = result.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.alt.toLowerCase().includes(q) ||
          item.url.toLowerCase().includes(q) ||
          (item.productName && item.productName.toLowerCase().includes(q)) ||
          (item.color && item.color.toLowerCase().includes(q)) ||
          (item.role && item.role.toLowerCase().includes(q)),
      );
    }

    return result;
  }, [items, category, query]);

  const selectedItem = useMemo(() => {
    return items.find((item) => item.url === selectedUrl) ?? null;
  }, [items, selectedUrl]);

  const handleConfirm = useCallback(() => {
    if (!selectedUrl) return;
    onSelect(selectedUrl, selectedItem ?? undefined);
    onClose();
  }, [selectedUrl, selectedItem, onSelect, onClose]);

  const handleCardClick = (url: string) => {
    setSelectedUrl(url);
  };

  const handleCardDoubleClick = (url: string, item: GalleryMediaItem) => {
    setSelectedUrl(url);
    onSelect(url, item);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      eyebrow={eyebrow}
      size="lg"
      className="adm-dialog adm-dialog--media-gallery"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', minHeight: 460 }}>
        {/* Controls: Search and Categories */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }} role="tablist" aria-label="Medya kategorileri">
            {(
              [
                { id: 'all', label: 'Tümü' },
                { id: 'campaign', label: 'Kampanya & Vitrin' },
                { id: 'catalog', label: 'Ürün Kataloğu' },
              ] as const
            ).map((tab) => {
              const active = category === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setCategory(tab.id)}
                  className="adm-btn"
                  style={{
                    padding: '6px 14px',
                    fontSize: 'var(--text-sm)',
                    fontWeight: active ? 600 : 400,
                    background: active ? 'var(--color-ink, #111)' : 'var(--adm-tray, #f3f4f6)',
                    color: active ? '#fff' : 'inherit',
                    borderColor: active ? 'var(--color-ink, #111)' : 'var(--adm-hair, #e5e7eb)',
                    borderRadius: 'var(--radius-md, 6px)',
                    cursor: 'pointer',
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div style={{ flex: '1 1 240px', maxWidth: 320 }}>
            <label htmlFor={searchId} className="visually-hidden">
              Görsel ara
            </label>
            <input
              id={searchId}
              type="search"
              placeholder="Görsel veya ürün ara…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '7px 12px',
                borderRadius: 'var(--radius-md, 6px)',
                border: '1px solid var(--color-border, #d1d5db)',
                fontSize: 'var(--text-sm)',
              }}
            />
          </div>
        </div>

        {/* Media Grid */}
        <div
          role="region"
          aria-label="Görsel listesi"
          tabIndex={0}
          style={{
            flex: 1,
            maxHeight: '380px',
            overflowY: 'auto',
            border: '1px solid var(--color-border, #e5e7eb)',
            borderRadius: 'var(--radius-md, 8px)',
            padding: 'var(--space-3)',
            background: 'var(--color-bg-subtle, #fafafa)',
          }}
        >
          {loading ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                gap: 'var(--space-3)',
              }}
            >
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    aspectRatio: '1 / 1',
                    background: '#e5e7eb',
                    borderRadius: 'var(--radius-sm, 6px)',
                    animation: 'adm-pulse 1.5s ease-in-out infinite',
                  }}
                />
              ))}
            </div>
          ) : filteredItems.length === 0 ? (
            <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--muted, #6b7280)' }}>
              <p style={{ margin: 0, fontSize: 'var(--text-sm)' }}>
                {query ? 'Aramanıza uygun görsel bulunamadı.' : 'Bu kategoride görsel bulunmuyor.'}
              </p>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                gap: 'var(--space-3)',
              }}
            >
              {filteredItems.map((item) => {
                const isSelected = item.url === selectedUrl;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleCardClick(item.url)}
                    onDoubleClick={() => handleCardDoubleClick(item.url, item)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleCardDoubleClick(item.url, item);
                      }
                    }}
                    style={{
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column',
                      padding: 4,
                      background: '#fff',
                      borderRadius: 'var(--radius-md, 6px)',
                      border: isSelected
                        ? '2px solid var(--color-ink, #000)'
                        : '1px solid var(--color-border, #e5e7eb)',
                      boxShadow: isSelected ? '0 0 0 1px var(--color-ink, #000)' : 'none',
                      textAlign: 'left',
                      cursor: 'pointer',
                      outline: 'none',
                      transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                    }}
                    aria-label={`${item.title} ${isSelected ? '(Seçili)' : ''}`}
                    title={item.title}
                  >
                    <div
                      style={{
                        position: 'relative',
                        width: '100%',
                        aspectRatio: '1 / 1',
                        borderRadius: 'var(--radius-sm, 4px)',
                        overflow: 'hidden',
                        background: '#f3f4f6',
                      }}
                    >
                      <img
                        src={item.url}
                        alt={item.alt}
                        loading="lazy"
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          display: 'block',
                        }}
                        onError={(e) => {
                          (e.currentTarget as HTMLElement).style.display = 'none';
                        }}
                      />
                      {isSelected && (
                        <div
                          style={{
                            position: 'absolute',
                            top: 4,
                            right: 4,
                            width: 20,
                            height: 20,
                            borderRadius: '50%',
                            background: 'var(--color-ink, #000)',
                            color: '#fff',
                            display: 'grid',
                            placeItems: 'center',
                            fontSize: 12,
                            fontWeight: 700,
                          }}
                          aria-hidden="true"
                        >
                          ✓
                        </div>
                      )}
                      {item.role && (
                        <span
                          style={{
                            position: 'absolute',
                            bottom: 4,
                            left: 4,
                            background: 'rgba(0,0,0,0.65)',
                            color: '#fff',
                            fontSize: '9px',
                            fontWeight: 600,
                            padding: '2px 5px',
                            borderRadius: 3,
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                          }}
                        >
                          {item.role}
                        </span>
                      )}
                    </div>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 500,
                        color: 'var(--color-ink, #111)',
                        marginTop: 4,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        lineHeight: 1.3,
                        display: 'block',
                      }}
                    >
                      {item.title}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected Banner and Actions */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 'var(--space-3)',
            paddingTop: 'var(--space-2)',
            borderTop: '1px solid var(--color-border, #e5e7eb)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', minWidth: 0, flex: 1 }}>
            {selectedUrl ? (
              <>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 'var(--radius-sm, 4px)',
                    overflow: 'hidden',
                    border: '1px solid var(--color-border, #d1d5db)',
                    flexShrink: 0,
                    background: '#f3f4f6',
                  }}
                >
                  <img
                    src={selectedUrl}
                    alt="Seçili görsel"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-ink, #111)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {selectedItem ? selectedItem.title : 'Özel Görsel URL'}
                  </p>
                  <p style={{ margin: 0, fontSize: '11px', color: 'var(--muted, #6b7280)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {selectedUrl}
                  </p>
                </div>
              </>
            ) : (
              <p style={{ margin: 0, fontSize: 'var(--text-xs)', color: 'var(--muted, #6b7280)' }}>
                Listeden bir görsel seçin veya çift tıklayın.
              </p>
            )}
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <button type="button" className="adm-btn" onClick={onClose}>
              Vazgeç
            </button>
            <button
              type="button"
              className="adm-btn adm-btn--primary"
              disabled={!selectedUrl}
              onClick={handleConfirm}
            >
              Görseli Seç
            </button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
