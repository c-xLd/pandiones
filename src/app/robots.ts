import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://pandiones.com';

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/yonetim/', '/api/', '/odeme/', '/siparis-onay/'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
