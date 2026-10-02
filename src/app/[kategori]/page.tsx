import React from 'react';
import { notFound } from 'next/navigation';
import CollectionClient from '@/components/collection/CollectionClient';
import { getStoreSettings } from '@/lib/settings/server';
import { findCategoryPlacement, loadCollection } from '@/lib/products/load-collection';
import { categoryHref } from '@/lib/routes';

const SITE = 'https://pandiones.com';

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
  return {
    title: fixed?.title ?? `${root.name} — PANDIONES`,
    description: fixed?.description ?? root.description ?? `${root.name} parçaları.`,
    alternates: { canonical: `${SITE}${categoryHref(root.slug)}` },
  };
}

/** /[kategori] — a root category, e.g. /sutyen. Unknown slugs and subcategory slugs are 404. */
export default async function CategoryPage({ params }: Params) {
  const { kategori } = await params;
  const placement = await findCategoryPlacement(kategori);
  if (!placement) notFound();

  const [data, settings] = await Promise.all([loadCollection(), getStoreSettings()]);
  return (
    <CollectionClient
      currentCategory={placement.root.slug}
      initialProducts={data.products}
      categories={data.categories}
      initialError={data.error}
      lowStockThreshold={settings.lowStockThreshold}
    />
  );
}
