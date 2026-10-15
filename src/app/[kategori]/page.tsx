import React from 'react';
import { notFound } from 'next/navigation';
import CollectionClient from '@/components/collection/CollectionClient';
import { getStoreSettings } from '@/lib/settings/server';
import { findCategoryPlacement, loadCollection } from '@/lib/products/load-collection';
import { categoryHref } from '@/lib/routes';
import { getSiteUrl, safeJsonLd } from '@/lib/seo';

/** Hand-written copy for the two main categories; others use the admin name and description. */
const FIXED_META: Record<string, { title: string; description: string }> = {
  'ic-giyim': {
    title: 'İç Giyim Koleksiyonu — PANDIONES Lüks İç Giyim',
    description: 'Zarif dantel sütyen ve külot takımları, ipeksi dokular ve vücudu kusursuz saran lüks parçalar.',
  },
  'ev-giyim': {
    title: 'Ev Giyim & Pijama Koleksiyonu — PANDIONES',
    description: 'Saf saten ve ipek pijama takımları, sabahlıklar ve dingin anlara eşlik eden lüks ev giyimi.',
  },
};

type Params = { params: Promise<{ kategori: string }> };

export async function generateMetadata({ params }: Params) {
  const { kategori } = await params;
  const placement = await findCategoryPlacement(kategori).catch(() => null);
  if (!placement) return { title: 'Sayfa bulunamadı — PANDIONES' };
  const { root } = placement;
  const fixed = FIXED_META[root.slug];
  const siteUrl = getSiteUrl();
  const title = root.seoTitle || fixed?.title || `${root.name} — PANDIONES`;
  const description = root.seoDescription || fixed?.description || root.description || `${root.name} parçaları.`;
  const canonical = root.canonicalUrl || `${siteUrl}${categoryHref(root.slug)}`;
  return {
    title,
    description,
    alternates: { canonical },
    robots: root.noindex ? { index: false, follow: false } : undefined,
  };
}

/** /[kategori] — a root category, e.g. /sutyen. Unknown slugs and subcategory slugs are 404. */
export default async function CategoryPage({ params }: Params) {
  const { kategori } = await params;
  const placement = await findCategoryPlacement(kategori);
  if (!placement) notFound();

  const [data, settings] = await Promise.all([loadCollection(), getStoreSettings()]);
  const siteUrl = getSiteUrl();

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Ana Sayfa',
        item: siteUrl,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: placement.root.name,
        item: `${siteUrl}${categoryHref(placement.root.slug)}`,
      },
    ],
  };

  return (
    <>
      <CollectionClient
        currentCategory={placement.root.slug}
        initialProducts={data.products}
        categories={data.categories}
        initialError={data.error}
        lowStockThreshold={settings.lowStockThreshold}
      />
      {/* Structured data after the content: Next scrolls a new page to its first element, and a script first
          (no box, top 0) counts as already visible, so the page kept the previous scroll position. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbJsonLd) }}
      />
    </>
  );
}
