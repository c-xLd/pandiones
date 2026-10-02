'use client';

import React, { useEffect, useState } from 'react';
import Dialog from '@/components/ui/Dialog';
import { carrierTrackingUrl, customerTrackingWhatsAppUrl } from '@/lib/orders';
import { money } from '../../_lib/format';
import { errorText } from '../../_lib/request';
import AdminIcon from '../AdminIcon';
import OrderStatus from '../OrderStatus';
import { CARRIERS, STATUS_OPTIONS, statusLabel, type AdminOrder, type UpdateOrders } from './types';

const dateTime = (value: string) =>
  new Date(value).toLocaleString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

type Saving = 'status' | 'tracking' | 'notes' | null;

/** Order detail as a side sheet: status, tracking, internal note, items, totals and payment records. */
export default function OrderDetailDialog({
  order,
  updateOrders,
  onClose,
  onPrint,
  onSaved,
}: {
  order: AdminOrder;
  updateOrders: UpdateOrders;
  onClose(): void;
  onPrint(order: AdminOrder): void;
  onSaved(message: string): void;
}) {
  const [carrier, setCarrier] = useState(order.trackingCompany || CARRIERS[0]);
  const [trackingCode, setTrackingCode] = useState(order.trackingCode || '');
  const [notes, setNotes] = useState(order.adminNotes || '');
  const [saving, setSaving] = useState<Saving>(null);
  const [errors, setErrors] = useState<Partial<Record<Exclude<Saving, null>, string>>>({});
  const [copied, setCopied] = useState<'ok' | 'fail' | null>(null);

  // Saved values come back through `order`; keep unsaved edits otherwise.
  useEffect(() => setNotes(order.adminNotes || ''), [order.adminNotes]);
  useEffect(() => {
    setCarrier(order.trackingCompany || CARRIERS[0]);
    setTrackingCode(order.trackingCode || '');
  }, [order.trackingCompany, order.trackingCode]);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(null), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const run = async (kind: Exclude<Saving, null>, patch: Parameters<UpdateOrders>[0], fallback: string, message: string) => {
    if (saving) return;
    setSaving(kind);
    setErrors((current) => ({ ...current, [kind]: undefined }));
    try {
      await updateOrders({ orderId: order.id, ...patch }, fallback);
      onSaved(message);
    } catch (err) {
      setErrors((current) => ({ ...current, [kind]: errorText(err, fallback) }));
    } finally {
      setSaving(null);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(order.trackingCode || '');
      setCopied('ok');
    } catch {
      setCopied('fail');
    }
  };

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
  const trackingChanged = carrier !== (order.trackingCompany || CARRIERS[0]) || trackingCode.trim() !== (order.trackingCode || '');
  const itemsTotal = (order.items ?? []).reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <Dialog
      open
      onClose={() => !saving && onClose()}
      title={`#${order.orderNumber}`}
      eyebrow={dateTime(order.createdAt)}
      className="adm-dialog adm-dialog--sheet"
      size="lg"
      headerActions={
        <button type="button" className="adm-btn adm-btn--sm" onClick={() => onPrint(order)}>
          <AdminIcon name="print" />
          <span>Depo fişi</span>
        </button>
      }
    >
      <div className="adm-form">
        <section className="adm-sheet__panel" aria-labelledby="order-status-heading">
          <div className="adm-sheet__panel-head">
            <h3 id="order-status-heading" className="adm-dialog__heading">
              Durum
            </h3>
            <OrderStatus status={order.status} />
          </div>
          <div className="adm-field">
            <label htmlFor="order-status" className="visually-hidden">
              Sipariş durumu
            </label>
            <select
              id="order-status"
              value={order.status}
              disabled={Boolean(saving)}
              aria-busy={saving === 'status'}
              onChange={(e) => run('status', { status: e.target.value }, 'Durum güncellenemedi.', `#${order.orderNumber}: ${statusLabel(e.target.value)}.`)}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="adm-field__hint">{saving === 'status' ? 'Kaydediliyor' : 'Kargoda yapıldığında takip numarası kayıtlıysa müşteriye kargo e-postası gönderilir.'}</p>
            {errors.status ? (
              <p className="adm-field-error" role="alert">
                {errors.status}
              </p>
            ) : null}
          </div>
        </section>

        <section className="adm-sheet__panel" aria-labelledby="order-tracking-heading">
          <h3 id="order-tracking-heading" className="adm-dialog__heading">
            Kargo
          </h3>
          <form
            className="adm-form__grid adm-form__grid--inline"
            onSubmit={(e) => {
              e.preventDefault();
              if (!trackingCode.trim()) {
                setErrors((current) => ({ ...current, tracking: 'Takip numarasını girin.' }));
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
                {order.trackingCompany && !(CARRIERS as readonly string[]).includes(order.trackingCompany) ? (
                  <option value={order.trackingCompany}>{order.trackingCompany}</option>
                ) : null}
              </select>
            </div>
            <div className="adm-field">
              <label htmlFor="detail-code">Takip numarası</label>
              <input
                id="detail-code"
                autoComplete="off"
                spellCheck={false}
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
          <textarea
            id="order-notes"
            className="adm-sheet__textarea"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            aria-describedby="order-notes-hint"
          />
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
          </dl>
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
                    <th scope="col" className="adm-num">Tutar</th>
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
        </section>
      </div>
    </Dialog>
  );
}
