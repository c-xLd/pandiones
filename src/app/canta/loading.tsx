import React from 'react';
import '@/styles/pages/cart.css';

/** Luxury Cart Page Loading Skeleton: preserves 1:1 geometry of the cart layout and summary. */
export default function CartLoading() {
  return (
    <main id="main" className="cart-page" aria-busy="true">
      <div className="cart-layout">
        <section className="cart-lines" aria-labelledby="cart-skeleton-title">
          <header className="cart-head">
            <p className="cart-eyebrow">Alışveriş çantası</p>
            <h1 id="cart-skeleton-title" className="cart-title">Çantanız</h1>
          </header>

          <ul className="cart-list" aria-hidden="true">
            {[0, 1].map((i) => (
              <li key={i} className="cart-line cart-line--skeleton">
                <span className="cart-line-media skeleton-block" />
                <span className="cart-line-skeleton-text">
                  <span className="skeleton-block" />
                  <span className="skeleton-block" />
                </span>
              </li>
            ))}
          </ul>
        </section>

        <aside className="cart-summary" aria-hidden="true">
          <div className="cart-summary-inner">
            <h2 className="cart-summary-title">Sipariş özeti</h2>
            <dl className="cart-summary-rows">
              <div className="cart-summary-row">
                <dt>Ara toplam</dt>
                <dd><span className="skeleton-block" style={{ display: 'inline-block', width: '56px', height: '14px' }} /></dd>
              </div>
              <div className="cart-summary-row">
                <dt>Teslimat</dt>
                <dd>Ücretsiz</dd>
              </div>
            </dl>
            <div className="skeleton-block" style={{ width: '100%', height: '48px', borderRadius: 'var(--radius-full)' }} />
          </div>
        </aside>
      </div>
    </main>
  );
}
