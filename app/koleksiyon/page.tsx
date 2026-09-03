import { Suspense } from 'react';
import type { Metadata } from 'next';
import CollectionView from '@/components/koleksiyon/collection-view';
import { getProducts } from '@/lib/catalog';

export const metadata: Metadata = {
  title: 'Tüm Koleksiyon | Pandiones',
  description: 'Pandiones iç giyim, crop büstiyer ve gecelik koleksiyonu. Dantel, tül ve rahat kalıpları keşfedin.',
  alternates: { canonical: '/koleksiyon' },
  openGraph: {
    title: 'Tüm Koleksiyon | Pandiones',
    description: 'Pandiones iç giyim, crop büstiyer ve gecelik koleksiyonu. Dantel, tül ve rahat kalıpları keşfedin.',
    url: 'https://pandiones.com/koleksiyon',
    siteName: 'Pandiones',
    images: [
      {
        url: '/products/simli-bustiyer-takim.webp',
        width: 1200,
        height: 630,
        alt: 'Pandiones Koleksiyonu',
      },
    ],
    locale: 'tr_TR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Tüm Koleksiyon | Pandiones',
    description: 'Pandiones iç giyim, crop büstiyer ve gecelik koleksiyonu.',
    images: ['/products/simli-bustiyer-takim.webp'],
  },
};

function CollectionSkeleton() {
  return (
    <div className="collection-page-shell" style={{ minHeight: '100svh', padding: '120px 4vw' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
        <p style={{ letterSpacing: '0.2em', textTransform: 'uppercase', fontSize: '11px', opacity: 0.6 }}>
          PANDIONES
        </p>
        <h1 style={{ fontFamily: 'var(--font-editorial)', fontSize: '36px', margin: '16px 0' }}>
          Koleksiyon Yükleniyor...
        </h1>
      </div>
    </div>
  );
}

export default async function CollectionsPage() {
  const products = await getProducts();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Tüm Koleksiyon',
    description: 'Pandiones iç giyim, crop büstiyer ve gecelik koleksiyonu.',
    url: 'https://pandiones.com/koleksiyon',
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
          initialCategory="all"
          initialTitle="TÜM KOLEKSİYON"
          initialKicker="SEZON 2026 // DROP 01"
          initialDescription="Dantel takımlar, crop büstiyerler ve tül geceliklerden oluşan çağdaş Pandiones seçkisi."
          initialCoverImage="/products/crop-siyah-main.webp"
        />
      </Suspense>
    </>
  );
}
