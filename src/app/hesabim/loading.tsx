import React from 'react';
import '@/styles/pages/account.css';

/** Account Page Loading Skeleton: preserves account hero, tabs and panel geometry. */
export default function AccountLoading() {
  return (
    <main id="main" className="account-page" aria-busy="true" aria-label="Hesabınız yükleniyor">
      <div className="account-hero account-hero--skeleton" aria-hidden="true">
        <span className="account-monogram skeleton-block" />
        <span className="skeleton-block account-skeleton-line" />
      </div>
      <div className="account-skeleton-tabs skeleton-block" aria-hidden="true" />
      <div className="account-skeleton-panel skeleton-block" aria-hidden="true" />
    </main>
  );
}
