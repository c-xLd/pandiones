/**
 * One-off: reads the catalog from the old local SQLite database (prisma/dev.db, read-only) and writes
 * prisma/catalog/catalog.json — categories, products, variants, media, families and store settings.
 * No users, orders, coupons, gift cards or messages. Products created by tests (slug "-test-") are skipped, and so
 * are media rows whose file is missing from public/ (they would render as broken images).
 * The JSON is loaded with `npm run db:import-catalog` (local dev, tests, and once into Supabase).
 */
import { DatabaseSync } from 'node:sqlite';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const source = process.argv[2] ?? 'prisma/dev.db';
const db = new DatabaseSync(source, { readOnly: true });
const all = (sql: string) => db.prepare(sql).all() as Record<string, unknown>[];
const bool = (value: unknown) => value === 1 || value === true || value === '1';
const date = (value: unknown) => (value === null || value === undefined ? null : new Date(typeof value === 'number' ? value : String(value)).toISOString());

const products = all(`SELECT * FROM "Product" WHERE "slug" NOT LIKE '%-test-%' ORDER BY "createdAt"`);
const productIds = new Set(products.map((row) => row.id));

const catalog = {
  exportedAt: new Date().toISOString(),
  categories: all(`SELECT * FROM "Category" ORDER BY "parentId" IS NOT NULL, "displayOrder"`).map((row) => ({
    ...row,
    isActive: bool(row.isActive),
    createdAt: date(row.createdAt),
    updatedAt: date(row.updatedAt),
  })),
  families: all(`SELECT * FROM "ProductFamily"`).map((row) => ({ ...row, createdAt: date(row.createdAt) })),
  products: products.map((row) => ({ ...row, featured: bool(row.featured), createdAt: date(row.createdAt) })),
  variants: all(`SELECT * FROM "Variant"`).filter((row) => productIds.has(row.productId)),
  media: all(`SELECT * FROM "ProductMedia" ORDER BY "productId", "position"`)
    .filter((row) => productIds.has(row.productId))
    .filter((row) => {
      const url = String(row.url);
      if (!url.startsWith('/') || existsSync(path.join(process.cwd(), 'public', url))) return true;
      console.warn(`Atlandı (dosya yok): ${url}`);
      return false;
    })
    .map((row) => ({ ...row, isCover: bool(row.isCover), createdAt: date(row.createdAt) })),
  settings: all(`SELECT * FROM "StoreSettings"`).map((row) => ({
    ...row,
    announcementEnabled: bool(row.announcementEnabled),
    maintenanceEnabled: bool(row.maintenanceEnabled),
    updatedAt: date(row.updatedAt),
  })),
};

const out = path.join(process.cwd(), 'prisma/catalog/catalog.json');
mkdirSync(path.dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify(catalog, null, 2)}\n`);
console.log(
  `Katalog yazıldı: ${catalog.categories.length} kategori, ${catalog.products.length} ürün, ${catalog.variants.length} beden, ${catalog.media.length} görsel, ${catalog.settings.length} ayar → ${path.relative(process.cwd(), out)}`,
);
