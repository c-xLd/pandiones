'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

/** Re-runs the server read of the page (the home grid gets its products on the server). */
export default function RetryButton() {
  const router = useRouter();
  return (
    <button type="button" className="btn btn--secondary" onClick={() => router.refresh()}>
      Tekrar dene
    </button>
  );
}
