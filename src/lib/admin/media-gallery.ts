import type { PrismaClient } from '@prisma/client';

export type GalleryMediaCategory = 'campaign' | 'catalog' | 'home';

export type GalleryMediaItem = {
  id: string;
  url: string;
  title: string;
  alt: string;
  category: GalleryMediaCategory;
  role?: string;
  productName?: string;
  color?: string;
};

/** Role labels for display in media gallery */
const ROLE_NAMES: Record<string, string> = {
  MODEL_FRONT: 'Manken (Ön)',
  MODEL_BACK: 'Manken (Arka)',
  MODEL_SIDE: 'Manken (Yan)',
  MODEL_WALK: 'Manken (Yürüyüş)',
  MODEL: 'Manken',
  FLATLAY: 'Düz Çekim',
  PACKSHOT: 'Stüdyo Packshot',
  HANGER: 'Askı Çekimi',
  FABRIC_DETAIL: 'Kumaş Detayı',
  STITCH_DETAIL: 'Dikiş Detayı',
  CLOSEUP: 'Yakın Plan',
  STYLING: 'Kombin',
  DETAIL: 'Detay',
  POSTER: 'Poster',
  CAMPAIGN: 'Kampanya',
  HERO: 'Vitrin',
  TEXTURE: 'Doku',
  EDITORIAL: 'Editoryal',
};

/** Curated static assets available out-of-the-box in the storefront */
export const CURATED_HOMEPAGE_ASSETS: GalleryMediaItem[] = [
  {
    id: 'asset-campaign-hero',
    url: '/assets/campaign-hero.jpeg',
    title: 'Kampanya Hero Çekimi',
    alt: 'Pandiones koleksiyon ana kampanya çekimi',
    category: 'campaign',
    role: 'CAMPAIGN',
  },
  {
    id: 'asset-campaign-portrait',
    url: '/assets/campaign-portrait.jpeg',
    title: 'Kampanya Portre Çekimi',
    alt: 'Pandiones editoryal portre kampanya çekimi',
    category: 'campaign',
    role: 'POSTER',
  },
  {
    id: 'asset-campaign-seated',
    url: '/assets/campaign-seated.jpeg',
    title: 'Kampanya Oturan Model Çekimi',
    alt: 'Pandiones editoryal oturan model çekimi',
    category: 'campaign',
    role: 'EDITORIAL',
  },
  {
    id: 'asset-campaign-chocolate',
    url: '/assets/campaign-chocolate.webp',
    title: 'Çikolata Tonları Kampanya Görseli',
    alt: 'Pandiones çikolata tonları koleksiyon kampanya görseli',
    category: 'campaign',
    role: 'CAMPAIGN',
  },
  {
    id: 'asset-hero-main',
    url: '/assets/hero.webp',
    title: 'Hero Ana Görsel (WebP)',
    alt: 'Pandiones vitrin ana görseli',
    category: 'home',
    role: 'HERO',
  },
  {
    id: 'asset-lace-texture',
    url: '/assets/lace.webp',
    title: 'Dantel Doku Detayı',
    alt: 'Pandiones dantel kumaş dokusu',
    category: 'home',
    role: 'TEXTURE',
  },
  {
    id: 'asset-satin-texture',
    url: '/assets/satin.webp',
    title: 'Saten Doku Detayı',
    alt: 'Pandiones saten kumaş dokusu',
    category: 'home',
    role: 'TEXTURE',
  },
  {
    id: 'asset-home-beyaz-1',
    url: '/assets/home/beyaz-crop-1.webp',
    title: 'Beyaz Vitrin Görünümü 1',
    alt: 'Pandiones beyaz editoryal çekim',
    category: 'home',
    role: 'EDITORIAL',
  },
  {
    id: 'asset-home-siyah-1',
    url: '/assets/home/siyah-crop-1.webp',
    title: 'Siyah Vitrin Görünümü 1',
    alt: 'Pandiones siyah editoryal çekim',
    category: 'home',
    role: 'EDITORIAL',
  },
  {
    id: 'asset-home-pembe-1',
    url: '/assets/home/pembe-balen-1.webp',
    title: 'Pudra Pembe Vitrin Görünümü 1',
    alt: 'Pandiones pudra pembe editoryal çekim',
    category: 'home',
    role: 'EDITORIAL',
  },
  {
    id: 'asset-bebek-mavisi',
    url: '/assets/bebek-mavisi-takim.jpeg',
    title: 'Bebek Mavisi Takım',
    alt: 'Pandiones bebek mavisi takım editoryal çekimi',
    category: 'catalog',
    role: 'MODEL',
  },
  {
    id: 'asset-pembe-tul',
    url: '/assets/pembe-tul-takim.jpeg',
    title: 'Pembe Tül Takım',
    alt: 'Pandiones pembe tül takım editoryal çekimi',
    category: 'catalog',
    role: 'MODEL',
  },
  {
    id: 'asset-pembe-fitilli',
    url: '/assets/pembe-fitilli-takim.png',
    title: 'Pembe Fitilli Takım',
    alt: 'Pandiones pembe fitilli takım',
    category: 'catalog',
    role: 'FLATLAY',
  },
  {
    id: 'asset-beyaz-fitilli',
    url: '/assets/beyaz-fitilli-atlet.png',
    title: 'Beyaz Fitilli Atlet',
    alt: 'Pandiones beyaz fitilli atlet',
    category: 'catalog',
    role: 'FLATLAY',
  },
];

