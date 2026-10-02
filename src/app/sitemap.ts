import { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';
import { PUBLIC_PRODUCT_WHERE } from '@/lib/products/public-catalog';
import { loadCategoryTree } from '@/lib/products/load-collection';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://pandiones.com';

  const products = await prisma.product.findMany({
    where: PUBLIC_PRODUCT_WHERE,
    select: {
      slug: true,
      category: true,
      createdAt: true,
    },
  });

  const productUrls: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${baseUrl}/urun/${p.slug}`,
    lastModified: p.createdAt || new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  const tree = await loadCategoryTree().catch(() => []);
  const categoryUrls: MetadataRoute.Sitemap = tree.flatMap((root) => [
    { url: `${baseUrl}/${root.slug}`, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 0.9 },
    ...root.children.map((child) => ({
      url: `${baseUrl}/${root.slug}/${child.slug}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
  ]);

  const staticUrls: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 1.0,
    },
    {
      url: `${baseUrl}/yeni-gelenler`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.9,
    },
    // Every active category (/sutyen) and subcategory (/sutyen/bralet) from the tree.
    ...categoryUrls,
    {
      url: `${baseUrl}/favorilerim`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    },
  ];

  return [...staticUrls, ...productUrls];
}
