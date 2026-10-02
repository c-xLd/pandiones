import React from 'react';
import '@/styles/pages/guides.css';
import '@/styles/pages/gift-card.css';

/** Gift Card Loading Skeleton: matches gift-hero split layout. */
export default function GiftCardLoading() {
  return (
    <main id="main" className="gift-page" aria-busy="true">
      <section className="gift-hero" aria-hidden="true">
        <div className="gift-hero__inner">
          <div className="gift-hero__copy">
            <span className="skeleton-block" style={{ display: 'inline-block', width: '120px', height: '22px', borderRadius: 'var(--radius-full)', marginBottom: '16px' }} />
            <span className="skeleton-block" style={{ display: 'block', width: 'min(380px, 90%)', height: '48px', marginBottom: '16px' }} />
            <span className="skeleton-block" style={{ display: 'block', width: 'min(440px, 100%)', height: '20px', marginBottom: '8px' }} />
            <span className="skeleton-block" style={{ display: 'block', width: 'min(320px, 75%)', height: '20px', marginBottom: '24px' }} />
            <div style={{ display: 'flex', gap: '16px' }}>
              <span className="skeleton-block" style={{ width: '150px', height: '48px', borderRadius: 'var(--radius-full)' }} />
            </div>
          </div>
          <div className="gift-stack">
            <div className="gift-stack__card skeleton-block" style={{ width: '100%', aspectRatio: '1.58 / 1', borderRadius: 'var(--radius-lg)' }} />
          </div>
        </div>
      </section>
    </main>
  );
}
