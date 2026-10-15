import { unstable_cache, revalidatePath, revalidateTag } from 'next/cache';
import type { StoreSettings as StoreSettingsRow } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { SETTINGS_DEFAULTS, SETTINGS_FIELDS, type StoreSettings, type StoreSettingsValues } from './shared';

export const SETTINGS_ID = 'store';
export const SETTINGS_TAG = 'store-settings';

export function rowToSettings(row: StoreSettingsRow | null): StoreSettings {
  if (!row) return { ...SETTINGS_DEFAULTS, updatedAt: null };
  const values = Object.fromEntries(
    SETTINGS_FIELDS.map((field) => [field, row[field] !== undefined && row[field] !== null ? row[field] : SETTINGS_DEFAULTS[field]])
  ) as StoreSettingsValues;
  return { ...values, updatedAt: row.updatedAt.toISOString() };
}

/** Straight from the database. Admin API and middleware use this; pages use getStoreSettings(). */
export async function readStoreSettings(): Promise<StoreSettings> {
  const row = await prisma.storeSettings.findUnique({ where: { id: SETTINGS_ID } });
  return rowToSettings(row);
}

const cachedRead = unstable_cache(readStoreSettings, ['store-settings'], { tags: [SETTINGS_TAG] });

/** Settings for rendering. Cached across requests and invalidated by the admin save (revalidateStoreSettings),
 *  so static pages stay static and still change when a setting changes. If the database cannot be read the
 *  defaults are used: a broken settings read must not take the storefront down. */
export async function getStoreSettings(): Promise<StoreSettings> {
  try {
    return await cachedRead();
  } catch (error) {
    // Outside a Next request (node --test, scripts) unstable_cache has no cache to use.
    if (error instanceof Error && /incrementalCache|static generation store/i.test(error.message)) {
      return readStoreSettings().catch(() => ({ ...SETTINGS_DEFAULTS, updatedAt: null }));
    }
    console.error('Store settings read failed; using defaults:', error);
    return { ...SETTINGS_DEFAULTS, updatedAt: null };
  }
}

/** Every page renders the header/footer/metadata from settings, so the whole route tree is refreshed. */
export function revalidateStoreSettings() {
  try {
    revalidateTag(SETTINGS_TAG);
    revalidatePath('/', 'layout');
  } catch (error) {
    // Only outside a Next request (tests); inside one a failure here is a real error.
    if (!(error instanceof Error && /static generation store|workStore|outside a request/i.test(error.message))) throw error;
  }
}
