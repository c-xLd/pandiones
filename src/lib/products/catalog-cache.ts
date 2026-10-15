import { revalidateTag } from 'next/cache';
import { CATALOG_TAG } from './load-collection';

/**
 * After an admin change that the storefront shows (publish, price, stock, photos, delete): the cached home
 * collection is read fresh on the next visit instead of after its 60 s. Outside a Next request (route
 * tests) there is no cache to clear, so it is a no-op there.
 */
export function refreshCatalogCache(): void {
  try {
    revalidateTag(CATALOG_TAG);
    revalidateTag('catalog');
    revalidateTag('categories');
  } catch {
    // No incremental cache in this context.
  }
}
