/**
 * Loads prisma/catalog/catalog.json into the database DATABASE_URL points at: categories, product families,
 * products, variants, media and store settings. Idempotent (upsert by id) and additive — it never deletes
 * and never touches users, orders, coupons or gift cards. Existing stock is kept on re-runs.
 *
 *   npm run db:import-catalog                      local database (.env)
 *   npm run db:import-catalog -- --remote          any other host (Supabase); asks nothing, prints counts
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';

type Row = Record<string, any>;
type Catalog = { categories: Row[]; families: Row[]; products: Row[]; variants: Row[]; media: Row[]; settings: Row[] };

const isLocal = (url: string) => /@(localhost|127\.0\.0\.1|\[::1\])(:\d+)?\//.test(url);
const asDate = (value: unknown) => (value ? new Date(String(value)) : undefined);

export async function importCatalog(db: PrismaClient, catalog: Catalog) {
  // Parents before children (categories reference their parent).
  const categories = [...catalog.categories].sort((a, b) => Number(Boolean(a.parentId)) - Number(Boolean(b.parentId)));
  for (const row of categories) {
    const data = {
      slug: row.slug,
      name: row.name,
      description: row.description ?? null,
      parentId: row.parentId ?? null,
      displayOrder: Number(row.displayOrder) || 0,
      image: row.image ?? null,
      isActive: Boolean(row.isActive),
    };
    await db.category.upsert({ where: { id: row.id }, create: { id: row.id, ...data, createdAt: asDate(row.createdAt) }, update: data });
  }
  for (const row of catalog.families) {
    await db.productFamily.upsert({ where: { id: row.id }, create: { id: row.id, name: row.name, createdAt: asDate(row.createdAt) }, update: { name: row.name } });
  }
  for (const row of catalog.products) {
    const data = {
      slug: row.slug,
      name: row.name,
      price: Number(row.price),
      color: row.color,
      category: row.category,
      subcategory: row.subcategory ?? null,
      categoryId: row.categoryId ?? null,
      image: row.image,
      status: row.status ?? 'PUBLISHED',
      familyId: row.familyId ?? null,
      description: row.description,
      details: row.details ?? null,
      material: row.material ?? null,
      care: row.care ?? null,
      featured: Boolean(row.featured),
    };
    await db.product.upsert({ where: { id: row.id }, create: { id: row.id, ...data, createdAt: asDate(row.createdAt) }, update: data });
  }
  for (const row of catalog.variants) {
    await db.variant.upsert({
      where: { productId_size: { productId: row.productId, size: row.size } },
      create: { id: row.id, productId: row.productId, size: row.size, stock: Number(row.stock) || 0 },
      update: {},
    });
  }
  for (const row of catalog.media) {
    const data = {
      productId: row.productId,
      kind: row.kind,
      role: row.role,
      storageKey: row.storageKey,
      url: row.url,
      posterUrl: row.posterUrl ?? null,
      alt: row.alt,
      position: Number(row.position) || 0,
      isCover: Boolean(row.isCover),
    };
    await db.productMedia.upsert({ where: { id: row.id }, create: { id: row.id, ...data, createdAt: asDate(row.createdAt) }, update: data });
  }
  for (const row of catalog.settings) {
    const { id, updatedAt: _updatedAt, ...data } = row;
    await db.storeSettings.upsert({ where: { id }, create: { id, ...data } as never, update: data });
  }
  const [categoryCount, productCount, variantCount, mediaCount] = await Promise.all([db.category.count(), db.product.count(), db.variant.count(), db.productMedia.count()]);
  return { categoryCount, productCount, variantCount, mediaCount };
}

export function readCatalog(file = path.join(process.cwd(), 'prisma/catalog/catalog.json')): Catalog {
  return JSON.parse(readFileSync(file, 'utf8')) as Catalog;
}

async function main() {
  const url = process.env.DATABASE_URL ?? '';
  if (!url) throw new Error('DATABASE_URL tanımlı değil.');
  if (!isLocal(url) && !process.argv.includes('--remote')) {
    console.error('Uzak bir veritabanı (yerel değil). Bilerek yapıyorsanız --remote ekleyin.');
    process.exit(1);
  }
  const db = new PrismaClient();
  try {
    const counts = await importCatalog(db, readCatalog());
    console.log(`Katalog yüklendi → ${counts.categoryCount} kategori, ${counts.productCount} ürün, ${counts.variantCount} beden, ${counts.mediaCount} görsel.`);
  } finally {
    await db.$disconnect();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
