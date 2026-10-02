import React from 'react';
import '@/styles/pages/orders.css';

/** Orders Page Loading Skeleton: preserves 1:1 geometry with the orders split layout. */
export default function OrdersLoading() {
  return (
    <main id="main" className="orders-page" aria-busy="true" aria-label="Siparişler yükleniyor">
      <div className="orders-hero" aria-hidden="true">
        <span className="skeleton-block orders-skeleton__title" />
      </div>
      <div className="orders-layout" aria-hidden="true">
        <div className="orders-list-col">
          {[0, 1, 2].map((i) => <span key={i} className="skeleton-block orders-skeleton__row" />)}
        </div>
        <span className="skeleton-block orders-skeleton__detail" />
      </div>
    </main>
  );
}
