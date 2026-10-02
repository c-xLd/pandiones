import React from 'react';

/** Global / Home Fallback Loading Skeleton: preserves full-height editorial viewport geometry. */
export default function Loading() {
  return (
    <main id="main" className="home-skeleton" aria-busy="true">
      <div className="campaign hero" aria-hidden="true" style={{ opacity: 0.9 }}>
        <div className="campaign-pictures">
          <div className="campaign-model skeleton-block" style={{ width: '100%', height: '100%', minHeight: '60svh' }} />
        </div>
        <div className="campaign-caption">
          <span className="skeleton-block" style={{ display: 'inline-block', width: '120px', height: '12px', marginBottom: '8px' }} />
          <span className="skeleton-block" style={{ display: 'block', width: 'min(360px, 80%)', height: '48px', marginBottom: '16px' }} />
          <span className="skeleton-block" style={{ display: 'inline-block', width: '180px', height: '40px', borderRadius: 'var(--radius-full)' }} />
        </div>
      </div>
    </main>
  );
}
