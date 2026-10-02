'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { errorText, loadJson, sendJson } from '../_lib/request';
import { TabLoadError, TabLoading } from '../_components/TabState';
import { useTabNotice } from '../_components/TabNotice';
import { useConfirm } from '../_components/ConfirmDialog';
import AdminIcon from '../_components/AdminIcon';

type WaitlistGroup = {
  productId: string;
  productName: string;
  productSlug: string;
  image: string;
  size: string;
  currentStock: number;
  pendingCount: number;
  emails: string[];
};

type StockAlert = {
  id: string;
  productId: string;
  size: string;
  email: string;
  isNotified: boolean;
  createdAt: string;
  product?: { id: string; name: string; slug: string; image: string } | null;
};

type Data = { alerts: StockAlert[]; waitlistSummary: WaitlistGroup[] };

const includes = (value: string, needle: string) => value.toLocaleLowerCase('tr-TR').includes(needle);

export default function WaitlistTab() {
  const [data, setData] = useState<Data | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [view, setView] = useState<'summary' | 'all'>('summary');
  const [search, setSearch] = useState('');
  const { notice, success } = useTabNotice();
  const { ask, dialog } = useConfirm();

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      setData(
        await loadJson<Data>('/api/admin/stock-alerts', 'Stok talepleri yüklenemedi.', (body) =>
          Boolean(body && Array.isArray((body as Data).alerts) && Array.isArray((body as Data).waitlistSummary)),
        ),
      );
    } catch (err) {
      setLoadError(errorText(err, 'Stok talepleri yüklenemedi.'));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const remove = (alert: StockAlert) =>
    ask({
      title: 'Talep silinsin mi?',
      message: (
        <p>
          {alert.email} adresinin {alert.product?.name ?? 'ürün'} ({alert.size}) talebi silinir; stok gelince bu kişiye e-posta gönderilmez.
        </p>
      ),
      confirmLabel: 'Talebi sil',
      pendingLabel: 'Siliniyor',
      danger: true,
      onConfirm: async () => {
        await sendJson('/api/admin/stock-alerts', 'DELETE', { id: alert.id }, 'Talep silinemedi.');
        success('Talep silindi.');
        // The summary is grouped on the server; reload so counts stay true.
        await load();
      },
    });

  if (loadError) return <TabLoadError message={loadError} onRetry={() => { setData(null); void load(); }} />;
  if (!data) return <TabLoading label="Stok talepleri yükleniyor" />;

  const needle = search.trim().toLocaleLowerCase('tr-TR');
  const groups = needle ? data.waitlistSummary.filter((g) => includes(g.productName, needle) || includes(g.size, needle)) : data.waitlistSummary;
  const alerts = needle
    ? data.alerts.filter((a) => includes(a.email, needle) || includes(a.size, needle) || (a.product ? includes(a.product.name, needle) : false))
    : data.alerts;
  const pending = data.alerts.filter((a) => !a.isNotified).length;
  const notified = data.alerts.length - pending;

  return (
    <div className="adm-tab">
      <div className="adm-tasks adm-tasks--static">
        <div className="adm-task" data-empty={pending === 0}>
          <span className="adm-task__count">{pending}</span>
          <span className="adm-task__label">Bekleyen talep</span>
          <span className="adm-task__hint">Stok gelince e-posta gönderilecek kişiler</span>
        </div>
        <div className="adm-task" data-empty={data.waitlistSummary.length === 0}>
          <span className="adm-task__count">{data.waitlistSummary.length}</span>
          <span className="adm-task__label">Ürün · beden</span>
          <span className="adm-task__hint">Talep bekleyen varyant sayısı</span>
        </div>
        <div className="adm-task" data-empty={notified === 0}>
          <span className="adm-task__count">{notified}</span>
          <span className="adm-task__label">Bildirilen</span>
          <span className="adm-task__hint">Stok geldiğinde e-postası gönderilenler</span>
        </div>
      </div>

      {data.alerts.length > 0 ? (
        <div className="adm-toolbar">
          <div className="adm-segmented" role="group" aria-label="Görünüm">
            <button type="button" aria-pressed={view === 'summary'} onClick={() => setView('summary')}>
              Ürüne göre ({data.waitlistSummary.length})
            </button>
            <button type="button" aria-pressed={view === 'all'} onClick={() => setView('all')}>
              Tüm kayıtlar ({data.alerts.length})
            </button>
          </div>
          <label className="adm-search adm-toolbar__grow">
            <span className="visually-hidden">Ürün, beden veya e-posta ara</span>
            <AdminIcon name="search" />
            <input type="search" placeholder="Ürün, beden veya e-posta" value={search} onChange={(e) => setSearch(e.target.value)} />
          </label>
        </div>
      ) : null}

      {notice}

      {data.alerts.length === 0 ? (
        <p className="adm-empty">Henüz stok talebi yok. Ürün sayfasında “Gelince haber ver” bırakılan talepler burada görünür.</p>
      ) : view === 'summary' ? (
        groups.length === 0 ? (
          <p className="adm-empty">{needle ? `“${search}” ile eşleşen bekleyen talep yok.` : 'Bekleyen talep yok; tüm talepler bildirildi.'}</p>
        ) : (
          <div className="adm-table-wrap">
            <div className="adm-table-scroll">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th scope="col">Ürün</th>
                    <th scope="col">Beden</th>
                    <th scope="col" className="adm-num">Stok</th>
                    <th scope="col" className="adm-num">Bekleyen</th>
                    <th scope="col">Bekleyenler</th>
                    <th scope="col" className="adm-end">
                      <span className="visually-hidden">Bağlantı</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {groups.map((group) => (
                    <tr key={`${group.productId}-${group.size}`}>
                      <td>
                        <div className="adm-row adm-row--flush">
                          <span className="adm-row__thumb" aria-hidden="true">
                            {group.image ? <img src={group.image} alt="" loading="lazy" /> : null}
                          </span>
                          <span className="adm-cell__main">{group.productName}</span>
                        </div>
                      </td>
                      <td>{group.size}</td>
                      <td className="adm-num">
                        <span className={group.currentStock === 0 ? 'adm-text-danger' : undefined}>{group.currentStock}</span>
                      </td>
                      <td className="adm-num adm-cell__main">{group.pendingCount}</td>
                      <td>
                        <span className="adm-cell__sub">
                          {group.emails.join(', ')}
                          {group.pendingCount > group.emails.length ? ` ve ${group.pendingCount - group.emails.length} kişi daha` : ''}
                        </span>
                      </td>
                      <td className="adm-end">
                        {group.productSlug ? (
                          <Link href={`/urun/${group.productSlug}`} target="_blank" rel="noopener" className="adm-btn adm-btn--sm adm-btn--quiet">
                            Ürün sayfası<span className="visually-hidden"> (yeni sekmede açılır)</span>
                            <AdminIcon name="arrow" />
                          </Link>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : alerts.length === 0 ? (
        <p className="adm-empty">“{search}” ile eşleşen kayıt yok.</p>
      ) : (
        <div className="adm-table-wrap">
          <div className="adm-table-scroll">
            <table className="adm-table">
              <thead>
                <tr>
                  <th scope="col">Tarih</th>
                  <th scope="col">E-posta</th>
                  <th scope="col">Ürün</th>
                  <th scope="col">Beden</th>
                  <th scope="col">Durum</th>
                  <th scope="col" className="adm-end">
                    <span className="visually-hidden">İşlem</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((alert) => (
                  <tr key={alert.id}>
                    <td className="adm-cell__sub">{new Date(alert.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                    <td className="adm-cell__main">{alert.email}</td>
                    <td>{alert.product?.name ?? alert.productId}</td>
                    <td>{alert.size}</td>
                    <td>
                      <span className={`adm-status adm-status--${alert.isNotified ? 'success' : 'warning'}`}>{alert.isNotified ? 'Bildirildi' : 'Bekliyor'}</span>
                    </td>
                    <td className="adm-end">
                      <button type="button" className="adm-btn adm-btn--sm adm-btn--quiet adm-btn--danger-text" onClick={() => remove(alert)}>
                        <AdminIcon name="trash" />
                        <span>
                          Sil<span className="visually-hidden"> {alert.email} talebi</span>
                        </span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {dialog}
    </div>
  );
}
