import { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';
import { PUBLIC_PRODUCT_WHERE } from '@/lib/products/public-catalog';
import { loadCategoryTree } from '@/lib/products/load-collection';
import { getSiteUrl } from '@/lib/seo';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getSiteUrl();

  const products = await prisma.product.findMany({
    where: {
      ...PUBLIC_PRODUCT_WHERE,
      noindex: false,
    },
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
  const categoryUrls: MetadataRoute.Sitemap = tree
    .filter((root: any) => !root.noindex)
    .flatMap((root: any) => [
      { url: `${baseUrl}/${root.slug}`, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 0.9 },
      ...(root.children || [])
        .filter((child: any) => !child.noindex)
        .map((child: any) => ({
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
    {
      url: `${baseUrl}/iletisim`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    },
    {
      url: `${baseUrl}/hakkimizda`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    },
    {
      url: `${baseUrl}/sikca-sorulan-sorular`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    },
    {
      url: `${baseUrl}/teslimat-ve-iade`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.4,
    },
    {
      url: `${baseUrl}/gizlilik-politikasi`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.4,
    },
    {
      url: `${baseUrl}/kullanim-kosullari`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.4,
    },
    ...categoryUrls,
  ];

  return [...staticUrls, ...productUrls];
}
