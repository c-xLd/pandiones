'use client';

import React from 'react';

export default function OrderPrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="apple-press print-hide"
      style={{
        background: 'transparent',
        border: '1px solid var(--line)',
        color: 'var(--ink)',
        fontSize: '12px',
        padding: '10px 18px',
        borderRadius: '9999px',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        fontWeight: 500,
        transition: 'all 160ms ease',
      }}
    >
      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
        <path d="M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6" />
        <rect width="12" height="8" x="6" y="14" rx="1" />
      </svg>
      <span>Sipariş Makbuzunu Yazdır</span>
    </button>
  );
}
