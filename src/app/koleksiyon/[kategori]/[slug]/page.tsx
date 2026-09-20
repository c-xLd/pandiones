import React from 'react';
import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import ProductDetailClient from '@/app/urunler/[slug]/ProductDetailClient';
import { PUBLIC_PRODUCT_INCLUDE, PUBLIC_PRODUCT_WHERE, toPublicProduct } from '@/lib/products/public-catalog';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ kategori: string; slug: string }>;
}) {
  const { slug } = await params;
  const product = await prisma.product.findFirst({
    where: { ...PUBLIC_PRODUCT_WHERE, OR: [{ slug }, { id: slug }] },
  });

  if (!product) {
    return { title: 'Ürün Bulunamadı — PANDIONES' };
  }

  const categoryName = product.category === 'ic-giyim' ? 'İç Giyim' : 'Ev Giyim';
  const canonicalUrl = `https://pandiones.com/koleksiyon/${product.category}/${product.slug}`;

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

export default async function HierarchicalProductDetailPage({
  params,
}: {
  params: Promise<{ kategori: string; slug: string }>;
}) {
  const { kategori, slug } = await params;

  const product = await prisma.product.findFirst({
    where: { ...PUBLIC_PRODUCT_WHERE, OR: [{ slug }, { id: slug }] },
    include: PUBLIC_PRODUCT_INCLUDE,
  });

  if (!product) {
    notFound();
  }

  // Canonical category redirection if accessed with wrong category
  if (kategori !== product.category) {
    redirect(`/koleksiyon/${product.category}/${product.slug}`);
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
      url: `${siteUrl}/koleksiyon/${product.category}/${product.slug}`,
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
        item: `${siteUrl}/koleksiyon/${product.category}`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: product.name,
        item: `${siteUrl}/koleksiyon/${product.category}/${product.slug}`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdProduct) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdBreadcrumbs) }}
      />
      <ProductDetailClient product={toPublicProduct(product)} relatedProducts={relatedProducts.map(toPublicProduct)} />
    </>
  );
}
