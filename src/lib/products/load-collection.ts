import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { publicList } from '@/lib/products/public-catalog';
import { getCategoriesTree } from '@/lib/categories';
import type { Product } from '@/types';

export type CollectionCategory = {
  id: string;
  slug: string;
  name: string;
  image: string | null;
  description?: string | null;
  children: Array<{ id: string; slug: string; name: string; image: string | null; description?: string | null }>;
};

export type CollectionData = {
  products: Product[];
  categories: CollectionCategory[];
  /** Set when the product query failed; the page shows an error with retry instead of an empty list. */
  error: string | null;
};

const normalizeSlug = (slug: string) => (slug === 'pijama-ve-rahat-giyim' ? 'ev-giyim' : slug);

/** Active category tree, read once per request (page and metadata share it). */
export const loadCategoryTree = cache(async (): Promise<CollectionCategory[]> => {
  const tree = await getCategoriesTree(false);
  return tree.map((category) => ({
    id: category.id,
    slug: normalizeSlug(category.slug),
    name: category.name,
    image: category.image ?? null,
    description: category.description ?? null,
    children: (category.children ?? []).map((child) => ({
      id: child.id,
      slug: child.slug,
      name: child.name,
      image: child.image ?? null,
      description: child.description ?? null,
    })),
  }));
});

export type CategoryPlacement = {
  root: CollectionCategory;
  child: CollectionCategory['children'][number] | null;
};

/** Resolves /[kategori] and /[kategori]/[altKategori]: the root must be a root category and the
 *  child one of its own children. Anything else is not a page (null → 404). */
export async function findCategoryPlacement(rootSlug: string, childSlug?: string): Promise<CategoryPlacement | null> {
  const tree = await loadCategoryTree();
  const root = tree.find((category) => category.slug === rootSlug.toLowerCase());
  if (!root) return null;
  if (childSlug === undefined) return { root, child: null };
  const child = root.children.find((c) => c.slug === childSlug.toLowerCase());
  return child ? { root, child } : null;
}

/** Products and the category tree for the catalogue pages, read on the server so they arrive with the HTML. */
export async function loadCollection(): Promise<CollectionData> {
  const [productsResult, categoriesResult] = await Promise.allSettled([
    // The digital gift card is sold on /hediye-karti, not listed among garments.
    publicList(prisma.product, { category: { not: 'hediye-karti' } }),
    loadCategoryTree(),
  ]);

  const categories = categoriesResult.status === 'fulfilled' ? categoriesResult.value : [];

  if (productsResult.status === 'rejected') {
    console.error('[COLLECTION_LOAD_FAILED]', productsResult.reason);
    return { products: [], categories, error: 'Koleksiyon yüklenemedi.' };
  }

  // Dates are serialised for the client component boundary.
  const products = JSON.parse(JSON.stringify(productsResult.value)) as Product[];
  return { products, categories, error: null };
}

/** Clears cached catalogue reads (home page) after a product is published or taken down. */
export const CATALOG_TAG = 'catalog';

const cachedHomeCollection = unstable_cache(
  async () => {
    const data = await loadCollection();
    // A failed read is thrown so it is never cached; the page shows the error and the next visit retries.
    if (data.error) throw new Error(data.error);
    return data;
  },
  ['home-collection'],
  { revalidate: 60, tags: [CATALOG_TAG] },
);

/** The home page's products and categories, cached for 60 s so the page does not wait for the database. */
export async function loadHomeCollection(): Promise<CollectionData> {
  try {
    return await cachedHomeCollection();
  } catch {
    return loadCollection();
  }
}
