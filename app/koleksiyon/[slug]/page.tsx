import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import CollectionView from '@/components/koleksiyon/collection-view';
import { getProducts } from '@/lib/catalog';

type CollectionConfig = {
  kicker: string;
  title: string;
  description: string;
  categoryFilter?: string;
};

const collections: Record<string, CollectionConfig> = {
  'drop-01': {
    kicker: 'LIVING FABRIC // SEZON 2026',
    title: 'DROP 01: LIVING FABRIC',
    description: 'Kumaşın hareketinden doğan heykelsi dantel, saten ve simli büstiyer formları.',
  },
  soft: {
    kicker: 'PANDIONES WORLDS // 01',
    title: 'SOFT WORLD',
    description: 'Kaşkorse dokular, pedli crop büstiyerler ve gün boyu sıfır baskı sunan rahat kalıplar.',
    categoryFilter: 'crop-bustiyer',
  },
  bold: {
    kicker: 'PANDIONES WORLDS // 02',
    title: 'BOLD WORLD',
    description: 'Simli baskılar, balenli ve destekli sütyen takımları ile tül babydoll gecelik setleri.',
    categoryFilter: 'ic-giyim',
  },
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const collection = collections[slug];
  return collection
    ? {
        title: `${collection.title} | Pandiones`,
        description: collection.description,
        alternates: { canonical: `/koleksiyon/${slug}` },
      }
    : {};
}

export default async function DynamicCollectionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const collection = collections[slug];
  if (!collection) notFound();

  const products = await getProducts();

  return (
    <CollectionView
      initialProducts={products}
      initialCategory={collection.categoryFilter || (slug === 'drop-01' ? 'all' : slug)}
      initialTitle={collection.title}
      initialKicker={collection.kicker}
      initialDescription={collection.description}
    />
  );
}
