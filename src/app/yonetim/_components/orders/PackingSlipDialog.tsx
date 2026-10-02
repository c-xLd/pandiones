'use client';

import React from 'react';
import Dialog from '@/components/ui/Dialog';
import AdminIcon from '../AdminIcon';
import type { AdminOrder } from './types';

/** Printable warehouse slip for one or more orders; each order prints on its own A4 page. */
export default function PackingSlipDialog({ orders, onClose }: { orders: AdminOrder[]; onClose(): void }) {
  if (orders.length === 0) return null;
  const bulk = orders.length > 1;

  return (
    <Dialog
      open
      onClose={onClose}
      title={bulk ? `${orders.length} sipariş için depo fişi` : `Depo fişi · #${orders[0].orderNumber}`}
      eyebrow={bulk ? 'Her sipariş ayrı A4 sayfasına basılır' : undefined}
      className="adm-dialog adm-dialog--print"
      size="lg"
      headerActions={
        <button type="button" className="adm-btn adm-btn--primary adm-btn--sm" onClick={() => window.print()}>
          <AdminIcon name="print" />
          <span>{bulk ? `Tümünü yazdır (${orders.length})` : 'Yazdır'}</span>
        </button>
      }
    >
      <div className="packing-slip-printable-area">
        {orders.map((order) => (
          <article key={order.id} className="packing-slip-sheet" aria-label={`Sipariş #${order.orderNumber} depo fişi`}>
            <header className="packing-slip-header">
              <div>
                <span className="packing-slip-brand">PANDIONES</span>
                <p className="packing-slip-subtitle">SEVKİYAT VE PAKETLEME FİŞİ</p>
              </div>
              <div className="packing-slip-number">
                <strong>#{order.orderNumber}</strong>
                <span>Tarih: {new Date(order.createdAt).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
              </div>
            </header>

            <hr className="packing-slip-divider" />

            <div className="packing-slip-grid">
              <div>
                <span className="packing-slip-label">Teslimat alıcısı</span>
                <p className="packing-slip-value packing-slip-value--strong">{order.customerName}</p>
                <p className="packing-slip-value">{order.shippingAddress}</p>
                <p className="packing-slip-value">
                  {order.shippingDistrict} / {order.shippingCity}
                </p>
                <p className="packing-slip-value">Tel: {order.customerPhone}</p>
              </div>
              <div>
                <span className="packing-slip-label">Kargo</span>
                <p className="packing-slip-value">
                  Firma: <strong>{order.trackingCompany || 'Belirtilmedi'}</strong>
                </p>
                <p className="packing-slip-value">
                  Takip numarası: <strong>{order.trackingCode || 'Henüz yok'}</strong>
                </p>
                {order.shippingNotes ? (
                  <div className="packing-slip-note">
                    <span className="packing-slip-label">Müşteri teslimat notu</span>
                    <p>{order.shippingNotes}</p>
                  </div>
                ) : null}
                {order.adminNotes ? (
                  <div className="packing-slip-note">
                    <span className="packing-slip-label">Yönetici notu</span>
                    <p>{order.adminNotes}</p>
                  </div>
                ) : null}
              </div>
            </div>

            <hr className="packing-slip-divider" />

            <span className="packing-slip-label">Paketlenecek ürünler ({order.items?.length ?? 0} kalem)</span>
            <table className="packing-slip-table">
              <thead>
                <tr>
                  <th scope="col" className="packing-slip-center">
                    <span className="visually-hidden">Kontrol</span>
                  </th>
                  <th scope="col">Ürün</th>
                  <th scope="col" className="packing-slip-center">
                    Beden
                  </th>
                  <th scope="col" className="packing-slip-center">
                    Adet
                  </th>
                </tr>
              </thead>
              <tbody>
                {order.items?.map((item) => (
                  <tr key={item.id}>
                    <td className="packing-slip-center">
                      <span className="packing-slip-checkbox" aria-hidden="true" />
                    </td>
                    <td className="packing-slip-value--strong">{item.productName}</td>
                    <td className="packing-slip-center">
                      <span className="packing-slip-size-tag">{item.size}</span>
                    </td>
                    <td className="packing-slip-center packing-slip-value--strong">{item.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <footer className="packing-slip-footer">
              <div className="packing-slip-sign">
                <span className="packing-slip-label">Paketleyen</span>
                <span className="packing-slip-line" />
                <small>Ad soyad / imza</small>
              </div>
              <div className="packing-slip-sign">
                <span className="packing-slip-label">Kalite ve hijyen kontrolü</span>
                <span className="packing-slip-line" />
                <small>Hijyen bandı ve barkod kontrolü</small>
              </div>
            </footer>
          </article>
        ))}
      </div>
    </Dialog>
  );
}
