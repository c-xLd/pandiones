import React from 'react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <main id="main" className="padded-main" style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center', padding: '60px 24px' }}>
        <p className="eyebrow" style={{ letterSpacing: '0.2em', color: 'var(--muted)', marginBottom: '16px' }}>
          404 — SAYFA BULUNAMADI
        </p>
        <h1
          style={{
            font: '400 clamp(36px, 5vw, 56px)/1.1 var(--serif)',
            margin: '0 0 20px',
            color: 'var(--ink)',
          }}
        >
          Kayıp bir zarafet.
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
          Aradığınız parça, sayfa veya koleksiyon yayından kaldırılmış veya bağlantı adresi değişmiş olabilir.
        </p>
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link
            href="/koleksiyon"
            className="btn btn--primary btn--lg"
          >
            Koleksiyonu İncele ↗
          </Link>
          <Link href="/" className="btn btn--secondary btn--lg">
            Ana Sayfaya Dön
          </Link>
        </div>
      </div>
    </main>
  );
}
