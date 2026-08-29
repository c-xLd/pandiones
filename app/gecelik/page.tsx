import type { Metadata } from 'next';
import CategoryStore from '@/components/koleksiyon/category-store';
import { getProducts } from '@/lib/catalog';

export const metadata: Metadata = {
  title: 'Gecelik | Pandiones Koleksiyon',
  description: 'Tül ve dantel katmanlarıyla hafif, akışkan gece silüetleri.',
  alternates: { canonical: '/gecelik' },
};

export default async function GecelikPage() {
  const products = await getProducts({ category: 'gecelik' });
  return (
    <CategoryStore
      title="Gecelik"
      description="Tül ve dantel katmanlarıyla hafif, akışkan gece silüetleri."
      slug="gecelik"
      products={products}
    />
  );
}
