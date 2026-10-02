'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { SETTINGS_LABELS, type StoreSettingsValues } from '@/lib/settings/shared';
import { TabLoadError, TabLoading } from './TabState';

type Entry = {
  id: string;
  actorEmail: string;
  action: string;
  entity: string;
  entityId: string | null;
  summary: string;
  diff: Record<string, [unknown, unknown]> | null;
  createdAt: string;
};

const FILTERS = [
  { value: '', label: 'Tümü' },
  { value: 'order', label: 'Siparişler' },
  { value: 'product', label: 'Ürünler' },
  { value: 'coupon', label: 'Kuponlar' },
  { value: 'return', label: 'İadeler' },
  { value: 'settings', label: 'Ayarlar' },
  { value: 'pii', label: 'Kişisel veri erişimi' },
] as const;

const show = (value: unknown) => {
  if (value === null || value === undefined || value === '') return '—';
  if (value === true) return 'açık';
  if (value === false) return 'kapalı';
  return String(value);
};
const fieldLabel = (field: string) => SETTINGS_LABELS[field as keyof StoreSettingsValues] ?? field;

export default function ActivityTab() {
  const [filter, setFilter] = useState<string>('');
  const [entries, setEntries] = useState<Entry[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'more' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (entity: string, after: string | null) => {
    setState(after ? 'more' : 'loading');
    setError(null);
    try {
      const params = new URLSearchParams();
      if (entity) params.set('entity', entity);
      if (after) params.set('cursor', after);
      const response = await fetch(`/api/admin/audit?${params}`, { cache: 'no-store' });
      const data = await response.json().catch(() => null);
      if (!response.ok || !Array.isArray(data?.entries)) throw new Error(data?.error || 'Etkinlik kaydı yüklenemedi.');
      setEntries((current) => (after ? [...current, ...data.entries] : data.entries));
      setCursor(data.nextCursor);
      setState('ready');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Etkinlik kaydı yüklenemedi.');
      setState('error');
    }
  }, []);

  useEffect(() => {
    void load(filter, null);
  }, [filter, load]);

  return (
    <div className="adm-activity">
      <div className="adm-segmented" role="group" aria-label="Kayıt türü">
        {FILTERS.map((item) => (
          <button key={item.value} type="button" aria-pressed={filter === item.value} onClick={() => setFilter(item.value)}>
            {item.label}
          </button>
        ))}
      </div>

      {state === 'loading' ? <TabLoading label="Etkinlik kaydı yükleniyor" /> : null}
      {state === 'error' && entries.length === 0 ? <TabLoadError message={error ?? ''} onRetry={() => load(filter, null)} /> : null}
      {state !== 'loading' && state !== 'error' && entries.length === 0 ? (
        <p className="adm-empty">Bu türde kayıt yok. Panelde yapılan değişiklikler burada listelenir.</p>
      ) : null}

      {entries.length > 0 && state !== 'loading' ? (
        <ol className="adm-timeline">
          {entries.map((entry) => (
            <li key={entry.id} className="adm-timeline__item">
              <time dateTime={entry.createdAt}>
                {new Date(entry.createdAt).toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </time>
              <div>
                <p className="adm-timeline__summary">{entry.summary}</p>
                <p className="adm-timeline__actor">{entry.actorEmail}</p>
                {entry.diff ? (
                  <details className="adm-timeline__diff">
                    <summary>Değişiklikler</summary>
                    <dl>
                      {Object.entries(entry.diff).map(([field, [before, after]]) => (
                        <div key={field}>
                          <dt>{fieldLabel(field)}</dt>
                          <dd>
                            <del>{show(before)}</del> <span aria-hidden="true">→</span>
                            <span className="visually-hidden">yeni değer</span> <ins>{show(after)}</ins>
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </details>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      ) : null}

      {state === 'error' && entries.length > 0 ? (
        <p className="adm-field-error" role="alert">
          {error}
        </p>
      ) : null}
      {cursor && state !== 'loading' ? (
        <button type="button" className="adm-btn" onClick={() => load(filter, cursor)} disabled={state === 'more'}>
          {state === 'more' ? 'Yükleniyor' : 'Daha eski kayıtlar'}
        </button>
      ) : null}
    </div>
  );
}
