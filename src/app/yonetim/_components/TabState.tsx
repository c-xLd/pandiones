'use client';

import React from 'react';

/** Loading surface for a tab: a few quiet rows, never a fake table. */
export function TabLoading({ label }: { label: string }) {
  return (
    <div className="adm-state" role="status" aria-live="polite">
      <span className="visually-hidden">{label}</span>
      <div className="adm-state__rows" aria-hidden="true">
        <span className="skeleton-block" />
        <span className="skeleton-block" />
        <span className="skeleton-block" />
      </div>
    </div>
  );
}

/** A failed load is an error with a retry, never an empty list. */
export function TabLoadError({ message, onRetry }: { message: string; onRetry(): void }) {
  return (
    <div className="adm-state adm-state--error" role="alert">
      <p>{message}</p>
      <button type="button" className="adm-btn" onClick={onRetry}>
        Tekrar dene
      </button>
    </div>
  );
}
