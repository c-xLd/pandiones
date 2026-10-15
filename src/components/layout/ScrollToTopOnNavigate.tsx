'use client';

import { useEffect, useLayoutEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

/**
 * A new page opens at its top. Next did not scroll for routes with a loading skeleton (product, category):
 * the shorter skeleton clamped the old scroll position to its bottom, where the footer is, and when the
 * real page streamed in, the browser's scroll anchoring kept the footer in view — the product page opened
 * at its footer. This runs when the path changes, before paint, and leaves back/forward alone (the
 * browser and Next restore the earlier position there) and same-path updates (`scroll={false}` links, query
 * changes, #anchors).
 */
export default function ScrollToTopOnNavigate() {
  const pathname = usePathname();
  const previous = useRef(pathname);
  const fromHistory = useRef(false);

  useEffect(() => {
    const onPopState = () => {
      fromHistory.current = true;
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useLayoutEffect(() => {
    if (previous.current === pathname) return;
    previous.current = pathname;
    if (fromHistory.current) {
      fromHistory.current = false;
      return;
    }
    // `html` scrolls smoothly for in-page links; a page change jumps.
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);

  return null;
}
