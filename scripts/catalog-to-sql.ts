/**
 * Prints prisma/catalog/catalog.json as idempotent SQL (INSERT … ON CONFLICT DO NOTHING) for loading the
 * catalog into a database you can only reach through a SQL console (e.g. the Supabase SQL editor).
 * Same rows as scripts/import-catalog.ts; existing rows are left untouched.
 */
import { readCatalog } from './import-catalog';

const q = (value: unknown): string => {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'NULL';
  return `'${String(value).replace(/'/g, "''")}'`;
};

function insert(table: string, rows: Record<string, unknown>[], columns: string[], conflict: string) {
  if (rows.length === 0) return '';
  const values = rows.map((row) => `(${columns.map((column) => q(row[column])).join(', ')})`).join(',\n');
  return `INSERT INTO "${table}" (${columns.map((c) => `"${c}"`).join(', ')}) VALUES\n${values}\nON CONFLICT (${conflict}) DO NOTHING;\n`;
}

const catalog = readCatalog();
const parentsFirst = [...catalog.categories].sort((a, b) => Number(Boolean(a.parentId)) - Number(Boolean(b.parentId)));
const now = new Date().toISOString();
const sql = [
  'BEGIN;',
  insert('Category', parentsFirst.map((r) => ({ ...r, updatedAt: r.updatedAt ?? now })), ['id', 'slug', 'name', 'description', 'parentId', 'displayOrder', 'image', 'isActive', 'createdAt', 'updatedAt'], '"id"'),
  insert('ProductFamily', catalog.families, ['id', 'name', 'createdAt'], '"id"'),
  insert('Product', catalog.products, ['id', 'slug', 'name', 'price', 'color', 'category', 'subcategory', 'categoryId', 'image', 'status', 'familyId', 'description', 'details', 'material', 'care', 'featured', 'createdAt'], '"id"'),
  insert('Variant', catalog.variants, ['id', 'productId', 'size', 'stock'], '"productId", "size"'),
  insert('ProductMedia', catalog.media, ['id', 'productId', 'kind', 'role', 'storageKey', 'url', 'posterUrl', 'alt', 'position', 'isCover', 'createdAt'], '"id"'),
  'COMMIT;',
].join('\n');
process.stdout.write(sql);
