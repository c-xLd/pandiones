'use client';

import React from 'react';
import Dialog from '@/components/ui/Dialog';
import { formatTRY } from '@/lib/format/money';
import { formatDate, orderStatusMeta, orderSubtotal, type Order } from '@/lib/orders';
// Route stylesheet: loaded only where this page or component is used.
import '@/styles/pages/account.css';
import '@/styles/pages/orders.css';

/** Printable order summary built only from the stored order record. It is not an invoice. */
export default function ReceiptDialog({ order, onClose }: { order: Order | null; onClose: () => void }) {
  if (!order) return null;
  const items = order.items ?? [];

  return (
    <Dialog
      open
      onClose={onClose}
      size="lg"
      title="Sipariş özeti"
      className="receipt print-area"
      headerActions={
        <button type="button" className="btn btn--primary btn--sm print-hide" onClick={() => window.print()}>
          Yazdır
        </button>
      }
    >
      <dl className="receipt-meta">
        <div>
          <dt className="account-label">Sipariş no</dt>
          <dd>{order.orderNumber}</dd>
        </div>
        <div>
          <dt className="account-label">Sipariş tarihi</dt>
          <dd>{formatDate(order.createdAt)}</dd>
        </div>
        {order.paidAt ? (
          <div>
            <dt className="account-label">Ödeme tarihi</dt>
            <dd>{formatDate(order.paidAt)}</dd>
          </div>
        ) : null}
        <div>
          <dt className="account-label">Durum</dt>
          <dd>{orderStatusMeta(order.status).label}</dd>
        </div>
        <div className="receipt-meta__wide">
          <dt className="account-label">Teslimat</dt>
          <dd>
            {order.customerName}
            <br />
            {order.shippingAddress}
            <br />
            {order.shippingDistrict} / {order.shippingCity}
          </dd>
        </div>
      </dl>

      <div className="receipt-table-wrap">
        <table className="receipt-table">
          <caption className="visually-hidden">Siparişteki parçalar</caption>
          <thead>
            <tr>
              <th scope="col">Parça</th>
              <th scope="col">Beden</th>
              <th scope="col" className="is-num">Adet</th>
              <th scope="col" className="is-num">Birim</th>
              <th scope="col" className="is-num">Tutar</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>{item.productName}</td>
                <td>{item.size}</td>
                <td className="is-num">{item.quantity}</td>
                <td className="is-num">{formatTRY(item.price)}</td>
                <td className="is-num">{formatTRY(item.price * item.quantity)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <dl className="order-totals receipt-totals">
        <div>
          <dt>Ara toplam</dt>
          <dd className="account-num">{formatTRY(orderSubtotal(order))}</dd>
        </div>
        {order.discountAmount ? (
          <div>
            <dt>İndirim{order.couponCode ? ` (${order.couponCode})` : ''}</dt>
            <dd className="account-num">−{formatTRY(order.discountAmount)}</dd>
          </div>
        ) : null}
        {order.giftCardAmount ? (
          <div>
            <dt>Hediye kartı{order.giftCardCode ? ` (${order.giftCardCode})` : ''}</dt>
            <dd className="account-num">−{formatTRY(order.giftCardAmount)}</dd>
          </div>
        ) : null}
        <div>
          <dt>Teslimat</dt>
          <dd>Ücretsiz</dd>
        </div>
        <div className="order-totals__grand">
          <dt>Toplam</dt>
          <dd className="account-num">{formatTRY(order.totalAmount)}</dd>
        </div>
      </dl>

      <p className="receipt-note">Bu belge sipariş kaydınızın özetidir; fatura yerine geçmez.</p>
    </Dialog>
  );
}
