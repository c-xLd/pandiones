'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { TabLoadError, TabLoading } from './TabState';

type SecurityEvent = { id: string; type: string; severity: 'info' | 'warning' | 'critical'; subject: string | null; detail: string | null; createdAt: string };
type Data = { events: SecurityEvent[]; last24h: Record<string, number>; openAdminSessions: number };

const LABELS: Record<string, string> = {
  'login.locked': 'Hesap kilitlendi (çok sayıda hatalı şifre)',
  'rate.limited': 'İstek sınırı aşıldı',
  'payment.mismatch': 'Ödeme tutarı / sepet uyuşmazlığı',
  'payment.after_release': 'Süresi dolmuş siparişe ödeme',
  'mfa.failed': 'Hatalı 2FA kodu',
  'admin.login': 'Yönetici girişi',
  'reauth.failed': 'Hatalı yeniden doğrulama',
};

const SEVERITY_LABEL = { critical: 'Kritik', warning: 'Uyarı', info: 'Bilgi' } as const;

/** Yönetim → Güvenlik: what the protections caught recently. Critical events are also e-mailed. */
export default function SecurityTab() {
  const [filter, setFilter] = useState<'' | 'critical' | 'warning' | 'info'>('');
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(`/api/admin/security${filter ? `?severity=${filter}` : ''}`, { cache: 'no-store' });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body) throw new Error(body?.error || 'Güvenlik kayıtları yüklenemedi.');
      setData(body);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Güvenlik kayıtları yüklenemedi.');
    }
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  if (error) return <TabLoadError message={error} onRetry={load} />;
  if (!data) return <TabLoading label="Güvenlik kayıtları yükleniyor" />;

  const critical24 = (data.last24h['payment.mismatch'] ?? 0) + (data.last24h['payment.after_release'] ?? 0);
  return (
    <div className="adm-activity">
      <div className="adm-tasks adm-security-kpis">
        <div className="adm-task" data-empty={critical24 === 0}>
          <span className="adm-task__count">{critical24}</span>
          <span className="adm-task__label">Kritik olay · 24 saat</span>
          <span className="adm-task__hint">Ödeme uyuşmazlıkları; e-postayla bildirilir</span>
        </div>
        <div className="adm-task" data-empty={!data.last24h['login.locked']}>
          <span className="adm-task__count">{data.last24h['login.locked'] ?? 0}</span>
          <span className="adm-task__label">Kilitlenen hesap</span>
          <span className="adm-task__hint">10 hatalı şifre → 15 dk kilit</span>
        </div>
        <div className="adm-task" data-empty={!data.last24h['rate.limited']}>
          <span className="adm-task__count">{data.last24h['rate.limited'] ?? 0}</span>
          <span className="adm-task__label">Sınır aşımı</span>
          <span className="adm-task__hint">Bot / deneme saldırısı belirtisi</span>
        </div>
        <div className="adm-task">
          <span className="adm-task__count">{data.openAdminSessions}</span>
          <span className="adm-task__label">Açık yönetici oturumu</span>
          <span className="adm-task__hint">2FA ile açılmış</span>
        </div>
      </div>

      <div className="adm-segmented" role="group" aria-label="Önem">
        {(['', 'critical', 'warning', 'info'] as const).map((value) => (
          <button key={value || 'all'} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)}>
            {value ? SEVERITY_LABEL[value] : 'Tümü'}
          </button>
        ))}
      </div>

      {data.events.length === 0 ? (
        <p className="adm-empty">Bu türde kayıt yok.</p>
      ) : (
        <ol className="adm-timeline">
          {data.events.map((event) => (
            <li key={event.id} className="adm-timeline__item">
              <time dateTime={event.createdAt}>
                {new Date(event.createdAt).toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </time>
              <div>
                <p className="adm-timeline__summary">
                  <span className={`adm-status adm-status--sec-${event.severity}`}>{SEVERITY_LABEL[event.severity]}</span> {LABELS[event.type] ?? event.type}
                </p>
                {event.subject || event.detail ? (
                  <p className="adm-timeline__actor">{[event.subject, event.detail].filter(Boolean).join(' · ')}</p>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
