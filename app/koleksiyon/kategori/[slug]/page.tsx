import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import CategoryStore from '@/components/koleksiyon/category-store';
import { getProducts } from '@/lib/catalog';

const categoryMap: Record<string, { title: string; description: string }> = {
  'ic-giyim': { title: 'İç Giyim', description: 'Dantel, destek ve rahatlığı aynı formda buluşturan Pandiones takımları.' },
  'crop-bustiyer': { title: 'Crop Büstiyer', description: 'Gündelik stile eşlik eden pedli, fitilli ve yalın crop formlar.' },
  'gecelik': { title: 'Gecelik', description: 'Tül ve dantel katmanlarıyla hafif, akışkan gece silüetleri.' },
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  if (slug === 'ic-giyim') return { alternates: { canonical: '/ic-giyim' }, robots: { index: false, follow: true } };
  const category = categoryMap[slug];
  return category ? {
    title: `${category.title} | Pandiones Koleksiyon`,
    description: category.description,
    alternates: { canonical: `/koleksiyon/kategori/${slug}` },
  } : {};
}

export default async function CollectionCategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (slug === 'ic-giyim') permanentRedirect('/ic-giyim');
  const category = categoryMap[slug];
  if (!category) notFound();
  const products = await getProducts({ category: slug });
  return <CategoryStore {...category} slug={slug} products={products} />;
}
