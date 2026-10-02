'use client';

import React, { useState } from 'react';
import Dialog from '@/components/ui/Dialog';
import { errorText } from '../../_lib/request';
import { CARRIERS, type AdminOrder, type UpdateOrders } from './types';

/** Carrier + tracking code for one order; can also mark it shipped in the same save. */
export default function TrackingDialog({
  order,
  updateOrders,
  onClose,
  onSaved,
}: {
  order: AdminOrder;
  updateOrders: UpdateOrders;
  onClose(): void;
  onSaved(message: string): void;
}) {
  const [company, setCompany] = useState(order.trackingCompany || CARRIERS[0]);
  const [code, setCode] = useState(order.trackingCode || '');
  const [codeError, setCodeError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState<'save' | 'ship' | null>(null);
  const canShip = order.status === 'ODENDI' || order.status === 'HAZIRLANIYOR';

  const save = async (ship: boolean) => {
    if (pending) return;
    const trimmed = code.trim();
    if (!trimmed) {
      setCodeError('Takip numarasını girin.');
      document.getElementById('tracking-code')?.focus();
      return;
    }
    setPending(ship ? 'ship' : 'save');
    setFormError(null);
    try {
      await updateOrders(
        { orderId: order.id, trackingCompany: company, trackingCode: trimmed, ...(ship ? { status: 'KARGODA' } : {}) },
        'Kargo bilgisi kaydedilemedi.',
      );
      onSaved(ship ? `#${order.orderNumber} kargoya verildi.` : `#${order.orderNumber} takip bilgisi kaydedildi.`);
    } catch (err) {
      setFormError(errorText(err, 'Kargo bilgisi kaydedilemedi.'));
      setPending(null);
    }
  };

  return (
    <Dialog open onClose={() => !pending && onClose()} title="Kargo takip bilgisi" eyebrow={`Sipariş #${order.orderNumber}`} className="adm-dialog">
      <form
        className="adm-form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void save(false);
        }}
      >
        <dl className="adm-dl">
          <div>
            <dt>Müşteri</dt>
            <dd>{order.customerName}</dd>
          </div>
          <div>
            <dt>Teslimat</dt>
            <dd>
              {order.shippingDistrict} / {order.shippingCity}
            </dd>
          </div>
        </dl>
        <div className="adm-form__grid">
          <div className="adm-field">
            <label htmlFor="tracking-company">Kargo firması</label>
            <select id="tracking-company" value={company} onChange={(e) => setCompany(e.target.value)}>
              {CARRIERS.map((carrier) => (
                <option key={carrier} value={carrier}>
                  {carrier}
                </option>
              ))}
              {order.trackingCompany && !(CARRIERS as readonly string[]).includes(order.trackingCompany) ? (
                <option value={order.trackingCompany}>{order.trackingCompany}</option>
              ) : null}
            </select>
          </div>
          <div className="adm-field">
            <label htmlFor="tracking-code">Takip numarası</label>
            <input
              id="tracking-code"
              data-autofocus
              autoComplete="off"
              spellCheck={false}
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setCodeError(null);
              }}
              aria-invalid={Boolean(codeError) || undefined}
              aria-describedby={codeError ? 'tracking-code-error' : undefined}
            />
            {codeError ? (
              <p id="tracking-code-error" className="adm-field-error">
                {codeError}
              </p>
            ) : null}
          </div>
        </div>
        {canShip ? <p className="adm-field__hint">“Kaydet ve kargoya ver” siparişi Kargoda yapar; müşteriye takip numaralı kargo e-postası gönderilir.</p> : null}
        {formError ? (
          <p className="adm-field-error adm-dialog__error" role="alert">
            {formError}
          </p>
        ) : null}
        <div className="adm-dialog__actions">
          <button type="button" className="adm-btn" onClick={onClose} disabled={Boolean(pending)}>
            Vazgeç
          </button>
          <button type="submit" className={`adm-btn ${canShip ? '' : 'adm-btn--primary'}`} disabled={Boolean(pending)} aria-busy={pending === 'save'}>
            {pending === 'save' ? 'Kaydediliyor' : 'Yalnız kaydet'}
          </button>
          {canShip ? (
            <button type="button" className="adm-btn adm-btn--primary" onClick={() => save(true)} disabled={Boolean(pending)} aria-busy={pending === 'ship'}>
              {pending === 'ship' ? 'Kaydediliyor' : 'Kaydet ve kargoya ver'}
            </button>
          ) : null}
        </div>
      </form>
    </Dialog>
  );
}
