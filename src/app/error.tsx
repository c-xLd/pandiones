'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled application error:', error);
  }, [error]);

  return (
    <main id="main" className="padded-main" style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center', padding: '60px 24px' }}>
        <p className="eyebrow" style={{ letterSpacing: '0.2em', color: '#b91c1c', marginBottom: '16px' }}>
          BİR HATA OLUŞTU
        </p>
        <h1
          style={{
            font: '400 clamp(32px, 4vw, 48px)/1.1 var(--serif)',
            margin: '0 0 20px',
            color: 'var(--ink)',
          }}
        >
          Beklenmedik bir aksaklık.
        </h1>
        <p
          style={{
            fontSize: '15px',
            color: 'var(--muted)',
            lineHeight: '1.7',
            marginBottom: '36px',
            maxWidth: '440px',
            marginLeft: 'auto',
            marginRight: 'auto',
          }}
        >
          İşleminiz gerçekleştirilirken teknik bir sorun yaşandı. Lütfen sayfayı yenilemeyi deneyin veya ana sayfaya dönün.
        </p>
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => reset()}
            type="button"
            className="btn btn--primary btn--lg"
          >
            Yeniden Dene ↻
          </button>
          <Link href="/" className="btn btn--secondary btn--lg">
            Ana Sayfa
          </Link>
        </div>
      </div>
    </main>
  );
}
