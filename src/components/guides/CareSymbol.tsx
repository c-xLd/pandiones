import React from 'react';

export type CareSymbolKind = 'wash-30' | 'no-bleach' | 'no-tumble' | 'iron-low' | 'dry-clean' | 'dry-flat';

/** Line drawings of the care-label symbols (ISO 3758 shapes), drawn in currentColor. */
export default function CareSymbol({ kind }: { kind: CareSymbolKind }) {
  return (
    <svg className="care-symbol" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      {kind === 'wash-30' ? (
        <>
          <path d="M6 14l4 24h28l4-24" />
          <path d="M6 14c4 3 8 3 12 0s8-3 12 0 8 3 12 0" />
          <text x="24" y="33" textAnchor="middle">30</text>
        </>
      ) : null}
      {kind === 'no-bleach' ? (
        <>
          <path d="M24 8L42 38H6Z" />
          <path d="M10 10l28 30M38 10L10 40" />
        </>
      ) : null}
      {kind === 'no-tumble' ? (
        <>
          <rect x="8" y="8" width="32" height="32" />
          <circle cx="24" cy="24" r="11" />
          <path d="M8 8l32 32M40 8L8 40" />
        </>
      ) : null}
      {kind === 'iron-low' ? (
        <>
          <path d="M8 36h34l-2-10c-1-5-5-8-10-8H18c-3 0-4-2-4-4" />
          <path d="M14 14h10" />
          <circle cx="26" cy="30" r="1.6" className="care-symbol__fill" />
        </>
      ) : null}
      {kind === 'dry-clean' ? (
        <>
          <circle cx="24" cy="24" r="16" />
          <text x="24" y="30" textAnchor="middle">P</text>
        </>
      ) : null}
      {kind === 'dry-flat' ? (
        <>
          <rect x="8" y="8" width="32" height="32" />
          <path d="M14 24h20" />
        </>
      ) : null}
    </svg>
  );
}
