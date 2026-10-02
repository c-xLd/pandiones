import React, { cache } from 'react';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import ProductDetailClient from './ProductDetailClient';
import { PUBLIC_PRODUCT_INCLUDE, PUBLIC_PRODUCT_WHERE, toPublicProduct } from '@/lib/products/public-catalog';
import { categoryHref, productHref } from '@/lib/routes';

/** One product read per request: metadata and the page share it (React cache). */
const loadProduct = cache((slug: string) =>
  prisma.product.findFirst({
    where: { ...PUBLIC_PRODUCT_WHERE, OR: [{ slug }, { id: slug }] },
    include: PUBLIC_PRODUCT_INCLUDE,
  }),
);


/** JSON for a <script> tag: `<`, `>` and `&` escaped so a product name can never close the tag (stored XSS). */
const safeJsonLd = (value: unknown) => JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');

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

  const categoryName = product.category === 'ic-giyim' ? 'İç Giyim' : 'Ev Giyim';
  const canonicalUrl = `https://pandiones.com${productHref(product.slug)}`;

  return {
    title: `${product.name} | ${categoryName} — PANDIONES`,
    description: product.description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: `${product.name} — PANDIONES`,
      description: product.description,
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

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://pandiones.com';
  const categoryTitle = product.category === 'ic-giyim' ? 'İç Giyim' : 'Ev Giyim';

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
      url: `${siteUrl}${productHref(product.slug)}`,
      price: product.price,
      priceCurrency: 'TRY',
      availability: 'https://schema.org/InStock',
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
        item: `${siteUrl}${categoryHref(product.category)}`,
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLdProduct) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLdBreadcrumbs) }}
      />
      <ProductDetailClient product={toPublicProduct(product)} relatedProducts={relatedProducts.map(toPublicProduct)} />
    </>
  );
}
