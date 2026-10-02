import React from 'react';
import CollectionClient from '@/components/collection/CollectionClient';
import { getStoreSettings } from '@/lib/settings/server';
import CategoryRail from '@/components/collection/CategoryRail';
import { loadCollection } from '@/lib/products/load-collection';
import { ALL_PRODUCTS_HREF } from '@/lib/routes';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Yeni Gelenler — PANDIONES Lüks İç Giyim & Ev Giyim',
  description: 'Pandiones iç giyim ve ev giyim parçaları, en yeniden başlayarak.',
  alternates: { canonical: `https://pandiones.com${ALL_PRODUCTS_HREF}` },
};

/** /yeni-gelenler — every listed piece, newest first, with the category tabs on top. */
export default async function YeniGelenlerPage() {
  const [data, settings] = await Promise.all([loadCollection(), getStoreSettings()]);
  const newest = [...data.products].sort((a, b) => {
    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return bTime - aTime;
  });
  return (
    <CollectionClient
      currentCategory="yeni-gelenler"
      initialProducts={newest}
      categories={data.categories}
      initialError={data.error}
      lowStockThreshold={settings.lowStockThreshold}
      rail={<CategoryRail categories={data.categories} products={newest} productsReady={!data.error} />}
    />
  );
}
