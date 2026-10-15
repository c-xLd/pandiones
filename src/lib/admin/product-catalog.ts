import { Prisma, type PrismaClient } from '@prisma/client';
import type { UserSession } from '@/lib/auth';
import { recordAudit, recordAuditAfter } from '@/lib/audit';
import { PAID_STATUSES } from '@/lib/admin/dashboard';
import { activeRootCategorySlugs, AdminProductError, createDraft, publishProduct } from '@/lib/admin/product-editor-service';
import { assertFamilyCandidate, getPublishErrors, normalizeColor, ProductMediaRuleError } from '@/lib/products/media-domain';
import { sortBySize } from '@/lib/products/sizes';
import { publishErrorText } from '@/lib/products/publish-errors';
import { deleteProduct, ProductDeleteError } from './product-delete';
import type { MediaStorage } from '@/lib/media/storage';

/** Admin product list with sales and waiting stock requests, bulk changes and copies. Tested in tests/admin-products-bulk.test.ts. */

const DAY = 24 * 3600 * 1000;

type Actor = Pick<UserSession, 'userId' | 'email'>;

export async function listAdminProducts(db: PrismaClient, now = new Date()) {
  const since = new Date(now.getTime() - 30 * DAY);
  const [products, sales, alerts] = await Promise.all([
    db.product.findMany({
      where: { category: { not: 'hediye-karti' } },
      include: { variants: true, _count: { select: { media: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    db.$queryRaw<{ productId: string; quantity: bigint | number; revenue: number }[]>(Prisma.sql`
      SELECT oi."productId" AS "productId", SUM(oi.quantity) AS quantity, SUM(oi.quantity * oi.price) AS revenue
      FROM "OrderItem" oi JOIN "Order" o ON o.id = oi."orderId"
      WHERE o.status IN (${Prisma.join([...PAID_STATUSES])}) AND o."paidAt" >= ${since}
      GROUP BY oi."productId"`),
    db.stockAlert.groupBy({ by: ['productId', 'size'], where: { isNotified: false }, _count: { _all: true } }),
  ]);

  const salesBy = new Map(sales.map((row) => [row.productId, { quantity: Number(row.quantity), revenue: Number(row.revenue) }]));
  const alertsBy = new Map(alerts.map((row) => [`${row.productId}::${row.size}`, row._count._all]));

  return products.map(({ _count, variants, ...product }) => ({
    ...product,
    mediaCount: _count.media,
    sales30: salesBy.get(product.id) ?? { quantity: 0, revenue: 0 },
    variants: sortBySize(variants).map((variant) => ({ ...variant, pendingAlerts: alertsBy.get(`${product.id}::${variant.size}`) ?? 0 })),
  }));
}

export type BulkAction = 'publish' | 'draft' | 'feature' | 'unfeature' | 'category' | 'delete';
export const BULK_ACTIONS: BulkAction[] = ['publish', 'draft', 'feature', 'unfeature', 'category', 'delete'];
export type BulkResult = { updated: string[]; failed: { id: string; name: string; reasons: string[] }[] };

/** Applies one action to many products; each change is logged. Publishing checks every product on its own. */
export async function bulkUpdateProducts(
  db: PrismaClient,
  actor: Actor,
  input: { ids: string[]; action: BulkAction; category?: string | null; subcategory?: string | null },
  storage: MediaStorage | null = null,
): Promise<BulkResult> {
  const result: BulkResult = { updated: [], failed: [] };
  const products = await db.product.findMany({
    where: { id: { in: input.ids } },
    include: { variants: true, media: true },
  });
  const missing = input.ids.filter((id) => !products.some((product) => product.id === id));
  for (const id of missing) result.failed.push({ id, name: '—', reasons: ['Ürün bulunamadı.'] });

  if (input.action === 'delete') {
    for (const product of products) {
      try {
        await deleteProduct(db, storage, actor, product.id);
        result.updated.push(product.id);
      } catch (error) {
        if (error instanceof ProductDeleteError && error.code === 'HAS_ORDERS') {
          result.failed.push({
            id: product.id,
            name: product.name,
            reasons: ['Sipariş kaydı bulunduğu için silinemez; taslağa alabilirsiniz.'],
          });
        } else {
          result.failed.push({
            id: product.id,
            name: product.name,
            reasons: ['Silinemedi.'],
          });
        }
      }
    }
    return result;
  }

  if (input.action === 'publish') {
    const rootCategories = await activeRootCategorySlugs(db);
    for (const product of products) {
      if (product.status === 'PUBLISHED') {
        result.updated.push(product.id);
        continue;
      }
      const reasons = getPublishErrors({
        price: product.price,
        category: product.category,
        rootCategories,
        color: product.color,
        variants: product.variants,
        media: product.media.map(({ kind, url, posterUrl, isCover }) => ({ kind: kind as 'IMAGE' | 'VIDEO', url, posterUrl, isCover })),
      });
      if (reasons.length) {
        result.failed.push({ id: product.id, name: product.name, reasons: publishErrorText(reasons) });
        continue;
      }
      try {
        await publishProduct(product.id, db);
        await recordAuditAfter(db, actor, { action: 'product.status', entity: 'product', entityId: product.id, summary: `${product.name}: yayınlandı`, diff: { status: ['DRAFT', 'PUBLISHED'] } });
        result.updated.push(product.id);
      } catch (error) {
        result.failed.push({ id: product.id, name: product.name, reasons: [error instanceof AdminProductError ? 'Yayın koşulları sağlanmıyor.' : 'Yayınlanamadı.'] });
      }
    }
    return result;
  }

  let categoryData: { category: string; subcategory: string | null } | null = null;
  if (input.action === 'category') {
    const root = input.category ? await db.category.findFirst({ where: { slug: input.category, parentId: null }, include: { children: { select: { slug: true } } } }) : null;
    if (!root) throw new AdminProductError('INVALID_PRODUCT');
    const sub = input.subcategory || null;
    if (sub && !root.children.some((child) => child.slug === sub)) throw new AdminProductError('INVALID_PRODUCT');
    categoryData = { category: root.slug, subcategory: sub };
  }

  await db.$transaction(async (tx) => {
    for (const product of products) {
      let data: Prisma.ProductUpdateInput;
      let summary: string;
      let diff: Record<string, [unknown, unknown]>;
      if (input.action === 'draft') {
        if (product.status === 'DRAFT') {
          result.updated.push(product.id);
          continue;
        }
        data = { status: 'DRAFT' };
        summary = `${product.name}: taslağa alındı`;
        diff = { status: [product.status, 'DRAFT'] };
      } else if (input.action === 'feature' || input.action === 'unfeature') {
        const featured = input.action === 'feature';
        if (product.featured === featured) {
          result.updated.push(product.id);
          continue;
        }
        data = { featured };
        summary = `${product.name}: vitrin ${featured ? 'açıldı' : 'kapatıldı'}`;
        diff = { featured: [product.featured, featured] };
      } else {
        const next = categoryData!;
        if (product.category === next.category && (product.subcategory ?? null) === next.subcategory) {
          result.updated.push(product.id);
          continue;
        }
        data = { category: next.category, subcategory: next.subcategory };
        summary = `${product.name}: kategori değişti`;
        diff = { category: [product.category, next.category], subcategory: [product.subcategory ?? null, next.subcategory] };
      }
      await tx.product.update({ where: { id: product.id }, data });
      await recordAudit(tx, actor, { action: input.action === 'draft' ? 'product.status' : 'product.update', entity: 'product', entityId: product.id, summary, diff });
      result.updated.push(product.id);
    }
  });
  return result;
}

/**
 * A new draft with the same details and sizes. Stock starts at 0 (a copy must not invent inventory) and
 * media is not copied (the stored files would be shared, and deleting them from one product breaks the other).
 */
export async function duplicateProduct(db: PrismaClient, actor: Actor, id: string) {
  const source = await db.product.findUnique({ where: { id }, include: { variants: true } });
  if (!source) throw new AdminProductError('NOT_FOUND');
  const name = `${source.name} (kopya)`.slice(0, 160);
  const copy = await createDraft(
    {
      name,
      price: source.price,
      color: source.color,
      category: source.category,
      subcategory: source.subcategory,
      categoryId: source.categoryId,
      description: source.description,
      details: source.details,
      material: source.material,
      care: source.care,
      compareAtPrice: source.compareAtPrice,
      vatRate: source.vatRate,
      variants: source.variants.map((variant) => ({ size: variant.size, stock: 0 })),
    },
    db,
  );
  await recordAuditAfter(db, actor, { action: 'product.create', entity: 'product', entityId: copy.id, summary: `${copy.name}: ${source.name} ürününden kopyalandı (taslak, stok 0, medyasız)` });
  return copy;
}

/**
 * "Renk ekle": the same model in another colour is its own product (own stock, photos and page), joined
 * to the source by a colour family. Creates the family from the source when it has none, then a draft
 * copy in the new colour — same name, price, list price, VAT, texts and sizes; stock 0, no media, no
 * SKU/barcode (those belong to one physical item). Refused when the family already has that colour.
 */
export async function addColorVariant(db: PrismaClient, actor: Actor, id: string, rawColor: unknown) {
  const color = typeof rawColor === 'string' ? rawColor.trim() : '';
  if (!color || color.length > 80) throw new AdminProductError('INVALID_PRODUCT');
  const source = await db.product.findUnique({ where: { id }, include: { variants: true, family: { include: { products: { select: { id: true, color: true, category: true } } } } } });
  if (!source) throw new AdminProductError('NOT_FOUND');
  const members = source.family?.products ?? [{ id: source.id, color: source.color, category: source.category }];
  if (members.some((member) => normalizeColor(member.color) === normalizeColor(color))) throw new ProductMediaRuleError('COLOR_CONFLICT');

  let familyId = source.familyId;
  if (!familyId) {
    const family = await db.productFamily.create({ data: { name: source.name } });
    await db.product.update({ where: { id: source.id }, data: { familyId: family.id } });
    familyId = family.id;
  }
  const draft = await createDraft(
    {
      name: source.name,
      price: source.price,
      color,
      category: source.category,
      subcategory: source.subcategory,
      categoryId: source.categoryId,
      description: source.description,
      details: source.details,
      material: source.material,
      care: source.care,
      compareAtPrice: source.compareAtPrice,
      vatRate: source.vatRate,
      variants: source.variants.map((variant) => ({ size: variant.size, stock: 0 })),
    },
    db,
  );
  const linked = await db.product.update({ where: { id: draft.id }, data: { familyId } });
  await recordAuditAfter(db, actor, { action: 'product.create', entity: 'product', entityId: draft.id, summary: `${source.name}: ${color} rengi eklendi (taslak, stok 0, medyasız; ${source.color} ile aynı aile)` });
  return linked;
}

/** Products that could join this model as a colour: same category, not already in its family. */
export async function listColorCandidates(db: PrismaClient, id: string) {
  const source = await db.product.findUnique({ where: { id }, select: { id: true, category: true, familyId: true } });
  if (!source) throw new AdminProductError('NOT_FOUND');
  return db.product.findMany({
    where: {
      category: source.category,
      id: { not: source.id },
      ...(source.familyId ? { OR: [{ familyId: null }, { familyId: { not: source.familyId } }] } : {}),
    },
    select: { id: true, name: true, color: true, status: true, image: true },
    orderBy: [{ name: 'asc' }, { color: 'asc' }],
    take: 200,
  });
}

/**
 * "Mevcut ürünü bağla": a product created on its own becomes a colour of this model. It keeps its price,
 * stock, photos and page; it leaves any other family. The model gets a family (named after it) when it has none.
 */
export async function linkColorProduct(db: PrismaClient, actor: Actor, id: string, rawOtherId: unknown) {
  const otherId = typeof rawOtherId === 'string' ? rawOtherId : '';
  if (!otherId || otherId === id) throw new AdminProductError('INVALID_PRODUCT');
  const linked = await db.$transaction(async (tx) => {
    const source = await tx.product.findUnique({ where: { id }, include: { family: { include: { products: { select: { id: true, color: true, category: true } } } } } });
    const other = await tx.product.findUnique({ where: { id: otherId } });
    if (!source || !other) throw new AdminProductError('NOT_FOUND');
    const members = source.family?.products ?? [{ id: source.id, color: source.color, category: source.category }];
    assertFamilyCandidate({ id: other.id, color: other.color, category: other.category }, members);
    let familyId = source.familyId;
    if (!familyId) {
      familyId = (await tx.productFamily.create({ data: { name: source.name } })).id;
      await tx.product.update({ where: { id: source.id }, data: { familyId } });
    }
    return tx.product.update({ where: { id: other.id }, data: { familyId } });
  });
  await recordAuditAfter(db, actor, { action: 'product.update', entity: 'product', entityId: linked.id, summary: `${linked.name} (${linked.color}) bu modelin rengi olarak bağlandı` });
  return linked;
}

export async function unpublishProduct(db: PrismaClient, actor: Actor, id: string) {
  const product = await db.product.findUnique({ where: { id } });
  if (!product) throw new AdminProductError('NOT_FOUND');
  if (product.status === 'DRAFT') return product;
  const updated = await db.$transaction(async (tx) => {
    const next = await tx.product.update({ where: { id }, data: { status: 'DRAFT' } });
    await recordAudit(tx, actor, { action: 'product.status', entity: 'product', entityId: id, summary: `${product.name}: taslağa alındı`, diff: { status: ['PUBLISHED', 'DRAFT'] } });
    return next;
  });
  return updated;
}
