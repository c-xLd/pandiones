'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Critical global error:', error);
  }, [error]);

  return (
    <html lang="tr">
      <head>
        <title>Sistem Kesintisi | Pandiones</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body
        style={{
          margin: 0,
          backgroundColor: '#f1ede4',
          color: '#11100f',
          fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif",
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '24px 32px',
          boxSizing: 'border-box',
          WebkitFontSmoothing: 'antialiased',
        }}
      >
        {/* Top Wordmark */}
        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid rgba(17, 16, 15, 0.15)',
            paddingBottom: '20px',
          }}
        >
          <span
            style={{
              fontSize: '15px',
              letterSpacing: '0.12em',
              fontWeight: 300,
              textTransform: 'uppercase',
            }}
          >
            PANDIONES
          </span>
          <span
            style={{
              fontSize: '10px',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: '#5f1227',
              fontWeight: 600,
            }}
          >
            SİSTEM // 500
          </span>
        </header>

        {/* Central Editorial Message */}
        <main
          style={{
            maxWidth: '720px',
            width: '100%',
            margin: '60px auto',
            textAlign: 'left',
          }}
        >
          <p
            style={{
              fontSize: '10px',
              letterSpacing: '0.25em',
              textTransform: 'uppercase',
              color: '#6d665f',
              marginBottom: '20px',
            }}
          >
            KRİTİK HATA RAPORU
          </p>
          <h1
            style={{
              fontFamily: "'Palatino Linotype', Palatino, Georgia, serif",
              fontSize: 'clamp(42px, 7vw, 76px)',
              fontWeight: 300,
              textTransform: 'uppercase',
              lineHeight: 0.95,
              letterSpacing: '-0.03em',
              margin: '0 0 24px 0',
            }}
          >
            BEKLENMEYEN <br />
            <i style={{ fontStyle: 'italic', fontWeight: 400 }}>DURUM.</i>
          </h1>
          <p
            style={{
              fontSize: '12px',
              lineHeight: 1.7,
              color: '#6d665f',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              maxWidth: '480px',
              marginBottom: '40px',
            }}
          >
            Uygulama temelinde geçici bir bağlantı veya derleme aksaklığı tespit edildi. Yeniden bağlanmayı deneyebilirsiniz.
          </p>

          {error.digest && (
            <p
              style={{
                fontFamily: 'monospace',
                fontSize: '10px',
                color: '#6d665f',
                letterSpacing: '0.1em',
                marginBottom: '32px',
                opacity: 0.7,
              }}
            >
              HATA DİJEST: {error.digest}
            </p>
          )}

          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => reset()}
              style={{
                backgroundColor: '#11100f',
                color: '#f1ede4',
                border: 'none',
                padding: '16px 36px',
                fontSize: '11px',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                fontWeight: 600,
                transition: 'background-color 0.2s ease',
              }}
            >
              SİSTEMİ YENİLE ↗
            </button>
            <button
              type="button"
              onClick={() => {
                if (typeof window !== 'undefined') window.location.href = '/';
              }}
              style={{
                backgroundColor: 'transparent',
                color: '#11100f',
                border: '1px solid rgba(17, 16, 15, 0.25)',
                padding: '16px 36px',
                fontSize: '11px',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              ANA SAYFA
            </button>
          </div>
        </main>

        {/* Footer */}
        <footer
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTop: '1px solid rgba(17, 16, 15, 0.15)',
            paddingTop: '20px',
            fontSize: '10px',
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: '#6d665f',
          }}
        >
          <span>© 2026 PANDIONES</span>
          <span>İSTANBUL</span>
        </footer>
      </body>
    </html>
  );
}

