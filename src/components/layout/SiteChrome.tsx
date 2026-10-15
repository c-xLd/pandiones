'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import DeferredOverlays from '@/components/layout/DeferredOverlays';

/** Storefront chrome (announcement, header, footer) is not drawn inside the admin panel, which has its
 *  own full-screen shell. Server-rendered children stay server components; only this check is client-side. */
export default function SiteChrome({ children, renderOverlays = false }: { children: ReactNode; renderOverlays?: boolean }) {
  const pathname = usePathname();
  if (pathname === '/yonetim' || pathname?.startsWith('/yonetim/')) return null;
  return (
    <>
      {children}
      {renderOverlays ? <DeferredOverlays /> : null}
    </>
  );
}
