import React from 'react';

/** Geometry of the checkout layout while the cart is read from storage. No fake values. */
export default function CheckoutSkeleton() {
  return (
    <main id="main" className="checkout-page">
      <div className="checkout-container checkout-skeleton" role="status" aria-busy="true">
        <span className="visually-hidden">Ödeme sayfası yükleniyor</span>
        <div aria-hidden="true">
          <div className="skeleton-block checkout-skeleton__title" />
          <div className="skeleton-block checkout-skeleton__field" />
          <div className="skeleton-block checkout-skeleton__field" />
          <div className="skeleton-block checkout-skeleton__field" />
          <div className="skeleton-block checkout-skeleton__area" />
        </div>
        <div aria-hidden="true" className="skeleton-block checkout-skeleton__summary" />
      </div>
    </main>
  );
}
