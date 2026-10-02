'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/** Copies text and remembers which item was copied for a short confirmation label. */
export function useCopy(resetMs = 2000) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [failedId, setFailedId] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = useCallback(
    async (text: string, id: string) => {
      window.clearTimeout(timer.current);
      try {
        await navigator.clipboard.writeText(text);
        setFailedId(null);
        setCopiedId(id);
      } catch {
        setCopiedId(null);
        setFailedId(id);
      }
      timer.current = window.setTimeout(() => {
        setCopiedId(null);
        setFailedId(null);
      }, resetMs);
    },
    [resetMs],
  );

  const label = (id: string, idle = 'Kopyala') =>
    copiedId === id ? 'Kopyalandı' : failedId === id ? 'Kopyalanamadı' : idle;

  return { copy, label };
}
