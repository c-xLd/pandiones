import React from 'react';
import '@/styles/pages/auth.css';

/** Auth Page Loading Skeleton: centered login/register form skeleton. */
export default function GirisYapLoading() {
  return (
    <main id="main" className="padded-main">
      <div className="auth-page" role="status" aria-busy="true">
        <span className="visually-hidden">Giriş sayfası yükleniyor</span>
        <div className="skeleton-block auth-skeleton" aria-hidden="true" />
      </div>
    </main>
  );
}
