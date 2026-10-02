/** Which products belong to a category. Shared by the category tabs (/yeni-gelenler) and the
 *  category page so the count on a card is exactly what the page lists. */

export type CategorizedProduct = { category: string; subcategory?: string | null };
export type CategoryNode = { slug: string; children?: Array<{ slug: string }> };

/** A product is in a category when its category or subcategory is that category or one of its children. */
export function productInCategory(product: CategorizedProduct, slug: string, childSlugs: readonly string[] = []): boolean {
  const own = [product.category, product.subcategory].filter((value): value is string => Boolean(value));
  return own.some((value) => value === slug || childSlugs.includes(value));
}

export function countInCategory(products: readonly CategorizedProduct[], node: CategoryNode): number {
  const childSlugs = (node.children ?? []).map((child) => child.slug);
  return products.filter((product) => productInCategory(product, node.slug, childSlugs)).length;
}
