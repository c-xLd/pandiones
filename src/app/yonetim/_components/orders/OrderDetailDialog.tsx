'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { vatIncluded } from '@/lib/products/commerce-fields';
import Dialog from '@/components/ui/Dialog';
import { carrierTrackingUrl, customerTrackingWhatsAppUrl } from '@/lib/orders';
import { money } from '../../_lib/format';
import { errorText, loadJson } from '../../_lib/request';
import { adminFetch } from '../../_lib/admin-fetch';
import AdminIcon from '../AdminIcon';
import OrderStatus from '../OrderStatus';
import { TabLoadError, TabLoading } from '../TabState';
import { CARRIERS, allowedNext, isBackward, stepLabel, type AdminOrder, type ShippingConfig, type TimelineEntry, type UpdateOrders } from './types';
import type { SavedTone } from './TrackingDialog';
import ShipmentPanel from './ShipmentPanel';

const dateTime = (value: string) =>
  new Date(value).toLocaleString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

type Saving = 'status' | 'tracking' | 'notes' | null;
type Detail = { order: AdminOrder; timeline: TimelineEntry[] };

/** Order detail as a side sheet: allowed next steps, tracking, internal note, items, payments and timeline. */
export default function OrderDetailDialog({
  orderId,
  updateOrders,
  onClose,
  onPrint,
  onPrintLabel,
  onNotify,
  onShipmentChanged,
  shippingConfig,
}: {
  orderId: string;
  updateOrders: UpdateOrders;
  onClose(): void;
  onPrint(order: AdminOrder): void;
  onPrintLabel(order: AdminOrder): void;
  onNotify(message: string, tone: SavedTone): void;
  /** The list refreshes after a shipment change (status and tracking columns). */
  onShipmentChanged(): void;
  shippingConfig: ShippingConfig | null;
}) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [carrier, setCarrier] = useState<string>(CARRIERS[0]);
  const [trackingCode, setTrackingCode] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState<Saving>(null);
  const [errors, setErrors] = useState<Partial<Record<Exclude<Saving, null>, string>>>({});
  const [confirmBack, setConfirmBack] = useState<string | null>(null);
  const [copied, setCopied] = useState<'ok' | 'fail' | null>(null);
  const [refunding, setRefunding] = useState(false);
  const [showRefundConfirm, setShowRefundConfirm] = useState(false);
  const [refundError, setRefundError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const data = await loadJson<Detail>(`/api/admin/orders/${orderId}`, 'Sipariş yüklenemedi.', (body) => Boolean((body as Detail | null)?.order));
      setDetail(data);
      setCarrier(data.order.trackingCompany && (CARRIERS as readonly string[]).includes(data.order.trackingCompany) ? data.order.trackingCompany : CARRIERS[0]);
      setTrackingCode(data.order.trackingCode || '');
      setNotes(data.order.adminNotes || '');
    } catch (err) {
      setLoadError(errorText(err, 'Sipariş yüklenemedi.'));
    }
  }, [orderId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(null), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const order = detail?.order;

  const run = async (kind: Exclude<Saving, null>, patch: Parameters<UpdateOrders>[0], fallback: string, message: string) => {
    if (saving || !order) return;
    setSaving(kind);
    setErrors((current) => ({ ...current, [kind]: undefined }));
    try {
      const result = await updateOrders({ orderId: order.id, ...patch }, fallback);
      if (result.emails.failed.length) onNotify(`${message} Müşteriye kargo e-postası gönderilemedi.`, 'error');
      else onNotify(message, 'success');
      setConfirmBack(null);
      await load();
    } catch (err) {
      setErrors((current) => ({ ...current, [kind]: errorText(err, fallback) }));
    } finally {
      setSaving(null);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(order?.trackingCode || '');
      setCopied('ok');
    } catch {
      setCopied('fail');
    }
  };

  const canRefund = Boolean(
    order &&
    order.status !== 'IADE_EDILDI' &&
    order.status !== 'IPTAL_EDILDI' &&
    order.totalAmount > 0 &&
    order.transactions?.some((t) => t.status === 'SUCCESS')
  );

  const handleRefund = async () => {
    if (refunding || !order) return;
    setRefunding(true);
    setRefundError(null);
    try {
      const res = await adminFetch('/api/admin/payments/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id, confirm: 'IADE' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Ödeme iade edilemedi.');
      }
      setShowRefundConfirm(false);
      onNotify(`#${order.orderNumber} tutarı (${money(order.totalAmount)}) iade edildi.`, 'success');
      await load();
      await updateOrders({ orderId: order.id, status: 'IADE_EDILDI' }, 'Sipariş durumu güncellenemedi.').catch(() => null);
    } catch (err) {
      setRefundError(errorText(err, 'İade işlemi başarısız oldu.'));
    } finally {
      setRefunding(false);
    }
  };

  const title = order ? `#${order.orderNumber}` : 'Sipariş';
  const content = (() => {
    if (loadError) return <TabLoadError message={loadError} onRetry={load} />;
    if (!order || !detail) return <TabLoading label="Sipariş yükleniyor" />;

    const steps = allowedNext(order.status);
    const savedCode = order.trackingCode || '';
    const trackingUrl = carrierTrackingUrl(order.trackingCompany, order.trackingCode);
    const whatsappUrl = order.trackingCode
      ? customerTrackingWhatsAppUrl({
          customerPhone: order.customerPhone,
          customerName: order.customerName,
          orderNumber: order.orderNumber,
          trackingCompany: order.trackingCompany,
          trackingCode: order.trackingCode,
        })
      : null;
    const notesChanged = notes !== (order.adminNotes || '');
    const trackingChanged = carrier !== (order.trackingCompany || CARRIERS[0]) || trackingCode.trim() !== savedCode;
    const itemsTotal = (order.items ?? []).reduce((sum, item) => sum + item.price * item.quantity, 0);
    // VAT inside the prices, per rate, on what the customer actually paid for the goods (after the coupon).
    const discountShare = itemsTotal > 0 ? Math.max(0, itemsTotal - (order.discountAmount ?? 0)) / itemsTotal : 1;
    const vatByRate = new Map<number, number>();
    for (const item of order.items ?? []) {
      if (item.vatRate === null || item.vatRate === undefined) continue;
      vatByRate.set(item.vatRate, (vatByRate.get(item.vatRate) ?? 0) + vatIncluded(item.price * item.quantity * discountShare, item.vatRate));
    }
    const lastEmail = [...detail.timeline].reverse().find((entry) => entry.kind === 'email');

    return (
      <div className="adm-form">
        {lastEmail?.tone === 'danger' ? (
          <p className="adm-notice adm-notice--error" role="alert">
            <span>Son kargo e-postası müşteriye gönderilemedi. Takip numarasını müşteriye kendiniz iletin.</span>
          </p>
        ) : null}

        <section className="adm-sheet__panel" aria-labelledby="order-status-heading">
          <div className="adm-sheet__panel-head">
            <h3 id="order-status-heading" className="adm-dialog__heading">
              Durum
            </h3>
            <OrderStatus status={order.status} />
          </div>
          {steps.length ? (
            <div className="adm-sheet__links">
              {steps.map((next) => {
                const back = isBackward(order.status, next);
                const blocked = next === 'KARGODA' && !savedCode;
                if (back && confirmBack === next) {
                  return (
                    <span key={next} className="adm-confirm-inline" role="group" aria-label="Geri almayı onayla">
                      <span>Emin misiniz?</span>
                      <button
                        type="button"
                        className="adm-btn adm-btn--sm adm-btn--danger"
                        disabled={Boolean(saving)}
                        aria-busy={saving === 'status'}
                        onClick={() => run('status', { status: next }, 'Durum güncellenemedi.', `#${order.orderNumber} geri alındı.`)}
                      >
                        {saving === 'status' ? 'Kaydediliyor' : 'Evet, geri al'}
                      </button>
                      <button type="button" className="adm-btn adm-btn--sm adm-btn--quiet" onClick={() => setConfirmBack(null)}>
                        Vazgeç
                      </button>
                    </span>
                  );
                }
                return (
                  <button
                    key={next}
                    type="button"
                    className={`adm-btn adm-btn--sm ${back ? 'adm-btn--quiet' : next === steps[0] ? 'adm-btn--primary' : ''}`}
                    disabled={Boolean(saving) || blocked}
                    aria-busy={saving === 'status'}
                    aria-describedby={blocked ? 'order-ship-blocked' : undefined}
                    onClick={() => (back ? setConfirmBack(next) : run('status', { status: next }, 'Durum güncellenemedi.', `#${order.orderNumber}: ${stepLabel(order.status, next)}.`))}
                  >
                    {stepLabel(order.status, next)}
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="adm-field__hint">
              {order.status === 'TESLIM_EDILDI' ? 'Teslim edilmiş sipariş son durumdadır.' : 'Ödeme tamamlanmadan durum panelden değiştirilemez.'}
            </p>
          )}
          {steps.includes('KARGODA') && !savedCode ? (
            <p id="order-ship-blocked" className="adm-field__hint">
              Kargoya vermek için önce aşağıya takip numarasını kaydedin.
            </p>
          ) : null}
          {errors.status ? (
            <p className="adm-field-error" role="alert">
              {errors.status}
            </p>
          ) : null}
        </section>

        <ShipmentPanel
          key={order.shipments?.length ?? 0}
          order={order}
          config={shippingConfig}
          onNotify={onNotify}
          onPrintLabel={() => onPrintLabel({ ...order, shipments: (order.shipments ?? []).filter((item) => item.status !== 'IPTAL').slice(-1) })}
          onChanged={async () => {
            await load();
            onShipmentChanged();
          }}
        />

        <section className="adm-sheet__panel" aria-labelledby="order-tracking-heading">
          <h3 id="order-tracking-heading" className="adm-dialog__heading">
            Kargo
          </h3>
          <form
            className="adm-form__grid adm-form__grid--inline"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              if (!/^[A-Za-z0-9-]{6,40}$/.test(trackingCode.trim())) {
                setErrors((current) => ({ ...current, tracking: 'Takip numarası 6–40 karakter olmalı; yalnız harf, rakam ve tire.' }));
                return;
              }
              void run('tracking', { trackingCompany: carrier, trackingCode: trackingCode.trim() }, 'Kargo bilgisi kaydedilemedi.', `#${order.orderNumber} takip bilgisi kaydedildi.`);
            }}
          >
            <div className="adm-field">
              <label htmlFor="detail-carrier">Firma</label>
              <select id="detail-carrier" value={carrier} onChange={(e) => setCarrier(e.target.value)}>
                {CARRIERS.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
            <div className="adm-field">
              <label htmlFor="detail-code">Takip numarası</label>
              <input
                id="detail-code"
                autoComplete="off"
                spellCheck={false}
                maxLength={40}
                value={trackingCode}
                onChange={(e) => {
                  setTrackingCode(e.target.value);
                  setErrors((current) => ({ ...current, tracking: undefined }));
                }}
                aria-invalid={Boolean(errors.tracking) || undefined}
              />
            </div>
            <button type="submit" className="adm-btn adm-btn--primary adm-form__submit" disabled={Boolean(saving) || !trackingChanged} aria-busy={saving === 'tracking'}>
              {saving === 'tracking' ? 'Kaydediliyor' : 'Kaydet'}
            </button>
          </form>
          {errors.tracking ? (
            <p className="adm-field-error" role="alert">
              {errors.tracking}
            </p>
          ) : null}
          {order.trackingCode ? (
            <div className="adm-sheet__links">
              <button type="button" className="adm-btn adm-btn--sm adm-btn--quiet" onClick={copy}>
                <AdminIcon name="copy" />
                <span>{copied === 'ok' ? 'Kopyalandı' : copied === 'fail' ? 'Kopyalanamadı' : 'Numarayı kopyala'}</span>
              </button>
              {trackingUrl ? (
                <a href={trackingUrl} target="_blank" rel="noreferrer" className="adm-btn adm-btn--sm adm-btn--quiet">
                  Kargo takip sayfası<span className="visually-hidden"> (yeni sekmede açılır)</span>
                  <AdminIcon name="arrow" />
                </a>
              ) : null}
              {whatsappUrl ? (
                <a href={whatsappUrl} target="_blank" rel="noreferrer" className="adm-btn adm-btn--sm adm-btn--quiet">
                  WhatsApp ile takip numarasını gönder<span className="visually-hidden"> (yeni sekmede açılır)</span>
                  <AdminIcon name="arrow" />
                </a>
              ) : null}
            </div>
          ) : null}
        </section>

        <div className="adm-sheet__columns">
          <section className="adm-sheet__panel" aria-labelledby="order-customer-heading">
            <h3 id="order-customer-heading" className="adm-dialog__heading">
              Müşteri
            </h3>
            <p className="adm-cell__main">{order.customerName}</p>
            <p className="adm-cell__sub">{order.customerEmail}</p>
            <p className="adm-cell__sub">{order.customerPhone}</p>
          </section>
          <section className="adm-sheet__panel" aria-labelledby="order-address-heading">
            <h3 id="order-address-heading" className="adm-dialog__heading">
              Teslimat adresi
            </h3>
            <p>{order.shippingAddress}</p>
            <p className="adm-cell__main">
              {order.shippingDistrict} / {order.shippingCity}
            </p>
            {order.shippingNotes ? <p className="adm-sheet__quote">Müşteri notu: {order.shippingNotes}</p> : null}
          </section>
        </div>

        <section className="adm-sheet__panel" aria-labelledby="order-notes-heading">
          <h3 id="order-notes-heading" className="adm-dialog__heading">
            <label htmlFor="order-notes">Yönetici notu</label>
          </h3>
          <textarea id="order-notes" className="adm-sheet__textarea" rows={3} maxLength={2000} value={notes} onChange={(e) => setNotes(e.target.value)} aria-describedby="order-notes-hint" />
          <div className="adm-sheet__row">
            <p id="order-notes-hint" className="adm-field__hint">
              Yalnız panelde ve depo fişinde görünür; müşteriye gösterilmez.
            </p>
            <button
              type="button"
              className="adm-btn adm-btn--sm"
              disabled={Boolean(saving) || !notesChanged}
              aria-busy={saving === 'notes'}
              onClick={() => run('notes', { adminNotes: notes }, 'Not kaydedilemedi.', `#${order.orderNumber} notu kaydedildi.`)}
            >
              {saving === 'notes' ? 'Kaydediliyor' : 'Notu kaydet'}
            </button>
          </div>
          {errors.notes ? (
            <p className="adm-field-error" role="alert">
              {errors.notes}
            </p>
          ) : null}
        </section>

        <section className="adm-sheet__panel" aria-labelledby="order-items-heading">
          <h3 id="order-items-heading" className="adm-dialog__heading">
            Ürünler ({order.items?.length ?? 0})
          </h3>
          <ul className="adm-dialog__list adm-sheet__items">
            {order.items?.map((item) => (
              <li key={item.id}>
                <span className="adm-row__thumb" aria-hidden="true">
                  {item.product?.image ? <img src={item.product.image} alt="" loading="lazy" /> : null}
                </span>
                <span className="adm-cell">
                  <span className="adm-cell__main">{item.productName}</span>
                  <span className="adm-cell__sub">
                    Beden {item.size} · {item.quantity} × {money(item.price)}
                  </span>
                </span>
                <span className="adm-num">{money(item.price * item.quantity)}</span>
              </li>
            ))}
          </ul>
          <dl className="adm-sheet__totals">
            <div>
              <dt>Ürünler</dt>
              <dd>{money(itemsTotal)}</dd>
            </div>
            {order.discountAmount ? (
              <div>
                <dt>Kupon {order.couponCode ? `(${order.couponCode})` : ''}</dt>
                <dd>−{money(order.discountAmount)}</dd>
              </div>
            ) : null}
            {order.giftCardAmount ? (
              <div>
                <dt>Hediye kartı {order.giftCardCode ? `(${order.giftCardCode})` : ''}</dt>
                <dd>−{money(order.giftCardAmount)}</dd>
              </div>
            ) : null}
            <div className="adm-sheet__grand">
              <dt>Tahsil edilen</dt>
              <dd>{money(order.totalAmount)}</dd>
            </div>
            {[...vatByRate.entries()]
              .sort(([a], [b]) => a - b)
              .map(([rate, amount]) => (
                <div key={rate}>
                  <dt>Fiyata dahil KDV (%{rate})</dt>
                  <dd>{money(amount)}</dd>
                </div>
              ))}
          </dl>
        </section>

        <section className="adm-sheet__panel" aria-labelledby="order-timeline-heading">
          <h3 id="order-timeline-heading" className="adm-dialog__heading">
            Zaman çizelgesi
          </h3>
          <ol className="adm-timeline adm-timeline--sheet">
            {detail.timeline.map((entry, index) => (
              <li key={`${entry.at}-${index}`} className="adm-timeline__item" data-tone={entry.tone}>
                <time dateTime={entry.at}>{new Date(entry.at).toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</time>
                <div>
                  <p className="adm-timeline__summary">{entry.title}</p>
                  {entry.detail ? <p className="adm-timeline__actor">{entry.detail}</p> : null}
                  {entry.actor ? <p className="adm-timeline__actor">{entry.actor}</p> : null}
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="adm-sheet__panel" aria-labelledby="order-payments-heading">
          <h3 id="order-payments-heading" className="adm-dialog__heading">
            Ödeme kayıtları ({order.transactions?.length ?? 0})
          </h3>
          {order.transactions?.length ? (
            <div className="adm-table-scroll adm-table-scroll--flat">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th scope="col">İşlem</th>
                    <th scope="col">Kart</th>
                    <th scope="col" className="adm-num">
                      Tutar
                    </th>
                    <th scope="col">Sonuç</th>
                    <th scope="col">Tarih</th>
                  </tr>
                </thead>
                <tbody>
                  {order.transactions.map((tx) => (
                    <tr key={tx.id}>
                      <td>
                        <div className="adm-cell">
                          <code className="adm-cat__slug">{tx.conversationId}</code>
                          {tx.paymentId ? <span className="adm-cell__sub">Ödeme no: {tx.paymentId}</span> : null}
                        </div>
                      </td>
                      <td>
                        <div className="adm-cell">
                          <span>
                            {tx.cardAssociation || tx.provider} {tx.cardFamily ? `(${tx.cardFamily})` : ''}
                          </span>
                          <span className="adm-cell__sub">
                            {tx.lastFourDigits ? `•••• ${tx.lastFourDigits} · ` : ''}
                            {tx.installment > 1 ? `${tx.installment} taksit` : 'Tek çekim'}
                          </span>
                        </div>
                      </td>
                      <td className="adm-num">{money(tx.amount)}</td>
                      <td>
                        <div className="adm-cell">
                          <span className={`adm-status adm-status--${tx.status === 'SUCCESS' ? 'success' : 'danger'}`}>{tx.status === 'SUCCESS' ? 'Başarılı' : tx.status}</span>
                          {tx.errorMessage ? <span className="adm-cell__sub adm-text-danger">{tx.errorMessage}</span> : null}
                        </div>
                      </td>
                      <td className="adm-cell__sub">{dateTime(tx.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="adm-cell__sub">Bu siparişe bağlı ödeme kaydı yok.</p>
          )}
          {canRefund ? (
            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="adm-btn adm-btn--sm adm-btn--danger"
                disabled={refunding}
                onClick={() => {
                  setRefundError(null);
                  setShowRefundConfirm(true);
                }}
              >
                Ödemeyi iade et
              </button>
            </div>
          ) : null}
        </section>
      </div>
    );
  })();

  return (
    <>
      <Dialog
        open
        onClose={() => !saving && onClose()}
        title={title}
        eyebrow={order ? dateTime(order.createdAt) : undefined}
        className="adm-dialog adm-dialog--sheet"
        size="lg"
        headerActions={
          order ? (
            <button type="button" className="adm-btn adm-btn--sm" onClick={() => onPrint(order)}>
              <AdminIcon name="print" />
              <span>Depo fişi</span>
            </button>
          ) : null
        }
      >
        {content}
      </Dialog>

      {showRefundConfirm && order ? (
        <Dialog
          open
          onClose={() => !refunding && setShowRefundConfirm(false)}
          title="Ödemeyi İade Et"
          className="adm-dialog adm-dialog--confirm"
        >
          <div className="adm-dialog__lead">
            <strong>#{order.orderNumber}</strong> numaralı siparişin tahsilatı (<strong>{money(order.totalAmount)}</strong>) iyzico üzerinden müşterinin kartına iade edilecektir. Bu işlem geri alınamaz.
          </div>
          {refundError ? (
            <p className="adm-field-error adm-dialog__error" role="alert">
              {refundError}
            </p>
          ) : null}
          <div className="adm-dialog__actions">
            <button
              type="button"
              className="adm-btn"
              onClick={() => setShowRefundConfirm(false)}
              disabled={refunding}
            >
              Vazgeç
            </button>
            <button
              type="button"
              className="adm-btn adm-btn--danger"
              onClick={handleRefund}
              disabled={refunding}
              aria-busy={refunding}
            >
              {refunding ? 'İade Ediliyor...' : 'Evet, İade Et'}
            </button>
          </div>
        </Dialog>
      ) : null}
    </>
  );
}
