'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Dialog from '@/components/ui/Dialog';
import { errorText, loadJson, sendJson } from '../_lib/request';
import { TabLoadError, TabLoading } from '../_components/TabState';
import { useTabNotice } from '../_components/TabNotice';

type ReturnStatus = 'BEKLIYOR' | 'ONAYLANDI' | 'REDDEDILDI';
type ReturnRequest = {
  id: string;
  orderId: string;
  customerEmail: string;
  reason: string;
  status: ReturnStatus;
  adminNotes: string | null;
  createdAt: string;
  order: { orderNumber: string; items: { id: string; productName: string; size: string; quantity: number }[] } | null;
};

const STATUS: Record<ReturnStatus, { label: string; tone: 'warning' | 'success' | 'danger' }> = {
  BEKLIYOR: { label: 'Bekliyor', tone: 'warning' },
  ONAYLANDI: { label: 'Onaylandı', tone: 'success' },
  REDDEDILDI: { label: 'Reddedildi', tone: 'danger' },
};

const FILTERS = [
  { value: '', label: 'Tümü' },
  { value: 'BEKLIYOR', label: 'Bekleyen' },
  { value: 'ONAYLANDI', label: 'Onaylanan' },
  { value: 'REDDEDILDI', label: 'Reddedilen' },
] as const;

const DEFAULT_REJECT_NOTE = 'Hijyen bandı koruma mevzuatı gereği';
const shortId = (id: string) => id.slice(-6).toUpperCase();

