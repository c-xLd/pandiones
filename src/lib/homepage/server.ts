import { unstable_cache, revalidatePath, revalidateTag } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { HOMEPAGE_DEFAULTS, type HomePageConfig } from './shared';

export const HOMEPAGE_CONFIG_ID = 'homepage';
export const HOMEPAGE_CONFIG_TAG = 'home-config';

type HomePageRow = {
  id: string;
  data: string;
  updatedAt: Date;
  updatedById: string | null;
};

export function parseHomePageRow(row: HomePageRow | null): HomePageConfig {
  if (!row) {
    return { ...HOMEPAGE_DEFAULTS, updatedAt: null };
  }
  try {
    const parsed = JSON.parse(row.data);
    return {
      hero: { ...HOMEPAGE_DEFAULTS.hero, ...(parsed.hero || {}) },
      categoryStories: Array.isArray(parsed.categoryStories) && parsed.categoryStories.length > 0
        ? parsed.categoryStories
        : HOMEPAGE_DEFAULTS.categoryStories,
      nightCampaign: { ...HOMEPAGE_DEFAULTS.nightCampaign, ...(parsed.nightCampaign || {}) },
      collectionGrid: { ...HOMEPAGE_DEFAULTS.collectionGrid, ...(parsed.collectionGrid || {}) },
      productStories: { ...HOMEPAGE_DEFAULTS.productStories, ...(parsed.productStories || {}) },
      campaignVideo: { ...HOMEPAGE_DEFAULTS.campaignVideo, ...(parsed.campaignVideo || {}) },
      brandStory: { ...HOMEPAGE_DEFAULTS.brandStory, ...(parsed.brandStory || {}) },
      updatedAt: row.updatedAt.toISOString(),
    };
  } catch (error) {
    console.error('Error parsing HomePageConfig row data:', error);
    return { ...HOMEPAGE_DEFAULTS, updatedAt: row.updatedAt.toISOString() };
  }
}

/** Straight from the database without Next.js caching. Admin routes use this. */
export async function readHomePageConfig(): Promise<HomePageConfig> {
  try {
    const rows = await prisma.$queryRaw<HomePageRow[]>`
      SELECT "id", "data", "updatedAt", "updatedById"
      FROM "HomePageConfig"
      WHERE "id" = ${HOMEPAGE_CONFIG_ID}
      LIMIT 1
    `;
    const row = rows[0] || null;
    return parseHomePageRow(row);
  } catch (error) {
    console.error('Failed to read HomePageConfig from database; using defaults:', error);
    return { ...HOMEPAGE_DEFAULTS, updatedAt: null };
  }
}

const cachedRead = unstable_cache(readHomePageConfig, ['home-config-read'], {
  tags: [HOMEPAGE_CONFIG_TAG],
});

/**
 * Cached homepage settings used by the storefront page.
 * Invalidated immediately when admin saves homepage config.
 */
export async function getHomePageConfig(): Promise<HomePageConfig> {
  try {
    return await cachedRead();
  } catch (error) {
    if (error instanceof Error && /incrementalCache|static generation store/i.test(error.message)) {
      return readHomePageConfig().catch(() => ({ ...HOMEPAGE_DEFAULTS, updatedAt: null }));
    }
    console.error('getHomePageConfig failed; using defaults:', error);
    return { ...HOMEPAGE_DEFAULTS, updatedAt: null };
  }
}

export function revalidateHomePage() {
  try {
    revalidateTag(HOMEPAGE_CONFIG_TAG);
    revalidatePath('/', 'page');
  } catch (error) {
    if (!(error instanceof Error && /static generation store|workStore|outside a request/i.test(error.message))) {
      throw error;
    }
  }
}
