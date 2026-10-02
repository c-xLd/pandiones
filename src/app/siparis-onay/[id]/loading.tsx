import React from 'react';
import '@/styles/pages/checkout.css';
import '@/styles/pages/orders.css';

/** Order Confirmation Loading Skeleton. */
export default function SiparisOnayLoading() {
  return (
    <main id="main" className="padded-main" aria-busy="true">
      <div style={{ maxWidth: '640px', margin: '40px auto', padding: '0 20px' }}>
        <span className="skeleton-block" style={{ display: 'block', width: '120px', height: '14px', marginBottom: '12px' }} />
        <span className="skeleton-block" style={{ display: 'block', width: '280px', height: '36px', marginBottom: '24px' }} />
        <div className="skeleton-block" style={{ width: '100%', height: '160px', borderRadius: 'var(--radius-md)', marginBottom: '24px' }} />
        <div className="skeleton-block" style={{ width: '100%', height: '240px', borderRadius: 'var(--radius-md)' }} />
      </div>
    </main>
  );
}
