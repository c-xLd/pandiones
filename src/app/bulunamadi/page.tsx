import { notFound } from 'next/navigation';

/**
 * Target of the middleware's hidden-panel 404 (src/middleware.ts). A static segment wins over
 * `[kategori]`, so the 404 renders at once instead of after the catalogue's loading skeleton.
 */
export const dynamic = 'force-static';

export default function NotFoundTarget(): never {
  notFound();
}
