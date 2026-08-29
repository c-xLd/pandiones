import type { Metadata } from 'next';
import CategoryStore from '@/components/koleksiyon/category-store';
import { getProducts } from '@/lib/catalog';

export const metadata: Metadata = {
  title: 'Crop Büstiyer | Pandiones Koleksiyon',
  description: 'Gündelik stile eşlik eden pedli, fitilli ve yalın crop formlar.',
  alternates: { canonical: '/crop-bustiyer' },
};

export default async function CropBustiyerPage() {
  const products = await getProducts({ category: 'crop-bustiyer' });
  return (
    <CategoryStore
      title="Crop Büstiyer"
      description="Gündelik stile eşlik eden pedli, fitilli ve yalın crop formlar."
      slug="crop-bustiyer"
      products={products}
    />
  );
}