export default function ReturnsTab() {
  const [returns, setReturns] = useState<ReturnRequest[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'' | ReturnStatus>('');
  const [deciding, setDeciding] = useState<{ request: ReturnRequest; status: 'ONAYLANDI' | 'REDDEDILDI' } | null>(null);
  const { notice, success } = useTabNotice();

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      setReturns(await loadJson<ReturnRequest[]>('/api/admin/returns', 'İade talepleri yüklenemedi.', Array.isArray));
    } catch (err) {
      setLoadError(errorText(err, 'İade talepleri yüklenemedi.'));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loadError) return <TabLoadError message={loadError} onRetry={() => { setReturns(null); void load(); }} />;
  if (!returns) return <TabLoading label="İade talepleri yükleniyor" />;

  const pendingCount = returns.filter((r) => r.status === 'BEKLIYOR').length;
  const visible = filter ? returns.filter((r) => r.status === filter) : returns;

  return (
    <div className="adm-tab">
      {returns.length > 0 ? (
        <div className="adm-segmented" role="group" aria-label="İade durumu">
          {FILTERS.map((item) => (
            <button key={item.value || 'all'} type="button" aria-pressed={filter === item.value} onClick={() => setFilter(item.value)}>
              {item.label}
              {item.value === 'BEKLIYOR' && pendingCount > 0 ? ` (${pendingCount})` : ''}
            </button>
          ))}
        </div>
      ) : null}

      {notice}

      {returns.length === 0 ? (
        <p className="adm-empty">Henüz iade talebi yok. Müşteriler hesaplarından talep açtığında burada listelenir.</p>
      ) : visible.length === 0 ? (
        <p className="adm-empty">{filter === 'BEKLIYOR' ? 'Bekleyen iade talebi yok.' : 'Bu durumda iade talebi yok.'}</p>
      ) : (
        <div className="adm-table-wrap">
          <div className="adm-table-scroll">
            <table className="adm-table">
              <thead>
                <tr>
                  <th scope="col">Talep</th>
                  <th scope="col">Sipariş</th>
                  <th scope="col">Parçalar</th>
                  <th scope="col">Gerekçe</th>
                  <th scope="col">Durum</th>
                  <th scope="col" className="adm-end">
                    <span className="visually-hidden">İşlem</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.map((request) => (
                  <tr key={request.id}>
                    <td>
                      <div className="adm-cell">
                        <span className="adm-cell__main">#{shortId(request.id)}</span>
                        <span className="adm-cell__sub">{new Date(request.createdAt).toLocaleDateString('tr-TR')}</span>
                      </div>
                    </td>
                    <td>
                      <div className="adm-cell">
                        <span className="adm-cell__main">#{request.order?.orderNumber ?? request.orderId}</span>
                        <span className="adm-cell__sub">{request.customerEmail}</span>
                      </div>
                    </td>
                    <td>
                      {request.order?.items.length ? (
                        <ul className="adm-plain-list">
                          {request.order.items.map((item) => (
                            <li key={item.id}>
                              {item.productName} <span className="adm-cell__sub">({item.size}) × {item.quantity}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>
                      <div className="adm-cell adm-cell--clamp">
                        <span className="adm-cell__main">{request.reason}</span>
                        {request.adminNotes ? <span className="adm-cell__sub">Yanıt: {request.adminNotes}</span> : null}
                      </div>
                    </td>
                    <td>
                      <span className={`adm-status adm-status--${STATUS[request.status].tone}`}>{STATUS[request.status].label}</span>
                    </td>
                    <td className="adm-end">
                      {request.status === 'BEKLIYOR' ? (
                        <div className="adm-actions">
                          <button type="button" className="adm-btn adm-btn--sm adm-btn--primary" onClick={() => setDeciding({ request, status: 'ONAYLANDI' })}>
                            Onayla<span className="visually-hidden"> #{shortId(request.id)}</span>
                          </button>
                          <button type="button" className="adm-btn adm-btn--sm" onClick={() => setDeciding({ request, status: 'REDDEDILDI' })}>
                            Reddet<span className="visually-hidden"> #{shortId(request.id)}</span>
                          </button>
                        </div>
                      ) : (
                        <span className="adm-cell__sub">Sonuçlandı</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {deciding ? (
        <DecisionDialog
          key={`${deciding.request.id}-${deciding.status}`}
          request={deciding.request}
          status={deciding.status}
          onClose={() => setDeciding(null)}
          onDone={(updated) => {
            setReturns((current) => current?.map((item) => (item.id === updated.id ? { ...item, status: updated.status, adminNotes: updated.adminNotes } : item)) ?? null);
            setDeciding(null);
            success(`İade #${shortId(updated.id)} ${updated.status === 'ONAYLANDI' ? 'onaylandı' : 'reddedildi'}.`);
          }}
        />
      ) : null}
    </div>
  );
}

function DecisionDialog({
  request,
  status,
  onClose,
  onDone,
}: {
  request: ReturnRequest;
  status: 'ONAYLANDI' | 'REDDEDILDI';
  onClose(): void;
  onDone(updated: Pick<ReturnRequest, 'id' | 'status' | 'adminNotes'>): void;
}) {
  const reject = status === 'REDDEDILDI';
  const [note, setNote] = useState(reject ? DEFAULT_REJECT_NOTE : '');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (pending) return;
    const trimmed = note.trim();
    if (reject && !trimmed) {
      setError('Reddetme gerekçesini yazın; müşteri bu metni görür.');
      return;
    }
    setPending(true);
    setError(null);
    try {
      await sendJson('/api/admin/returns', 'PATCH', { id: request.id, status, adminNotes: trimmed || undefined }, 'İade durumu güncellenemedi.');
      onDone({ id: request.id, status, adminNotes: trimmed || request.adminNotes });
    } catch (err) {
      setError(errorText(err, 'İade durumu güncellenemedi.'));
      setPending(false);
    }
  };

  return (
    <Dialog open onClose={() => !pending && onClose()} title={reject ? 'İadeyi reddet' : 'İadeyi onayla'} eyebrow={`Talep #${shortId(request.id)} · sipariş #${request.order?.orderNumber ?? request.orderId}`} className="adm-dialog">
      <form className="adm-form" onSubmit={submit} noValidate>
        <div className="adm-dialog__lead">
          <p>Müşterinin gerekçesi: “{request.reason}”</p>
        </div>
        <div className="adm-field">
          <label htmlFor="return-note">{reject ? 'Reddetme gerekçesi' : 'Müşteriye not (isteğe bağlı)'}</label>
          <textarea
            id="return-note"
            rows={3}
            maxLength={500}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            aria-invalid={Boolean(error && reject && !note.trim())}
            aria-describedby="return-note-hint"
          />
          <p id="return-note-hint" className="adm-field__hint">
            Müşteri bu metni hesabındaki iade ve sipariş sayfasında görür.
          </p>
        </div>
        {error ? (
          <p className="adm-field-error adm-dialog__error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="adm-dialog__actions">
          <button type="button" className="adm-btn" onClick={onClose} disabled={pending}>
            Vazgeç
          </button>
          <button type="submit" className={`adm-btn ${reject ? 'adm-btn--danger' : 'adm-btn--primary'}`} disabled={pending} aria-busy={pending}>
            {pending ? 'Kaydediliyor' : reject ? 'Reddet' : 'Onayla'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
