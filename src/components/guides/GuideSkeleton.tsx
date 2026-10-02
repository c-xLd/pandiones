import React from 'react';
import '@/styles/pages/guides.css';

/** Shared zero-CLS loading skeleton for editorial guide and support pages. */
export default function GuideSkeleton({
  eyebrow = 'Rehber',
  title = 'Pandiones',
}: {
  eyebrow?: string;
  title?: string;
}) {
  return (
    <main id="main" className="guide-page" aria-busy="true">
      <header className="guide-hero">
        <div className="guide-hero__copy">
          <p className="guide-eyebrow">{eyebrow}</p>
          <h1 className="guide-title">{title}</h1>
          <div className="skeleton-block" style={{ width: 'min(480px, 90%)', height: '20px', marginTop: '16px' }} />
          <div className="skeleton-block" style={{ width: 'min(360px, 70%)', height: '20px', marginTop: '8px' }} />
        </div>
      </header>
      <div style={{ marginTop: '40px' }} aria-hidden="true">
        <div className="skeleton-block" style={{ width: '100%', height: '200px', borderRadius: 'var(--radius-md)', marginBottom: '24px' }} />
        <div className="skeleton-block" style={{ width: '100%', height: '160px', borderRadius: 'var(--radius-md)' }} />
      </div>
    </main>
  );
}
