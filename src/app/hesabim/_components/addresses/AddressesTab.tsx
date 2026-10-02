'use client';

import React, { useState } from 'react';
import Notice from '@/components/ui/Notice';
import { useCopy } from '@/lib/hooks/useCopy';
import { formatDate, type Order } from '../lib';
import AddressDialog from './AddressDialog';
import { useAddresses, type Address } from './useAddresses';

type AddressesTabProps = {
  enabled: boolean;
  orders: Order[];
  defaults: { recipient: string; phone: string };
};

const mapUrl = (a: { address: string; district: string; city: string }) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${a.address}, ${a.district}, ${a.city}`)}`;

const pastOrderAddresses = (orders: Order[]) => {
  const seen = new Map<string, { key: string; recipient: string; phone?: string | null; address: string; district: string; city: string; lastUsed: string }>();
  for (const order of orders) {
    if (!order.shippingAddress || !order.shippingCity) continue;
    const key = `${order.shippingAddress}|${order.shippingDistrict}|${order.shippingCity}`.toLocaleLowerCase('tr-TR');
    if (!seen.has(key)) {
      seen.set(key, {
        key,
        recipient: order.customerName,
        phone: order.customerPhone,
        address: order.shippingAddress,
        district: order.shippingDistrict,
        city: order.shippingCity,
        lastUsed: order.createdAt,
      });
    }
  }
  return Array.from(seen.values());
};

export default function AddressesTab({ enabled, orders, defaults }: AddressesTabProps) {
  const { status, addresses, reload, save, setDefault, remove } = useAddresses(enabled);
  const { copy, label } = useCopy();
  const [dialog, setDialog] = useState<{ open: boolean; address: Address | null }>({ open: false, address: null });
  const [pending, setPending] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);
  const [rowError, setRowError] = useState<{ id: string; message: string } | null>(null);
  const history = pastOrderAddresses(orders);

  const run = async (id: string, action: () => Promise<{ ok: true } | { ok: false; error: string }>) => {
    setPending(id);
    setRowError(null);
    const result = await action();
    setPending(null);
    if (!result.ok) setRowError({ id, message: result.error });
    return result.ok;
  };

  return (
    <>
      <div className="account-section-head account-section-head--row">
        <div>
          <h3 className="account-section-title">Teslimat adresleri</h3>
          <p className="account-section-desc">Ödeme adımında kayıtlı adreslerinizden birini seçebilirsiniz.</p>
        </div>
        <button type="button" className="btn btn--primary btn--sm" onClick={() => setDialog({ open: true, address: null })}>
          Yeni adres
        </button>
      </div>

      {status === 'error' ? (
        <Notice tone="danger" role="alert" className="account-inline-error">
          <p>Adresleriniz yüklenemedi.</p>
          <button type="button" className="btn btn--link" onClick={reload}>Tekrar dene</button>
        </Notice>
      ) : status === 'loading' && addresses.length === 0 ? (
        <div className="address-grid" aria-busy="true" aria-label="Adresler yükleniyor">
          {[0, 1].map((i) => <span key={i} className="skeleton-block address-skeleton" aria-hidden="true" />)}
        </div>
      ) : addresses.length === 0 ? (
        <div className="account-empty">
          <p className="account-empty__title">Kayıtlı adresiniz yok.</p>
          <p className="account-empty__desc">Eklediğiniz adresleri ödeme adımında seçebilirsiniz.</p>
        </div>
      ) : (
        <ul className="address-grid">
          {addresses.map((a) => {
            const busy = pending === a.id;
            const fullText = `${a.recipient} (${a.phone})\n${a.address}\n${a.district} / ${a.city}${a.postalCode ? ` ${a.postalCode}` : ''}`;
            return (
              <li key={a.id} className={`address-card${a.isDefault ? ' address-card--default' : ''}`}>
                <div className="address-card__head">
                  <h3 className="address-card__title">{a.title}</h3>
                  {a.isDefault ? <span className="chip">Varsayılan</span> : null}
                </div>
                <address className="address-card__body">
                  <strong>{a.recipient}</strong>
                  <span>{a.phone}</span>
                  <span>{a.address}</span>
                  <span>
                    {a.district} / {a.city}
                    {a.postalCode ? ` · ${a.postalCode}` : ''}
                  </span>
                </address>

                {rowError?.id === a.id ? <p className="field__error" role="alert">{rowError.message}</p> : null}

                {confirmingDelete === a.id ? (
                  <div className="address-card__confirm" role="group" aria-label="Silmeyi onayla">
                    <p>Bu adres silinsin mi?</p>
                    <button
                      type="button"
                      className="btn btn--primary btn--sm"
                      aria-busy={busy || undefined}
                      disabled={busy}
                      onClick={async () => {
                        if (await run(a.id, () => remove(a.id))) setConfirmingDelete(null);
                      }}
                    >
                      Sil
                    </button>
                    <button type="button" className="btn btn--ghost btn--sm" onClick={() => setConfirmingDelete(null)}>
                      Vazgeç
                    </button>
                  </div>
                ) : (
                  <div className="address-card__actions">
                    <button type="button" className="account-text-btn" onClick={() => setDialog({ open: true, address: a })}>Düzenle</button>
                    {!a.isDefault ? (
                      <button
                        type="button"
                        className="account-text-btn"
                        aria-busy={busy || undefined}
                        disabled={busy}
                        onClick={() => run(a.id, () => setDefault(a.id))}
                      >
                        Varsayılan yap
                      </button>
                    ) : null}
                    <button type="button" className="account-text-btn" onClick={() => copy(fullText, `addr-${a.id}`)}>
                      {label(`addr-${a.id}`)}
                    </button>
                    <a className="account-text-btn" href={mapUrl(a)} target="_blank" rel="noopener noreferrer">
                      Haritada aç<span className="visually-hidden"> (yeni sekmede açılır)</span>
                    </a>
                    <button type="button" className="account-text-btn account-text-btn--danger" onClick={() => setConfirmingDelete(a.id)}>
                      Sil
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {history.length > 0 ? (
        <section className="account-section" aria-labelledby="past-addresses-title">
          <h3 id="past-addresses-title" className="account-section-title account-section-title--sm">
            Siparişlerde kullanılan adresler
          </h3>
          <ul className="account-rows">
            {history.map((h) => (
              <li key={h.key} className="account-row">
                <div>
                  <p className="account-row__title">{h.recipient}</p>
                  <p className="account-row__meta">
                    {h.address}, {h.district} / {h.city} · Son kullanım {formatDate(h.lastUsed)}
                  </p>
                </div>
                <button
                  type="button"
                  className="account-text-btn"
                  onClick={() => copy(`${h.recipient}${h.phone ? ` (${h.phone})` : ''}\n${h.address}\n${h.district} / ${h.city}`, `hist-${h.key}`)}
                >
                  {label(`hist-${h.key}`)}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <AddressDialog
        open={dialog.open}
        address={dialog.address}
        defaults={{ ...defaults, isFirst: addresses.length === 0 }}
        onClose={() => setDialog({ open: false, address: null })}
        onSave={save}
      />
    </>
  );
}
