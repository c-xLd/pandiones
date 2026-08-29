import type { Metadata } from 'next';
import CategoryStore from '@/components/category-store';
import { getProducts } from '@/lib/catalog';

export const metadata: Metadata = {
  title: 'İç Giyim | Pandiones Koleksiyon',
  description: 'Dantel, destek ve rahatlığı aynı formda buluşturan Pandiones iç giyim takımları.',
  alternates: { canonical: '/ic-giyim' },
};

export default async function IntimatesPage() {
  const products = await getProducts({ category: 'ic-giyim' });
  return <CategoryStore title="İç Giyim" description="Dantel, destek ve rahatlığı aynı formda buluşturan Pandiones takımları." slug="ic-giyim" products={products} />;
}
