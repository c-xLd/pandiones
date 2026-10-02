'use client';

import React from 'react';
import Link from 'next/link';
import Notice from '@/components/ui/Notice';
import StatusTag from '@/components/ui/StatusTag';
import { formatTRY } from '@/lib/format/money';
import { useCopy } from '@/lib/hooks/useCopy';
import {
  canRequestReturn,
  carrierTrackingUrl,
  formatDate,
  orderProgressStep,
  orderStatusLead,
  orderStatusMeta,
  orderSubtotal,
  productHref,
  returnStatusMeta,
  ORDER_STEPS,
  type Order,
} from '@/lib/orders';

type OrderDetailProps = {
  order: Order;
  onOpenReceipt: () => void;
  onRequestReturn: () => void;
};

export default function OrderDetail({ order, onOpenReceipt, onRequestReturn }: OrderDetailProps) {
  const { copy, label } = useCopy();
  const status = orderStatusMeta(order.status);
  const step = orderProgressStep(order.status);
  const trackingUrl = carrierTrackingUrl(order.trackingCompany, order.trackingCode);
  const items = order.items ?? [];
  const pieces = items.reduce((sum, item) => sum + item.quantity, 0);
  const returnRequest = order.returns?.[0] ?? null;

  return (
    <article className="order-detail" aria-labelledby="order-detail-title">
      <header className="order-detail__head">
        <div className="order-detail__id">
          <p className="orders-label">Sipariş {order.orderNumber}</p>
          <button type="button" className="orders-text-btn" onClick={() => copy(order.orderNumber, 'order-number')}>
            {label('order-number', 'Numarayı kopyala')}
          </button>
        </div>
        <h2 id="order-detail-title" className={`order-detail__status order-detail__status--${status.tone}`}>
          {status.label}
        </h2>
        <p className="order-detail__lead">
          {orderStatusLead(order.status)} <span className="order-detail__when">{formatDate(order.createdAt)} · {pieces} parça</span>
        </p>
      </header>

      {step > 0 ? (
        <ol className="journey" style={{ '--progress': (step - 1) / (ORDER_STEPS.length - 1) } as React.CSSProperties}>
          {ORDER_STEPS.map((stepLabel, index) => {
            const state = index + 1 < step ? 'done' : index + 1 === step ? 'current' : 'todo';
            return (
              <li key={stepLabel} className={`journey__step journey__step--${state}`} aria-current={state === 'current' ? 'step' : undefined}>
                <span className="journey__dot" aria-hidden="true" />
                <span className="journey__label">{stepLabel}</span>
                {index === 0 && order.paidAt ? <span className="journey__date">{formatDate(order.paidAt)}</span> : null}
                <span className="visually-hidden">{state === 'done' ? ' (tamamlandı)' : state === 'current' ? ' (şu an)' : ''}</span>
              </li>
            );
          })}
        </ol>
      ) : order.status === 'ODEME_BASARISIZ' ? (
        <Notice tone="danger" className="order-detail__notice">
          <p>Siparişi yeniden vermek için ürünleri tekrar çantanıza ekleyebilirsiniz.</p>
        </Notice>
      ) : null}

      {order.trackingCode ? (
        <section className="tracking-card" aria-labelledby="tracking-title">
          <div>
            <p className="tracking-card__carrier" id="tracking-title">{order.trackingCompany || 'Kargo'}</p>
            <p className="tracking-card__code">{order.trackingCode}</p>
          </div>
          <div className="tracking-card__actions">
            <button type="button" className="btn btn--on-dark btn--sm" onClick={() => copy(order.trackingCode!, 'tracking')}>
              {label('tracking', 'Kodu kopyala')}
            </button>
            {trackingUrl ? (
              <a href={trackingUrl} target="_blank" rel="noopener noreferrer" className="btn btn--sm tracking-card__cta">
                Kargoyu takip et<span className="visually-hidden"> (yeni sekmede açılır)</span>
              </a>
            ) : null}
          </div>
        </section>
      ) : null}

      <section aria-labelledby="order-items-title" className="order-detail__section">
        <h3 id="order-items-title" className="orders-section-title">Parçalar</h3>
        <ul className="order-pieces">
          {items.map((item) => {
            const href = productHref(item.product?.slug);
            const media = item.product?.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.product.image} alt="" width={240} height={360} loading="lazy" />
            ) : null;
            return (
              <li key={item.id} className="order-piece">
                {href ? (
                  <Link href={href} className="order-piece__media" tabIndex={-1} aria-hidden="true">{media}</Link>
                ) : (
                  <span className="order-piece__media">{media}</span>
                )}
                <p className="order-product-name">{href ? <Link href={href}>{item.productName}</Link> : item.productName}</p>
                <p className="order-piece__meta">Beden {item.size} · {item.quantity} adet</p>
                <p className="order-piece__price">{formatTRY(item.price * item.quantity)}</p>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="order-detail__split">
        <section aria-labelledby="order-address-title" className="order-detail__section">
          <h3 id="order-address-title" className="orders-section-title">Teslimat</h3>
          <address className="order-address-block">
            <strong>{order.customerName}</strong>
            {order.customerPhone ? <span>{order.customerPhone}</span> : null}
            <span>{order.shippingAddress}</span>
            <span>{order.shippingDistrict} / {order.shippingCity}</span>
            {order.shippingNotes ? <em>Not: {order.shippingNotes}</em> : null}
          </address>
        </section>

        <section aria-labelledby="order-payment-title" className="order-detail__section">
          <h3 id="order-payment-title" className="orders-section-title">Ödeme</h3>
          <dl className="order-totals">
            <div>
              <dt>Ara toplam</dt>
              <dd className="orders-num">{formatTRY(orderSubtotal(order))}</dd>
            </div>
            {order.discountAmount ? (
              <div>
                <dt>İndirim{order.couponCode ? ` (${order.couponCode})` : ''}</dt>
                <dd className="orders-num">−{formatTRY(order.discountAmount)}</dd>
              </div>
            ) : null}
            {order.giftCardAmount ? (
              <div>
                <dt>Hediye kartı{order.giftCardCode ? ` (${order.giftCardCode})` : ''}</dt>
                <dd className="orders-num">−{formatTRY(order.giftCardAmount)}</dd>
              </div>
            ) : null}
            <div>
              <dt>Teslimat</dt>
              <dd>Ücretsiz</dd>
            </div>
            <div className="order-totals__grand">
              <dt>Toplam</dt>
              <dd className="orders-num">{formatTRY(order.totalAmount)}</dd>
            </div>
          </dl>
        </section>
      </div>

      <footer className="order-detail__foot">
        <button type="button" className="btn btn--secondary" onClick={onOpenReceipt}>
          Sipariş özeti
        </button>
        {returnRequest ? (
          <div className="order-return">
            <span className="orders-label">İade talebi</span>
            <StatusTag tone={returnStatusMeta(returnRequest.status).tone}>{returnStatusMeta(returnRequest.status).label}</StatusTag>
            {returnRequest.adminNotes ? <p className="order-return__note">{returnRequest.adminNotes}</p> : null}
          </div>
        ) : canRequestReturn(order) ? (
          <button type="button" className="btn btn--ghost" onClick={onRequestReturn}>
            İade talebi oluştur
          </button>
        ) : null}
      </footer>
    </article>
  );
}
