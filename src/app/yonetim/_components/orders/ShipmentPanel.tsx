'use client';

import React, { useState } from 'react';
import { MANUAL_UPDATES, canMoveShipment, shipmentStatusLabel } from '@/lib/shipping/statuses';
import { errorText, sendJson } from '../../_lib/request';
import AdminIcon from '../AdminIcon';
import type { AdminOrder, ShipmentDetail, ShippingConfig } from './types';

type Busy = 'create' | 'barcode' | 'handover' | 'status' | 'cancel' | null;

const shortDateTime = (iso: string) => new Date(iso).toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const TONE: Record<string, string> = { ETIKET_HAZIR: 'warning', KABUL: 'success', DAGITIMDA: 'success', TESLIM_EDILDI: 'success', TESLIM_EDILEMEDI: 'danger', IADE: 'danger' };

/** The "Gönderi" section of the order sheet. */
export default function ShipmentPanel({
  order,
  config,
  onChanged,
  onNotify,
  onPrintLabel,
}: {
  order: AdminOrder;
  config: ShippingConfig | null;
  onChanged(): Promise<void> | void;
  onNotify(message: string, tone: 'success' | 'error'): void;
  onPrintLabel(): void;
}) {
  const shipments = (order.shipments ?? []) as ShipmentDetail[];
  const current = [...shipments].reverse().find((item) => item.status !== 'IPTAL') ?? null;
  const [desi, setDesi] = useState(String(config?.defaultDesi ?? 1));
  const [pieces, setPieces] = useState('1');
  const [weight, setWeight] = useState('');
  const [barcode, setBarcode] = useState(current?.barcode ?? '');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const run = async (kind: Exclude<Busy, null>, action: () => Promise<{ emails?: { failed: string[] } } | unknown>, done: string) => {
    if (busy) return;
    setBusy(kind);
    setError(null);
    try {
      const result = (await action()) as { emails?: { failed: string[] } } | undefined;
      if (result?.emails?.failed?.length) onNotify(`${done} Müşteriye kargo e-postası gönderilemedi.`, 'error');
      else onNotify(done, 'success');
      setConfirmCancel(false);
      setNote('');
      await onChanged();
    } catch (err) {
      setError(errorText(err, 'İşlem tamamlanamadı.'));
    } finally {
      setBusy(null);
    }
  };

  const patch = (body: Record<string, unknown>, fallback: string) => sendJson(`/api/admin/shipments/${current!.id}`, 'PATCH', body, fallback);
  const senderReady = config?.sender.complete ?? false;
  const apiMode = config?.ptt.mode === 'API';

  const errorLine = error ? (
    <p className="adm-field-error" role="alert">
      {error}
    </p>
  ) : null;

  if (!current) {
    const canCreate = ['ODENDI', 'HAZIRLANIYOR'].includes(order.status);
    return (
      <section className="adm-sheet__panel" aria-labelledby="shipment-heading">
        <h3 id="shipment-heading" className="adm-dialog__heading">
          PTT gönderisi
        </h3>
        {!canCreate ? (
          <p className="adm-field__hint">{order.trackingCode ? 'Bu sipariş gönderi kaydı olmadan kargoya verilmiş (takip numarası elle girildi).' : 'Gönderi yalnız ödenmiş ya da hazırlanan siparişe oluşturulur.'}</p>
        ) : !config ? (
          <p className="adm-field__hint">Kargo ayarları yükleniyor.</p>
        ) : !senderReady ? (
          <p className="adm-field__hint">
            Etiket için önce <a className="adm-link" href="/yonetim?tab=settings#ayar-shipping">Ayarlar → Kargo</a> bölümünde gönderici bilgilerini tamamlayın (eksik: {(config.sender as { missing: string[] }).missing.join(', ')}).
          </p>
        ) : (
          <form
            className="adm-form__grid adm-form__grid--inline adm-shipment__create"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              const desiValue = Number(desi);
              const piecesValue = Number(pieces);
              if (!(desiValue > 0 && desiValue <= 300)) return setError('Desi 0 ile 300 arasında olmalı.');
              if (!Number.isInteger(piecesValue) || piecesValue < 1 || piecesValue > 20) return setError('Koli sayısı 1–20 arasında olmalı.');
              void run(
                'create',
                () => sendJson('/api/admin/shipments', 'POST', { orderId: order.id, desi: desiValue, pieces: piecesValue, weightKg: weight ? Number(weight) : null }, 'Gönderi oluşturulamadı.'),
                `#${order.orderNumber} için gönderi oluşturuldu; etiketi yazdırabilirsiniz.`,
              );
            }}
          >
            <div className="adm-field">
              <label htmlFor="ship-desi">Desi</label>
              <input id="ship-desi" type="number" inputMode="decimal" min="0.1" step="0.1" value={desi} onChange={(e) => setDesi(e.target.value)} />
            </div>
            <div className="adm-field">
              <label htmlFor="ship-pieces">Koli</label>
              <input id="ship-pieces" type="number" inputMode="numeric" min="1" max="20" step="1" value={pieces} onChange={(e) => setPieces(e.target.value)} />
            </div>
            <div className="adm-field">
              <label htmlFor="ship-weight">Ağırlık (kg, isteğe bağlı)</label>
              <input id="ship-weight" type="number" inputMode="decimal" min="0.01" step="0.01" value={weight} onChange={(e) => setWeight(e.target.value)} />
            </div>
            <button type="submit" className="adm-btn adm-btn--primary adm-form__submit" disabled={Boolean(busy)} aria-busy={busy === 'create'}>
              {busy === 'create' ? 'Oluşturuluyor' : 'Gönderi oluştur'}
            </button>
          </form>
        )}
        {errorLine}
      </section>
    );
  }

  const manualSteps = MANUAL_UPDATES.filter((status) => canMoveShipment(current.status, status));

  return (
    <section className="adm-sheet__panel" aria-labelledby="shipment-heading">
      <div className="adm-sheet__panel-head">
        <h3 id="shipment-heading" className="adm-dialog__heading">
          PTT gönderisi · {current.reference}
        </h3>
        <span className={`adm-status adm-status--${TONE[current.status] ?? 'muted'}`}>{shipmentStatusLabel(current.status)}</span>
      </div>
      <p className="adm-field__hint">
        {current.desi} desi · {current.pieces} koli{current.weightKg ? ` · ${current.weightKg} kg` : ''} · {current.labelPrintedAt ? `etiket ${shortDateTime(current.labelPrintedAt)} basıldı` : 'etiket henüz basılmadı'}
        {current.mode === 'API' ? ' · PTT’ye kayıtlı' : ''}
      </p>

      <div className="adm-sheet__links">
        <button type="button" className="adm-btn adm-btn--sm" onClick={onPrintLabel} disabled={!senderReady}>
          <AdminIcon name="print" />
          <span>Kargo etiketi</span>
        </button>
        {current.status === 'ETIKET_HAZIR' && current.barcode ? (
          <button
            type="button"
            className="adm-btn adm-btn--sm adm-btn--primary"
            disabled={Boolean(busy)}
            aria-busy={busy === 'handover'}
            onClick={() => run('handover', () => patch({ action: 'handover' }, 'Kargoya verilemedi.'), `#${order.orderNumber} kargoya verildi; müşteriye kargo e-postası gönderildi.`)}
          >
            {busy === 'handover' ? 'Kaydediliyor' : 'Şubeye teslim ettim'}
          </button>
        ) : null}
      </div>

      {['ETIKET_HAZIR', 'KABUL'].includes(current.status) ? (
        <form
          className="adm-form__grid adm-form__grid--inline"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            if (!/^[A-Za-z0-9-]{6,40}$/.test(barcode.trim())) return setError('PTT barkodu 6–40 karakter; harf, rakam ve tire.');
            void run('barcode', () => patch({ action: 'barcode', barcode: barcode.trim() }, 'Barkod kaydedilemedi.'), apiMode ? 'Barkod PTT’ye kaydedildi.' : 'PTT barkodu kaydedildi.');
          }}
        >
          <div className="adm-field adm-shipment__barcode">
            <label htmlFor="ship-barcode">PTT barkodu</label>
            <input id="ship-barcode" autoComplete="off" spellCheck={false} maxLength={40} value={barcode} onChange={(e) => setBarcode(e.target.value)} aria-describedby="ship-barcode-hint" />
            <p id="ship-barcode-hint" className="adm-field__hint">
              {apiMode ? 'PTT’nin size verdiği barkod aralığından; kaydedince alıcı bilgileri PTT’ye yüklenir.' : 'Şubede verilen fişteki barkod numarası. Müşterinin takip numarası olur.'}
            </p>
          </div>
          <button type="submit" className="adm-btn adm-form__submit" disabled={Boolean(busy) || barcode.trim() === (current.barcode ?? '')} aria-busy={busy === 'barcode'}>
            {busy === 'barcode' ? 'Kaydediliyor' : current.barcode ? 'Barkodu güncelle' : 'Barkodu kaydet'}
          </button>
        </form>
      ) : null}

      {manualSteps.length && current.status !== 'ETIKET_HAZIR' ? (
        <div className="adm-shipment__manual">
          <div className="adm-field">
            <label htmlFor="ship-note">Hareket notu (isteğe bağlı)</label>
            <input id="ship-note" maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} aria-describedby="ship-manual-hint" />
            <p id="ship-manual-hint" className="adm-field__hint">
              {apiMode ? 'PTT hareketleri otomatik gelir; gerekirse elle de girebilirsiniz.' : 'PTT bağlantısı kurulana kadar hareketleri PTT takip sayfasına bakarak buradan girin.'}
            </p>
          </div>
          <div className="adm-sheet__links">
            {manualSteps.map((status) => (
              <button
                key={status}
                type="button"
                className={`adm-btn adm-btn--sm ${status === 'TESLIM_EDILDI' ? 'adm-btn--primary' : ''}`}
                disabled={Boolean(busy)}
                onClick={() => run('status', () => patch({ action: 'status', status, note }, 'Hareket kaydedilemedi.'), `#${order.orderNumber}: ${shipmentStatusLabel(status)}.`)}
              >
                {shipmentStatusLabel(status)}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {current.status === 'ETIKET_HAZIR' ? (
        confirmCancel ? (
          <span className="adm-confirm-inline">
            <span>Gönderi iptal edilsin mi?{current.barcode ? ' Takip numarası siparişten kaldırılır.' : ''}</span>
            <button type="button" className="adm-btn adm-btn--sm adm-btn--danger" disabled={Boolean(busy)} onClick={() => run('cancel', () => patch({ action: 'cancel' }, 'Gönderi iptal edilemedi.'), 'Gönderi iptal edildi.')}>
              {busy === 'cancel' ? 'İptal ediliyor' : 'Evet, iptal et'}
            </button>
            <button type="button" className="adm-btn adm-btn--sm adm-btn--quiet" onClick={() => setConfirmCancel(false)}>
              Vazgeç
            </button>
          </span>
        ) : (
          <button type="button" className="adm-btn adm-btn--sm adm-btn--quiet adm-btn--danger-text adm-shipment__cancel" onClick={() => setConfirmCancel(true)}>
            Gönderiyi iptal et
          </button>
        )
      ) : null}

      {errorLine}

      {current.events?.length ? (
        <ol className="adm-shipment__events">
          {[...current.events].reverse().map((event) => (
            <li key={event.id}>
              <time dateTime={event.at}>{shortDateTime(event.at)}</time>
              <span>
                {event.description}
                {event.location ? <span className="adm-cell__sub"> · {event.location}</span> : null}
              </span>
              <span className="adm-cell__sub">{event.source === 'PTT' ? 'PTT' : 'Panel'}</span>
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}
