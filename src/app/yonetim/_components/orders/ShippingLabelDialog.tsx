'use client';

import React, { useState } from 'react';
import Dialog from '@/components/ui/Dialog';
import { sendJson, errorText } from '../../_lib/request';
import AdminIcon from '../AdminIcon';
import Barcode from './Barcode';
import type { AdminOrder, ShippingConfig } from './types';

type Sender = Extract<ShippingConfig['sender'], { complete: true }>;

/** 10×10 cm thermal labels, one per page. Orders without a shipment are listed and left out. */
export default function ShippingLabelDialog({ orders, config, onClose, onPrinted }: { orders: AdminOrder[]; config: ShippingConfig; onClose(): void; onPrinted(): void }) {
  const [error, setError] = useState<string | null>(null);
  const printable = orders.filter((order) => order.shipments?.[0]);
  const skipped = orders.length - printable.length;
  const sender = config.sender.complete ? (config.sender as Sender) : null;

  const print = async () => {
    window.print();
    try {
      await sendJson('/api/admin/shipments/printed', 'POST', { ids: printable.map((order) => order.shipments![0].id) }, 'Etiket kaydı güncellenemedi.');
      onPrinted();
    } catch (err) {
      setError(errorText(err, 'Etiket kaydı güncellenemedi.'));
    }
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title={printable.length > 1 ? `${printable.length} kargo etiketi` : 'Kargo etiketi'}
      eyebrow="10 × 10 cm termal"
      className="adm-dialog adm-dialog--labels"
      size="lg"
      headerActions={
        sender && printable.length ? (
          <button type="button" className="adm-btn adm-btn--primary adm-btn--sm" onClick={print}>
            <AdminIcon name="print" />
            <span>Yazdır</span>
          </button>
        ) : null
      }
    >
      <div className="adm-form">
        {!sender ? (
          <p className="adm-notice adm-notice--error" role="alert">
            <span>Etiket için gönderici bilgileri eksik ({(config.sender as { missing: string[] }).missing.join(', ')}). Ayarlar → Kargo bölümünden tamamlayın.</span>
          </p>
        ) : null}
        {skipped ? <p className="adm-field__hint">{skipped} siparişin gönderisi yok; önce “Gönderi oluştur” ile oluşturun. Bu siparişler etikete eklenmedi.</p> : null}
        {error ? (
          <p className="adm-field-error adm-dialog__error" role="alert">
            {error}
          </p>
        ) : null}
        {sender ? (
          <p className="adm-field__hint">Yazıcı ayarında kağıt boyutunu 100 × 100 mm, kenar boşluğunu “yok”, ölçeği %100 seçin.</p>
        ) : null}
        {sender && printable.length ? (
          <div className="ship-labels">
            {printable.map((order) => {
              const shipment = order.shipments![0];
              const pieces = (order.items ?? []).reduce((sum, item) => sum + item.quantity, 0);
              return (
                <article key={order.id} className="ship-label" aria-label={`Sipariş #${order.orderNumber} kargo etiketi`}>
                  <header className="ship-label__head">
                    <strong>PTT KARGO</strong>
                    <span>
                      {shipment.desi} desi · {shipment.pieces} koli
                    </span>
                  </header>
                  <section className="ship-label__party">
                    <span className="ship-label__tag">Gönderen</span>
                    <p>
                      <b>{sender.name}</b> · {sender.phone}
                    </p>
                    <p>
                      {sender.address}, {sender.district}/{sender.city}
                    </p>
                  </section>
                  <section className="ship-label__party ship-label__party--to">
                    <span className="ship-label__tag">Alıcı</span>
                    <p className="ship-label__name">{order.customerName}</p>
                    <p>{order.shippingAddress}</p>
                    <p className="ship-label__city">
                      {order.shippingDistrict} / {order.shippingCity}
                    </p>
                    <p>Tel: {order.customerPhone}</p>
                  </section>
                  <section className="ship-label__code">
                    {shipment.barcode ? (
                      <>
                        <Barcode value={shipment.barcode} label={`PTT barkodu ${shipment.barcode}`} />
                        <span className="ship-label__number">{shipment.barcode}</span>
                      </>
                    ) : (
                      <>
                        <Barcode value={shipment.reference} label={`Gönderi referansı ${shipment.reference}`} height={44} />
                        <span className="ship-label__number">Ref. {shipment.reference}</span>
                        <span className="ship-label__note">PTT barkodu şubede verilecek</span>
                      </>
                    )}
                  </section>
                  <footer className="ship-label__foot">
                    <span>Sipariş #{order.orderNumber}</span>
                    <span>{pieces} ürün</span>
                  </footer>
                </article>
              );
            })}
          </div>
        ) : null}
      </div>
    </Dialog>
  );
}
