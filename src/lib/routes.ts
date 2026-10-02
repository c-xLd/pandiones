/** Storefront addresses in one place.
 *  /sutyen           → root category
 *  /sutyen/bralet    → subcategory
 *  /urun/beyaz-crop  → product
 *  /yeni-gelenler    → every product, newest first (there is no /koleksiyon). */

export const ALL_PRODUCTS_HREF = '/yeni-gelenler';

export const categoryHref = (slug: string) => `/${slug}`;

export const subcategoryHref = (parentSlug: string, childSlug: string) => `/${parentSlug}/${childSlug}`;

export const productHref = (slug: string) => `/urun/${slug}`;

/** Top-level paths owned by real pages. A root category with one of these slugs would be hidden
 *  behind the page (static routes win over /[kategori]), so such slugs are refused. */
export const RESERVED_ROOT_SLUGS: readonly string[] = [
  'api', 'urun', 'yeni-gelenler', 'bakim-rehberi', 'beden-rehberi', 'canta', 'favorilerim',
  'giris-yap', 'hediye-karti', 'hesabim', 'iletisim', 'odeme', 'sepet', 'siparis-onay',
  'siparis-takip', 'siparislerim', 'stil-rehberi', 'yardim', 'yonetim', 'robots.txt', 'sitemap.xml',
];

export const isReservedRootSlug = (slug: string) => RESERVED_ROOT_SLUGS.includes(slug.trim().toLowerCase());