export async function getAdminMediaGallery(
  db: PrismaClient,
  filter?: { query?: string; category?: string },
): Promise<GalleryMediaItem[]> {
  const seenUrls = new Set<string>();
  const results: GalleryMediaItem[] = [];

  // 1. Add curated static assets
  for (const asset of CURATED_HOMEPAGE_ASSETS) {
    if (!seenUrls.has(asset.url)) {
      seenUrls.add(asset.url);
      results.push(asset);
    }
  }

  // 2. Query product media from database
  try {
    const productMedia = await db.productMedia.findMany({
      where: { kind: 'IMAGE' },
      select: {
        id: true,
        url: true,
        alt: true,
        role: true,
        product: {
          select: {
            name: true,
            color: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 120,
    });

    for (const pm of productMedia) {
      if (!pm.url || seenUrls.has(pm.url)) continue;
      seenUrls.add(pm.url);
      const prodName = pm.product?.name ?? 'Ürün Görseli';
      const color = pm.product?.color ?? '';
      const roleName = ROLE_NAMES[pm.role] ?? pm.role;
      results.push({
        id: pm.id,
        url: pm.url,
        title: color ? `${prodName} (${color}) - ${roleName}` : `${prodName} - ${roleName}`,
        alt: pm.alt || `${prodName} görseli`,
        category: 'catalog',
        role: pm.role,
        productName: prodName,
        color: color || undefined,
      });
    }

    // 3. Query primary product images that may not be in productMedia
    const products = await db.product.findMany({
      where: {
        image: { not: '' },
      },
      select: {
        id: true,
        name: true,
        color: true,
        image: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    for (const p of products) {
      if (!p.image || seenUrls.has(p.image)) continue;
      seenUrls.add(p.image);
      results.push({
        id: `prod-cover-${p.id}`,
        url: p.image,
        title: `${p.name} (${p.color}) - Kapak`,
        alt: `${p.name} kapak görseli`,
        category: 'catalog',
        role: 'COVER',
        productName: p.name,
        color: p.color,
      });
    }
  } catch (err) {
    console.warn('getAdminMediaGallery DB read fallback:', err);
  }

  // Filter if query or category requested
  let filtered = results;

  if (filter?.category && filter.category !== 'all') {
    filtered = filtered.filter((item) => item.category === filter.category);
  }

  if (filter?.query && filter.query.trim()) {
    const q = filter.query.trim().toLowerCase();
    filtered = filtered.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.alt.toLowerCase().includes(q) ||
        item.url.toLowerCase().includes(q) ||
        (item.productName && item.productName.toLowerCase().includes(q)) ||
        (item.color && item.color.toLowerCase().includes(q)) ||
        (item.role && item.role.toLowerCase().includes(q)),
    );
  }

  return filtered;
}
