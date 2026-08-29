import { env } from 'cloudflare:workers';
import { initialCatalog, schemaStatements } from '@/db/schema';

export type Product = {
  id: string;
  slug: string;
  name: string;
  categorySlug: string;
  categoryName: string;
  priceKurus: number;
  color: string;
  image: string;
  imagePosition: string;
  description: string;
  material: string;
  fit: string;
  sizes: string[];
  featuredRank: number | null;
};

type ProductRow = {
  id: string;
  slug: string;
  name: string;
  category_slug: string;
  category_name: string;
  price_kurus: number;
  color: string;
  image: string;
  image_position: string;
  description: string;
  material: string;
  fit: string;
  sizes_json: string;
  featured_rank: number | null;
};

const db = () => (env as unknown as { DB: D1Database }).DB;
let schemaReady: Promise<void> | undefined;

export function formatPrice(amount: number) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(amount / 100);
}

function mapProduct(row: ProductRow): Product {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    categorySlug: row.category_slug,
    categoryName: row.category_name,
    priceKurus: row.price_kurus,
    color: row.color,
    image: row.image,
    imagePosition: row.image_position,
    description: row.description,
    material: row.material,
    fit: row.fit,
    sizes: JSON.parse(row.sizes_json) as string[],
    featuredRank: row.featured_rank,
  };
}

export async function ensureCatalogSchema() {
  schemaReady ??= (async () => {
    const database = db();
    await database.batch(schemaStatements.map((statement) => database.prepare(statement)));
    const now = new Date().toISOString();
    await database.batch(initialCatalog.map((product) => database.prepare(
      `INSERT OR IGNORE INTO products (
        id, slug, name, category_slug, category_name, price_kurus, color, image,
        image_position, description, material, fit, sizes_json, featured_rank,
        status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', ?, ?)`
    ).bind(
      product.id, product.slug, product.name, product.categorySlug, product.categoryName,
      product.priceKurus, product.color, product.image, product.imagePosition,
      product.description, product.material, product.fit, JSON.stringify(product.sizes),
      product.featuredRank, now, now,
    )));
  })();
  return schemaReady;
}

export async function getProducts(options: { category?: string; query?: string; limit?: number } = {}) {
  await ensureCatalogSchema();
  const conditions = ["status = 'published'"];
  const values: Array<string | number> = [];
  if (options.category && options.category !== 'yeni') {
    conditions.push('category_slug = ?');
    values.push(options.category);
  }
  if (options.query) {
    conditions.push('(name LIKE ? OR description LIKE ? OR color LIKE ?)');
    const needle = `%${options.query.trim()}%`;
    values.push(needle, needle, needle);
  }
  const limit = Math.min(Math.max(options.limit ?? 24, 1), 48);
  values.push(limit);
  const result = await db().prepare(
    `SELECT id, slug, name, category_slug, category_name, price_kurus, color, image,
      image_position, description, material, fit, sizes_json, featured_rank
     FROM products WHERE ${conditions.join(' AND ')}
     ORDER BY featured_rank IS NULL, featured_rank, created_at DESC LIMIT ?`
  ).bind(...values).all<ProductRow>();
  return result.results.map(mapProduct);
}

export async function getProduct(slug: string) {
  await ensureCatalogSchema();
  const row = await db().prepare(
    `SELECT id, slug, name, category_slug, category_name, price_kurus, color, image,
      image_position, description, material, fit, sizes_json, featured_rank
     FROM products WHERE slug = ? AND status = 'published' LIMIT 1`
  ).bind(slug).first<ProductRow>();
  return row ? mapProduct(row) : null;
}

export function getDatabase() {
  return db();
}

