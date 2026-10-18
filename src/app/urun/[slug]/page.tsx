import React, { cache } from 'react';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import ProductDetailClient from './ProductDetailClient';
import { PUBLIC_PRODUCT_INCLUDE, PUBLIC_PRODUCT_WHERE, toPublicProduct } from '@/lib/products/public-catalog';
import { categoryHref, productHref } from '@/lib/routes';
import { getSiteUrl, safeJsonLd } from '@/lib/seo';
import { loadCategoryTree } from '@/lib/products/load-collection';
import { kurusToTl } from '@/lib/money';

/** One product read per request: metadata and the page share it (React cache). */
const loadProduct = cache((slug: string) =>
  prisma.product.findFirst({
    where: { ...PUBLIC_PRODUCT_WHERE, OR: [{ slug }, { id: slug }] },
    include: PUBLIC_PRODUCT_INCLUDE,
  }),
);

async function resolveCategoryName(slug: string): Promise<{ name: string; slug: string }> {
  try {
    const tree = await loadCategoryTree();
    const root = tree.find((c) => c.slug === slug.toLowerCase());
    if (root) return { name: root.name, slug: root.slug };
    for (const r of tree) {
      const child = r.children.find((c) => c.slug === slug.toLowerCase());
      if (child) return { name: child.name, slug: child.slug };
    }
  } catch {
    // Fallback if cache fails
  }
  return {
    name: slug === 'ic-giyim' ? 'İç Giyim' : slug === 'ev-giyim' ? 'Ev Giyim' : 'Koleksiyon',
    slug,
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await loadProduct(slug);

  if (!product) {
    return { title: 'Ürün Bulunamadı — PANDIONES' };
  }

  const siteUrl = getSiteUrl();
  const categoryInfo = await resolveCategoryName(product.category);
  const categoryName = categoryInfo.name;
  const canonicalUrl = product.canonicalUrl || `${siteUrl}${productHref(product.slug)}`;

  return {
    title: product.seoTitle || `${product.name} | ${categoryName} — PANDIONES`,
    description: product.seoDescription || product.description,
    alternates: {
      canonical: canonicalUrl,
    },
    robots: product.noindex ? { index: false, follow: false } : undefined,
    openGraph: {
      title: product.seoTitle || `${product.name} — PANDIONES`,
      description: product.seoDescription || product.description,
      url: canonicalUrl,
      images: [
        {
          url: product.image,
          alt: product.name,
        },
      ],
    },
  };
}

/** /urun/[slug] — the one product address; category moves never break it. */
export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const product = await loadProduct(slug);

  if (!product) {
    notFound();
  }

  const relatedProducts = await prisma.product.findMany({
    where: { ...PUBLIC_PRODUCT_WHERE, category: product.category, id: { not: product.id } },
    include: PUBLIC_PRODUCT_INCLUDE,
    orderBy: { createdAt: 'desc' },
    take: 3,
  });

  const siteUrl = getSiteUrl();
  const categoryInfo = await resolveCategoryName(product.category);
  const categoryTitle = categoryInfo.name;
  const totalStock = product.variants.reduce((sum, v) => sum + (v.stock || 0), 0);
  const availability = totalStock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock';

  const jsonLdProduct = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    image: product.image.startsWith('http') ? product.image : `${siteUrl}${product.image}`,
    description: product.description,
    sku: product.id,
    color: product.color,
    brand: {
      '@type': 'Brand',
      name: 'Pandiones',
    },
    offers: {
      '@type': 'Offer',
      url: product.canonicalUrl || `${siteUrl}${productHref(product.slug)}`,
      price: kurusToTl(product.priceKurus),
      priceCurrency: 'TRY',
      availability,
    },
  };

  const jsonLdBreadcrumbs = {
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
        name: categoryTitle,
        item: `${siteUrl}${categoryHref(categoryInfo.slug)}`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: product.name,
        item: `${siteUrl}${productHref(product.slug)}`,
      },
    ],
  };

  return (
    <>
      <ProductDetailClient product={toPublicProduct(product)} categoryName={categoryTitle} relatedProducts={relatedProducts.map(toPublicProduct)} />
      {/* Structured data after the content: Next scrolls a new page to its first element, and a script first
          (no box, top 0) counts as already visible, so the page kept the previous scroll position. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLdProduct) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLdBreadcrumbs) }}
      />
    </>
  );
}
