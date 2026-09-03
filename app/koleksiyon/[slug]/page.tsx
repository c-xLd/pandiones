import { Suspense } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import CollectionView from '@/components/koleksiyon/collection-view';
import { getProducts } from '@/lib/catalog';

type CollectionConfig = {
  kicker: string;
  title: string;
  description: string;
  categoryFilter?: string;
  coverImage?: string;
};

const collections: Record<string, CollectionConfig> = {
  'drop-01': {
    kicker: 'LIVING FABRIC // SEZON 2026',
    title: 'DROP 01: LIVING FABRIC',
    description: 'Kumaşın hareketinden doğan heykelsi dantel, saten ve simli büstiyer formları.',
    coverImage: '/products/simli-bustiyer-takim.webp',
  },
  soft: {
    kicker: 'PANDIONES WORLDS // 01',
    title: 'SOFT WORLD',
    description: 'Kaşkorse dokular, pedli crop büstiyerler ve gün boyu sıfır baskı sunan rahat kalıplar.',
    categoryFilter: 'crop-bustiyer',
    coverImage: '/products/crop-siyah-main.webp',
  },
  bold: {
    kicker: 'PANDIONES WORLDS // 02',
    title: 'BOLD WORLD',
    description: 'Simli baskılar, balenli ve destekli sütyen takımları ile tül babydoll gecelik setleri.',
    categoryFilter: 'ic-giyim',
    coverImage: '/products/cizgili-dantelli-takim.webp',
  },
  'ic-giyim': {
    kicker: 'ATELIER SELECTION // 01',
    title: 'İÇ GİYİM KOLEKSİYONU',
    description: 'Dantel, destek ve rahatlığı aynı formda buluşturan Pandiones sütyen ve büstiyer takımları.',
    categoryFilter: 'ic-giyim',
    coverImage: '/products/cizgili-dantelli-takim.webp',
  },
  'crop-bustiyer': {
    kicker: 'ATELIER SELECTION // 02',
    title: 'CROP BÜSTİYER KOLEKSİYONU',
    description: 'Gündelik stile eşlik eden pedli, fitilli ve yalın crop formlar.',
    categoryFilter: 'crop-bustiyer',
    coverImage: '/products/crop-siyah-main.webp',
  },
  gecelik: {
    kicker: 'ATELIER SELECTION // 03',
    title: 'GECELİK KOLEKSİYONU',
    description: 'Tül ve dantel katmanlarıyla hafif, akışkan gece silüetleri.',
    categoryFilter: 'gecelik',
    coverImage: '/products/tul-babydoll-set.webp',
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const collection = collections[slug];
  if (!collection) return {};

  return {
    title: `${collection.title} | Pandiones`,
    description: collection.description,
    alternates: { canonical: `/koleksiyon/${slug}` },
    openGraph: {
      title: `${collection.title} | Pandiones`,
      description: collection.description,
      url: `https://pandiones.com/koleksiyon/${slug}`,
      siteName: 'Pandiones',
      images: [
        {
          url: collection.coverImage || '/products/simli-bustiyer-takim.webp',
          width: 1200,
          height: 630,
          alt: collection.title,
        },
      ],
      locale: 'tr_TR',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${collection.title} | Pandiones`,
      description: collection.description,
      images: [collection.coverImage || '/products/simli-bustiyer-takim.webp'],
    },
  };
}

function CollectionSkeleton() {
  return (
    <div className="collection-page-shell" style={{ minHeight: '100svh', padding: '120px 4vw' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
        <p className="hero-kicker">PANDIONES</p>
        <h1 className="collection-hero-title">Koleksiyon Yükleniyor...</h1>
      </div>
    </div>
  );
}

export default async function DynamicCollectionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const collection = collections[slug];
  if (!collection) notFound();

  const products = await getProducts();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: collection.title,
    description: collection.description,
    url: `https://pandiones.com/koleksiyon/${slug}`,
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: products.map((prod, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: `https://pandiones.com/${prod.slug}`,
        name: prod.name,
        image: prod.image,
      })),
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Suspense fallback={<CollectionSkeleton />}>
        <CollectionView
          initialProducts={products}
          initialCategory={collection.categoryFilter || (slug === 'drop-01' ? 'all' : slug)}
          initialTitle={collection.title}
          initialKicker={collection.kicker}
          initialDescription={collection.description}
          initialCoverImage={collection.coverImage}
        />
      </Suspense>
    </>
  );
}
