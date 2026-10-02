import React from 'react';
import GuideHero from '@/components/guides/GuideHero';
import '@/styles/pages/guides.css';
import '@/styles/pages/orders.css';

/** Order Tracking Loading Skeleton: preserves guide-page layout. */
export default function SiparisTakipLoading() {
  return (
    <main id="main" className="guide-page guide-page--narrow" aria-busy="true">
      <GuideHero
        eyebrow="Müşteri hizmetleri"
        title="Sipariş takibi"
        lead="Sipariş numaranızı ve siparişte kullandığınız e-postayı girin; siparişin hangi aşamada olduğunu ve kargo takip kodunu gösterelim."
      />
      <div className="orders-track-form" aria-hidden="true" style={{ marginTop: '32px' }}>
        <div className="skeleton-block" style={{ width: '100%', height: '56px', marginBottom: '16px', borderRadius: 'var(--radius-sm)' }} />
        <div className="skeleton-block" style={{ width: '100%', height: '56px', marginBottom: '24px', borderRadius: 'var(--radius-sm)' }} />
        <div className="skeleton-block" style={{ width: '100%', height: '48px', borderRadius: 'var(--radius-full)' }} />
      </div>
    </main>
  );
}
