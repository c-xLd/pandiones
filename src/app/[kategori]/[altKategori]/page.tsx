import React from 'react';
import { notFound } from 'next/navigation';
import CollectionClient from '@/components/collection/CollectionClient';
import { getStoreSettings } from '@/lib/settings/server';
import { findCategoryPlacement, loadCollection } from '@/lib/products/load-collection';
import { subcategoryHref } from '@/lib/routes';

const SITE = 'https://pandiones.com';

type Params = { params: Promise<{ kategori: string; altKategori: string }> };

export async function generateMetadata({ params }: Params) {
  const { kategori, altKategori } = await params;
  const placement = await findCategoryPlacement(kategori, altKategori).catch(() => null);
  if (!placement?.child) return { title: 'Sayfa bulunamadı — PANDIONES' };
  const { root, child } = placement;
  return {
    title: `${child.name} — ${root.name} — PANDIONES`,
    description: child.description ?? `${root.name} içinde ${child.name} parçaları.`,
    alternates: { canonical: `${SITE}${subcategoryHref(root.slug, child.slug)}` },
  };
}

/** /[kategori]/[altKategori] — a subcategory under its own parent, e.g. /sutyen/bralet.
 *  A child slug under the wrong parent is 404, not a redirect. */
export default async function SubcategoryPage({ params }: Params) {
  const { kategori, altKategori } = await params;
  const placement = await findCategoryPlacement(kategori, altKategori);
  if (!placement?.child) notFound();

  const [data, settings] = await Promise.all([loadCollection(), getStoreSettings()]);
  return (
    <CollectionClient
      currentCategory={placement.child.slug}
      initialProducts={data.products}
      categories={data.categories}
      initialError={data.error}
      lowStockThreshold={settings.lowStockThreshold}
    />
  );
}
