import React from 'react';
import { notFound } from 'next/navigation';
import CollectionClient from '@/components/collection/CollectionClient';
import { getStoreSettings } from '@/lib/settings/server';
import { findCategoryPlacement, loadCollection } from '@/lib/products/load-collection';
import { categoryHref, subcategoryHref } from '@/lib/routes';
import { getSiteUrl, safeJsonLd } from '@/lib/seo';

type Params = { params: Promise<{ kategori: string; altKategori: string }> };

export async function generateMetadata({ params }: Params) {
  const { kategori, altKategori } = await params;
  const placement = await findCategoryPlacement(kategori, altKategori).catch(() => null);
  if (!placement?.child) return { title: 'Sayfa bulunamadı — PANDIONES' };
  const { root, child } = placement;
  const siteUrl = getSiteUrl();
  const title = child.seoTitle || `${child.name} — ${root.name} — PANDIONES`;
  const description = child.seoDescription || child.description || `${root.name} içinde ${child.name} parçaları.`;
  const canonical = child.canonicalUrl || `${siteUrl}${subcategoryHref(root.slug, child.slug)}`;

  return {
    title,
    description,
    alternates: { canonical },
    robots: child.noindex ? { index: false, follow: false } : undefined,
  };
}

/** /[kategori]/[altKategori] — a subcategory under its own parent, e.g. /sutyen/bralet.
 *  A child slug under the wrong parent is 404, not a redirect. */
export default async function SubcategoryPage({ params }: Params) {
  const { kategori, altKategori } = await params;
  const placement = await findCategoryPlacement(kategori, altKategori);
  if (!placement?.child) notFound();

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
      {
        '@type': 'ListItem',
        position: 3,
        name: placement.child.name,
        item: `${siteUrl}${subcategoryHref(placement.root.slug, placement.child.slug)}`,
      },
    ],
  };

  return (
    <>
      <CollectionClient
        currentCategory={placement.child.slug}
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
