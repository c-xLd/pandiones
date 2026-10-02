import { sortBySize } from './sizes';

type FilterableProduct = { color?: string | null; variants?: Array<{ size: string }> | null };

/** Colour and size choices offered by the collection filter: only what the listed products have. */
export function filterOptions(products: readonly FilterableProduct[]) {
  const colors = [...new Set(products.map((p) => p.color?.trim()).filter((c): c is string => Boolean(c)))].sort((a, b) =>
    a.localeCompare(b, 'tr'),
  );
  const sizes = sortBySize(
    [...new Set(products.flatMap((p) => (p.variants ?? []).map((v) => v.size)))].map((size) => ({ size })),
  ).map((item) => item.size);
  return { colors, sizes };
}
