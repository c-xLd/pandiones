import type { Metadata } from 'next';
import CollectionStore from '@/components/collection-store';
import { getProducts } from '@/lib/catalog';

export const metadata: Metadata = {
  title: 'Koleksiyon | Pandiones',
  description: 'Pandiones iç giyim, crop büstiyer ve gecelik koleksiyonu. Dantel, tül ve rahat kalıpları keşfedin.',
  alternates: { canonical: '/koleksiyon' },
};

export default async function CollectionsPage() {
  const products = await getProducts();

  return <CollectionStore products={products} />;
}
