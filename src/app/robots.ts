import { MetadataRoute } from 'next';
import { getStoreSettings } from '@/lib/settings/server';
import { getSiteUrl } from '@/lib/seo';

export default async function robots(): Promise<MetadataRoute.Robots> {
  const settings = await getStoreSettings().catch(() => null);
  const baseUrl = getSiteUrl();

  if (settings && settings.seoRobotsIndexing === false) {
    return {
      rules: {
        userAgent: '*',
        disallow: '/',
      },
      sitemap: `${baseUrl}/sitemap.xml`,
    };
  }

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/yonetim/', '/yonetim', '/api/', '/odeme/', '/odeme', '/canta', '/hesabim', '/siparislerim', '/sepet'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
