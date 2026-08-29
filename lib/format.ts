export type Product = {
  id: string;
  slug: string;
  name: string;
  categorySlug: string;
  categoryName: string;
  priceKurus: number;
  color: string;
  image: string;
  imagePosition: string;
  description: string;
  material: string;
  fit: string;
  sizes: string[];
  featuredRank: number | null;
};

export function formatPrice(amount: number) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(amount / 100);
}
