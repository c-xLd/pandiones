'use client';

import React, { useState } from 'react';
import Dialog from '@/components/ui/Dialog';
import { errorText } from '../../_lib/request';
import { CARRIERS, allowedNext, type AdminOrder, type UpdateOrders } from './types';

export type SavedTone = 'success' | 'error';

/** Carrier + tracking code for one order; can also move it to Kargoda in the same save. */
export default function TrackingDialog({
  order,
  shipByDefault = false,
  updateOrders,
  onClose,
  onSaved,
}: {
  order: AdminOrder;
  shipByDefault?: boolean;
  updateOrders: UpdateOrders;
  onClose(): void;
  onSaved(message: string, tone: SavedTone): void;
}) {
  const [company, setCompany] = useState(order.trackingCompany && (CARRIERS as readonly string[]).includes(order.trackingCompany) ? order.trackingCompany : CARRIERS[0]);
  const [code, setCode] = useState(order.trackingCode || '');
  const [codeError, setCodeError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState<'save' | 'ship' | null>(null);
  const canShip = allowedNext(order.status).includes('KARGODA');

  const save = async (ship: boolean) => {
    if (pending) return;
    const trimmed = code.trim();
    if (!/^[A-Za-z0-9-]{6,40}$/.test(trimmed)) {
      setCodeError('Takip numarası 6–40 karakter olmalı; yalnız harf, rakam ve tire.');
      document.getElementById('tracking-code')?.focus();
      return;
    }
    setPending(ship ? 'ship' : 'save');
    setFormError(null);
    try {
      const result = await updateOrders(
        { orderId: order.id, trackingCompany: company, trackingCode: trimmed, ...(ship ? { status: 'KARGODA' } : {}) },
        'Kargo bilgisi kaydedilemedi.',
      );
      if (result.emails.failed.length) onSaved(`#${order.orderNumber} kargoya verildi ama müşteriye kargo e-postası gönderilemedi.`, 'error');
      else onSaved(ship ? `#${order.orderNumber} kargoya verildi; müşteriye kargo e-postası gönderildi.` : `#${order.orderNumber} takip bilgisi kaydedildi.`, 'success');
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
          void save(shipByDefault && canShip);
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
            </select>
          </div>
          <div className="adm-field">
            <label htmlFor="tracking-code">Takip numarası</label>
            <input
              id="tracking-code"
              data-autofocus
              autoComplete="off"
              spellCheck={false}
              maxLength={40}
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setCodeError(null);
              }}
              aria-invalid={Boolean(codeError) || undefined}
              aria-describedby={codeError ? 'tracking-code-error' : 'tracking-code-hint'}
            />
            {codeError ? (
              <p id="tracking-code-error" className="adm-field-error">
                {codeError}
              </p>
            ) : (
              <p id="tracking-code-hint" className="adm-field__hint">
                Harf, rakam ve tire; 6–40 karakter.
              </p>
            )}
          </div>
        </div>
        {canShip ? <p className="adm-field__hint">“Kaydet ve kargoya ver” siparişi Kargoda yapar ve müşteriye takip numaralı kargo e-postası gönderir; gönderilemezse size bildirilir.</p> : null}
        {formError ? (
          <p className="adm-field-error adm-dialog__error" role="alert">
            {formError}
          </p>
        ) : null}
        <div className="adm-dialog__actions">
          <button type="button" className="adm-btn" onClick={onClose} disabled={Boolean(pending)}>
            Vazgeç
          </button>
          <button type="button" className={`adm-btn ${canShip ? '' : 'adm-btn--primary'}`} onClick={() => save(false)} disabled={Boolean(pending)} aria-busy={pending === 'save'}>
            {pending === 'save' ? 'Kaydediliyor' : canShip ? 'Yalnız kaydet' : 'Kaydet'}
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
