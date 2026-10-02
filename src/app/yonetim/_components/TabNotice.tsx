'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';

type Notice = { tone: 'success' | 'error'; message: string; id: number };

/**
 * Result line for a tab's actions, in place of alert(). The live region is always rendered so screen
 * readers announce changes; a success clears itself after a few seconds, an error stays until dismissed.
 */
export function useTabNotice() {
  const [notice, setNotice] = useState<Notice | null>(null);
  const counter = useRef(0);

  useEffect(() => {
    if (notice?.tone !== 'success') return;
    const timer = window.setTimeout(() => setNotice(null), 5000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const success = useCallback((message: string) => setNotice({ tone: 'success', message, id: ++counter.current }), []);
  const error = useCallback((message: string) => setNotice({ tone: 'error', message, id: ++counter.current }), []);

  const element = (
    <div className="adm-notice-slot" aria-live="polite">
      {notice ? (
        <p key={notice.id} className={`adm-notice adm-notice--${notice.tone}`} role={notice.tone === 'error' ? 'alert' : undefined}>
          <span>{notice.message}</span>
          <button type="button" className="adm-notice__close" onClick={() => setNotice(null)} aria-label="Bildirimi kapat">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        </p>
      ) : null}
    </div>
  );

  return { notice: element, success, error };
}
