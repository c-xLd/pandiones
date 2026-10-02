'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { errorText, loadJson, sendJson } from '../_lib/request';
import { TabLoadError, TabLoading } from '../_components/TabState';
import { useTabNotice } from '../_components/TabNotice';
import { useConfirm } from '../_components/ConfirmDialog';
import AdminIcon from '../_components/AdminIcon';

type Subscriber = { id: string; email: string; subscribedAt: string };

const dateTime = (value: string) =>
  new Date(value).toLocaleString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function NewsletterTab() {
  const [subscribers, setSubscribers] = useState<Subscriber[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { notice, success, error } = useTabNotice();
  const { ask, dialog } = useConfirm();

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      setSubscribers(await loadJson<Subscriber[]>('/api/admin/newsletter', 'Aboneler yüklenemedi.', Array.isArray));
    } catch (err) {
      setLoadError(errorText(err, 'Aboneler yüklenemedi.'));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const copy = async () => {
    if (!subscribers?.length) return;
    try {
      await navigator.clipboard.writeText(subscribers.map((s) => s.email).join(', '));
      success(`${subscribers.length} e-posta adresi panoya kopyalandı.`);
    } catch {
      error('Panoya kopyalanamadı. Tarayıcı izin vermedi; adresleri tablodan seçerek kopyalayabilirsiniz.');
    }
  };

  const remove = (subscriber: Subscriber) =>
    ask({
      title: 'Abone listeden çıkarılsın mı?',
      message: <p>{subscriber.email} bülten listesinden silinir. Kişi isterse yeniden abone olabilir.</p>,
      confirmLabel: 'Listeden çıkar',
      pendingLabel: 'Çıkarılıyor',
      danger: true,
      onConfirm: async () => {
        await sendJson('/api/admin/newsletter', 'DELETE', { id: subscriber.id }, 'Abone silinemedi.');
        setSubscribers((current) => current?.filter((item) => item.id !== subscriber.id) ?? null);
        success(`${subscriber.email} listeden çıkarıldı.`);
      },
    });

  if (loadError) return <TabLoadError message={loadError} onRetry={() => { setSubscribers(null); void load(); }} />;
  if (!subscribers) return <TabLoading label="Aboneler yükleniyor" />;

  return (
    <div className="adm-tab">
      {subscribers.length > 0 ? (
        <div className="adm-tab__head">
          <p className="adm-tab__summary">{subscribers.length} abone</p>
          <button type="button" className="adm-btn" onClick={copy}>
            <AdminIcon name="copy" />
            <span>E-postaları kopyala</span>
          </button>
        </div>
      ) : null}

      {notice}

      {subscribers.length === 0 ? (
        <p className="adm-empty">Henüz bülten abonesi yok. Sitedeki bülten formundan kayıt olanlar burada listelenir.</p>
      ) : (
        <div className="adm-table-wrap">
          <div className="adm-table-scroll">
            <table className="adm-table">
              <thead>
                <tr>
                  <th scope="col">E-posta</th>
                  <th scope="col">Kayıt tarihi</th>
                  <th scope="col" className="adm-end">
                    <span className="visually-hidden">İşlem</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {subscribers.map((subscriber) => (
                  <tr key={subscriber.id}>
                    <td className="adm-cell__main">{subscriber.email}</td>
                    <td className="adm-cell__sub">{dateTime(subscriber.subscribedAt)}</td>
                    <td className="adm-end">
                      <button type="button" className="adm-btn adm-btn--sm adm-btn--quiet adm-btn--danger-text" onClick={() => remove(subscriber)}>
                        <AdminIcon name="trash" />
                        <span>
                          Çıkar<span className="visually-hidden"> {subscriber.email}</span>
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
