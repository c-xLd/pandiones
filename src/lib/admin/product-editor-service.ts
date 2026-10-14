import { randomUUID } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';
import { assertFamilyCandidate, getPublishErrors, type MediaRole } from '@/lib/products/media-domain';
import { validateUpload } from '@/lib/media/validate-upload';
import type { MediaStorage } from '@/lib/media/storage';
import { sendStockAlertEmail } from '@/lib/email/provider';
import { SKU_PATTERN, compareAtPriceProblem, isValidEan13, isVatRate, normalizeBarcode, normalizeSku } from '@/lib/products/commerce-fields';
import { suggestSku, uniqueSku } from '@/lib/products/sku';

export const ADMIN_PRODUCT_INCLUDE = {
  variants: true,
  media: { orderBy: { position: 'asc' as const } },
  // The other colours of the model, for the editor's colour tabs.
  family: { include: { products: { select: { id: true, color: true, status: true }, orderBy: { createdAt: 'asc' as const } } } },
} as const;

export class AdminProductError extends Error {
  constructor(
    public readonly code:
      | 'INVALID_PRODUCT'
      | 'INVALID_MEDIA'
      | 'INVALID_PUBLISH'
      | 'NOT_FOUND'
      | 'COVER_REQUIRED'
      | 'CLEANUP_FAILED'
      | 'INVALID_BARCODE'
      | 'INVALID_SKU'
      | 'INVALID_COMPARE_PRICE'
      | 'INVALID_VAT'
      | 'DUPLICATE_CODE'
      | 'SUBCATEGORY_REQUIRED'
      | 'VIDEO_LIMIT'
      | 'POSTER_IN_USE',
  ) {
    super(code);
  }
}

export type DraftInput = {
  name: string;
  slug?: string;
  price: number;
  color: string;
  category: string;
  subcategory?: string | null;
  categoryId?: string | null;
  description?: string;
  details?: string | null;
  material?: string | null;
  care?: string | null;
  /** Struck-through list price; null clears it. Must be above `price`. */
  compareAtPrice?: number | null;
  vatRate?: number;
  variants: { size: string; stock: number; sku?: string | null; barcode?: string | null }[];
};

function validateScalars(input: DraftInput): void {
  const sizes = input.variants?.map((variant) => variant.size.trim()) ?? [];
  if (!input.name?.trim() || input.name.trim().length > 160 ||
    !Number.isFinite(input.price) || input.price <= 0 ||
    !input.color?.trim() || input.color.trim().length > 80 ||
    !input.category?.trim() ||
    !sizes.length || new Set(sizes).size !== sizes.length ||
    input.variants.some((variant) => !variant.size.trim() || variant.size.trim().length > 20 || !Number.isInteger(variant.stock) || variant.stock < 0)
  ) throw new AdminProductError('INVALID_PRODUCT');
  if (input.vatRate !== undefined && !isVatRate(input.vatRate)) throw new AdminProductError('INVALID_VAT');
  if (compareAtPriceProblem(input.price, input.compareAtPrice)) throw new AdminProductError('INVALID_COMPARE_PRICE');
  const skus = input.variants.map((variant) => normalizeSku(variant.sku)).filter((sku): sku is string => Boolean(sku));
  if (skus.some((sku) => !SKU_PATTERN.test(sku))) throw new AdminProductError('INVALID_SKU');
  const barcodes = input.variants.map((variant) => normalizeBarcode(variant.barcode)).filter((code): code is string => Boolean(code));
  if (barcodes.some((code) => !isValidEan13(code))) throw new AdminProductError('INVALID_BARCODE');
  if (new Set(skus).size !== skus.length || new Set(barcodes).size !== barcodes.length) throw new AdminProductError('DUPLICATE_CODE');
}

/**
 * A category with sub-categories only gathers them (its page lists all their products): a product is
 * placed in one of its sub-categories. Unknown slugs (e.g. the gift-card category) are left alone.
 */
async function assertCategoryPlacement(db: Pick<PrismaClient, 'category'>, category: string, subcategory: string | null | undefined) {
  const root = await db.category.findFirst({ where: { slug: category, parentId: null }, select: { children: { select: { slug: true } } } });
  if (!root?.children.length) return;
  if (!subcategory || !root.children.some((child) => child.slug === subcategory.trim())) throw new AdminProductError('SUBCATEGORY_REQUIRED');
}

/** SKU and barcode are unique across the catalog; the database enforces it, this turns it into a clear error. */
function rethrowDuplicateCode(error: unknown): never {
  const target = (error as { code?: string; meta?: { target?: unknown } })?.meta?.target;
  if ((error as { code?: string })?.code === 'P2002' && String(target).match(/sku|barcode/)) throw new AdminProductError('DUPLICATE_CODE');
  throw error;
}

type SkuDb = Pick<PrismaClient, 'variant'>;

/**
 * Stock codes for the sizes left empty: derived from name, colour and size (src/lib/products/sku.ts), with
 * -2, -3 … when another product already uses the code. `keep` are codes this product keeps (typed or
 * unchanged); `productId` excludes the product's own current codes, which are rewritten in the same save.
 */
async function fillMissingSkus(
  db: SkuDb,
  input: { name: string; color: string; productId?: string; keep: string[] },
  sizes: string[],
): Promise<Map<string, string>> {
  const filled = new Map<string, string>();
  if (!sizes.length) return filled;
  const bases = sizes.map((size) => suggestSku(input.name, input.color, size));
  const prefixes = [...new Set(bases)];
  const existing = await db.variant.findMany({
    where: { OR: prefixes.map((prefix) => ({ sku: { startsWith: prefix } })), ...(input.productId ? { NOT: { productId: input.productId } } : {}) },
    select: { sku: true },
  });
  const taken = new Set([...existing.map((row) => row.sku as string), ...input.keep]);
  sizes.forEach((size, index) => {
    const code = uniqueSku(bases[index], taken);
    taken.add(code);
    filled.set(size, code);
  });
  return filled;
}

/** A save that generated codes can lose a race for the same code; it is tried once more with fresh codes. */
async function withSkuRetry<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    const target = (error as { code?: string; meta?: { target?: unknown } })?.meta?.target;
    if ((error as { code?: string })?.code !== 'P2002' || !String(target).match(/sku/)) throw error;
    return run();
  }
}

function slugify(value: string): string {
  return value.toLocaleLowerCase('tr-TR')
    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
    .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export async function createDraft(input: DraftInput, db: PrismaClient) {
  validateScalars(input);
  await assertCategoryPlacement(db, input.category.trim(), input.subcategory);
  const slugBase = slugify(input.slug?.trim() || input.name);
  if (!slugBase) throw new AdminProductError('INVALID_PRODUCT');
  return withSkuRetry(async () => {
    const typed = input.variants.map((variant) => normalizeSku(variant.sku)).filter((sku): sku is string => Boolean(sku));
    const generated = await fillMissingSkus(
      db,
      { name: input.name, color: input.color, keep: typed },
      input.variants.filter((variant) => !normalizeSku(variant.sku)).map((variant) => variant.size.trim()),
    );
    return db.product.create({
      data: {
        slug: `${slugBase}-${randomUUID().slice(0, 8)}`,
        name: input.name.trim(), price: input.price, color: input.color.trim(),
        category: input.category.trim(),
        subcategory: input.subcategory?.trim() || null,
        categoryId: input.categoryId?.trim() || null,
        image: '', status: 'DRAFT',
        description: input.description?.trim() ?? '',
        details: input.details?.trim() || null,
        material: input.material?.trim() || null,
        care: input.care?.trim() || null,
        compareAtPrice: input.compareAtPrice ?? null,
        ...(input.vatRate !== undefined ? { vatRate: input.vatRate } : {}),
        variants: {
          create: input.variants.map((variant) => ({
            size: variant.size.trim(),
            stock: variant.stock,
            sku: normalizeSku(variant.sku) ?? generated.get(variant.size.trim()),
            barcode: normalizeBarcode(variant.barcode),
          })),
        },
      },
      include: ADMIN_PRODUCT_INCLUDE,
    });
  }).catch(rethrowDuplicateCode);
}

export type ProductUpdate = { id: string } & Partial<Omit<DraftInput, 'slug'>>;

export async function dispatchStockAlerts(
  productId: string,
  size: string,
  db: PrismaClient
): Promise<number> {
  const alerts = await db.stockAlert.findMany({
    where: {
      productId,
      size,
      isNotified: false,
    },
    include: {
      product: true,
    },
  });

  if (!alerts.length) return 0;

  let count = 0;
  for (const alert of alerts) {
    try {
      await sendStockAlertEmail({
        recipientEmail: alert.email,
        productName: alert.product.name,
        productSlug: alert.product.slug,
        size: alert.size,
        price: alert.product.price,
      });
      await db.stockAlert.update({
        where: { id: alert.id },
        data: { isNotified: true },
      });
      count++;
    } catch (err) {
      console.warn(`[STOCK_ALERT_NOTIFICATION_FAILED] Alert ${alert.id}:`, err);
    }
  }
  return count;
}

export async function saveProduct(input: ProductUpdate, db: PrismaClient) {
  const { updatedProduct, replenishedSizes } = await withSkuRetry(() => db.$transaction(async (tx) => {
    const current = await tx.product.findUnique({ where: { id: input.id }, include: { variants: true } });
    if (!current) throw new AdminProductError('NOT_FOUND');
    const merged: DraftInput = {
      name: input.name ?? current.name,
      price: input.price ?? current.price,
      color: input.color ?? current.color,
      category: input.category ?? current.category,
      subcategory: input.subcategory !== undefined ? input.subcategory : (current as any).subcategory,
      categoryId: input.categoryId !== undefined ? input.categoryId : (current as any).categoryId,
      description: input.description ?? current.description,
      details: input.details ?? current.details,
      material: input.material ?? current.material,
      care: input.care ?? current.care,
      compareAtPrice: input.compareAtPrice !== undefined ? input.compareAtPrice : current.compareAtPrice,
      vatRate: input.vatRate ?? current.vatRate,
      variants: input.variants ?? current.variants.map(({ size, stock, sku, barcode }) => ({ size, stock, sku, barcode })),
    };
    validateScalars(merged);
    if (input.category !== undefined || input.subcategory !== undefined) await assertCategoryPlacement(tx, merged.category, merged.subcategory);
    const toReplenish: string[] = [];
    if (input.variants) {
      const sizes = input.variants.map((variant) => variant.size.trim());
      // A size sent with an empty code gets one derived from the product; one that leaves it out keeps its own.
      const kept = input.variants.flatMap((variant) => {
        if (variant.sku !== undefined) return normalizeSku(variant.sku) ?? [];
        return current.variants.find((own) => own.size === variant.size.trim())?.sku ?? [];
      });
      const generated = await fillMissingSkus(
        tx,
        { name: merged.name, color: merged.color, productId: input.id, keep: kept },
        input.variants.filter((variant) => variant.sku !== undefined && !normalizeSku(variant.sku)).map((variant) => variant.size.trim()),
      );
      await tx.variant.deleteMany({ where: { productId: input.id, size: { notIn: sizes } } });
      // Codes moving between this product's sizes (a swap) must not hit the unique index half-way.
      const withSku = input.variants.filter((variant) => variant.sku !== undefined).map((variant) => variant.size.trim());
      const withBarcode = input.variants.filter((variant) => variant.barcode !== undefined).map((variant) => variant.size.trim());
      if (withSku.length) await tx.variant.updateMany({ where: { productId: input.id, size: { in: withSku } }, data: { sku: null } });
      if (withBarcode.length) await tx.variant.updateMany({ where: { productId: input.id, size: { in: withBarcode } }, data: { barcode: null } });
      for (const variant of input.variants) {
        const trimmedSize = variant.size.trim();
        const prev = current.variants.find((v) => v.size === trimmedSize)?.stock ?? 0;
        if (prev <= 0 && variant.stock > 0) {
          toReplenish.push(trimmedSize);
        }
        // A variant that leaves out sku/barcode keeps what it had (older clients send size and stock only).
        const codes = {
          ...(variant.sku !== undefined ? { sku: normalizeSku(variant.sku) ?? generated.get(trimmedSize) } : {}),
          ...(variant.barcode !== undefined ? { barcode: normalizeBarcode(variant.barcode) } : {}),
        };
        await tx.variant.upsert({
          where: { productId_size: { productId: input.id, size: trimmedSize } },
          create: { productId: input.id, size: trimmedSize, stock: variant.stock, ...codes },
          update: { stock: variant.stock, ...codes },
        });
      }
    }
    const product = await tx.product.update({
      where: { id: input.id },
      data: {
        name: merged.name.trim(), price: merged.price, color: merged.color.trim(), category: merged.category,
        subcategory: merged.subcategory?.trim() || null,
        categoryId: merged.categoryId?.trim() || null,
        description: merged.description?.trim() ?? '', details: merged.details?.trim() || null,
        material: merged.material?.trim() || null, care: merged.care?.trim() || null,
        compareAtPrice: merged.compareAtPrice ?? null,
        vatRate: merged.vatRate,
      },
      include: ADMIN_PRODUCT_INCLUDE,
    });
    return { updatedProduct: product, replenishedSizes: toReplenish };
  })).catch(rethrowDuplicateCode);

  for (const size of replenishedSizes) {
    await dispatchStockAlerts(input.id, size, db);
  }

  return updatedProduct;
}

export async function saveVariantStock(variantId: string, stock: number, db: PrismaClient, price?: number) {
  if (!Number.isInteger(stock) || stock < 0 ||
    price !== undefined && (!Number.isFinite(price) || price <= 0)) {
    throw new AdminProductError('INVALID_PRODUCT');
  }

  const { product, replenished } = await db.$transaction(async (tx) => {
    let toReplenish: { productId: string; size: string } | null = null;
    const variant = await tx.variant.findUnique({ where: { id: variantId } });
    if (!variant) throw new AdminProductError('NOT_FOUND');
    if (variant.stock <= 0 && stock > 0) {
      toReplenish = { productId: variant.productId, size: variant.size };
    }
    await tx.variant.update({ where: { id: variantId }, data: { stock } });
    if (price !== undefined) {
      const owner = await tx.product.findUniqueOrThrow({ where: { id: variant.productId }, select: { compareAtPrice: true } });
      if (compareAtPriceProblem(price, owner.compareAtPrice)) throw new AdminProductError('INVALID_COMPARE_PRICE');
      await tx.product.update({ where: { id: variant.productId }, data: { price } });
    }
    const p = await tx.product.findUniqueOrThrow({ where: { id: variant.productId }, include: ADMIN_PRODUCT_INCLUDE });
    return { product: p, replenished: toReplenish };
  });

  if (replenished) {
    await dispatchStockAlerts(replenished.productId, replenished.size, db);
  }

  return product;
}

export async function createFamily(name: string, db: PrismaClient) {
  if (!name?.trim() || name.trim().length > 160) throw new AdminProductError('INVALID_PRODUCT');
  return db.productFamily.create({ data: { name: name.trim() } });
}

export async function setFamily(input: { productId: string; familyId: string | null }, db: PrismaClient) {
  return db.$transaction(async (tx) => {
    const product = await tx.product.findUnique({ where: { id: input.productId } });
    if (!product) throw new AdminProductError('NOT_FOUND');
    if (input.familyId) {
      const family = await tx.productFamily.findUnique({ where: { id: input.familyId }, include: { products: true } });
      if (!family) throw new AdminProductError('NOT_FOUND');
      assertFamilyCandidate(product, family.products);
    }
    return tx.product.update({ where: { id: product.id }, data: { familyId: input.familyId }, include: ADMIN_PRODUCT_INCLUDE });
  });
}

export async function attachMedia(
  input: { productId: string; file: File; role: MediaRole; alt: string; posterMediaId?: string; isCover?: boolean },
  db: PrismaClient,
  storage: MediaStorage,
) {
  const product = await db.product.findUnique({ where: { id: input.productId } });
  if (!product) throw new AdminProductError('NOT_FOUND');
  if (!['FLATLAY', 'MODEL', 'DETAIL'].includes(input.role) || !input.alt?.trim() || input.alt.trim().length > 240) {
    throw new AdminProductError('INVALID_MEDIA');
  }
  const validated = await validateUpload(input.file);
  let posterUrl: string | null = null;
  if (validated.kind === 'VIDEO') {
    // One video per colour (product): the gallery and the card show a single clip.
    if (await db.productMedia.count({ where: { productId: input.productId, kind: 'VIDEO' } })) throw new AdminProductError('VIDEO_LIMIT');
    if (!input.posterMediaId) throw new AdminProductError('INVALID_MEDIA');
    const poster = await db.productMedia.findFirst({ where: { id: input.posterMediaId, productId: input.productId, kind: 'IMAGE' } });
    if (!poster) throw new AdminProductError('INVALID_MEDIA');
    posterUrl = poster.url;
  }
  const last = await db.productMedia.findFirst({ where: { productId: input.productId }, orderBy: { position: 'desc' } });
  const saved = await storage.put(validated.bytes, validated.contentType);
  try {
    return await db.$transaction(async (tx) => {
      if (input.isCover) await tx.productMedia.updateMany({ where: { productId: input.productId }, data: { isCover: false } });
      const media = await tx.productMedia.create({
        data: {
          productId: input.productId, kind: validated.kind, role: input.role,
          storageKey: saved.key, url: saved.url, posterUrl, alt: input.alt.trim(),
          position: (last?.position ?? -1) + 1, isCover: !!input.isCover,
        },
      });
      if (input.isCover) {
        await tx.product.update({ where: { id: input.productId }, data: { image: posterUrl || saved.url } });
      }
      return media;
    });
  } catch (error) {
    try { await storage.delete(saved.key); } catch (cleanupError) { console.error('Failed to clean uploaded media after DB error:', cleanupError); }
    throw error;
  }
}

export async function setCover(productId: string, mediaId: string, db: PrismaClient): Promise<void> {
  await db.$transaction(async (tx) => {
    const media = await tx.productMedia.findFirst({ where: { id: mediaId, productId } });
    if (!media) throw new AdminProductError('NOT_FOUND');
    if (media.kind === 'VIDEO' && !media.posterUrl) throw new AdminProductError('INVALID_MEDIA');
    await tx.productMedia.updateMany({ where: { productId }, data: { isCover: false } });
    await tx.productMedia.update({ where: { id: media.id }, data: { isCover: true } });
    await tx.product.update({ where: { id: productId }, data: { image: media.posterUrl || media.url } });
  });
}

const MEDIA_ROLES: readonly MediaRole[] = ['FLATLAY', 'MODEL', 'DETAIL'];

/** Shot type and/or description of one photo or video of the product. */
export async function updateMediaMeta(input: { productId: string; mediaId: string; role?: MediaRole; alt?: string }, db: PrismaClient) {
  const alt = input.alt?.trim();
  if (input.role === undefined && input.alt === undefined) throw new AdminProductError('INVALID_MEDIA');
  if (input.role !== undefined && !MEDIA_ROLES.includes(input.role)) throw new AdminProductError('INVALID_MEDIA');
  if (input.alt !== undefined && (!alt || alt.length > 240)) throw new AdminProductError('INVALID_MEDIA');
  const media = await db.productMedia.findFirst({ where: { id: input.mediaId, productId: input.productId } });
  if (!media) throw new AdminProductError('NOT_FOUND');
  return db.productMedia.update({
    where: { id: media.id },
    data: { ...(input.role !== undefined ? { role: input.role } : {}), ...(alt !== undefined ? { alt } : {}) },
  });
}

/** Another photo of the same product as the video's poster; a cover video also moves the product image. */
export async function setVideoPoster(input: { productId: string; videoId: string; posterMediaId: string }, db: PrismaClient) {
  return db.$transaction(async (tx) => {
    const video = await tx.productMedia.findFirst({ where: { id: input.videoId, productId: input.productId } });
    if (!video) throw new AdminProductError('NOT_FOUND');
    const poster = await tx.productMedia.findFirst({ where: { id: input.posterMediaId, productId: input.productId, kind: 'IMAGE' } });
    if (video.kind !== 'VIDEO' || !poster) throw new AdminProductError('INVALID_MEDIA');
    const updated = await tx.productMedia.update({ where: { id: video.id }, data: { posterUrl: poster.url } });
    if (video.isCover) await tx.product.update({ where: { id: input.productId }, data: { image: poster.url } });
    return updated;
  });
}

export async function saveMediaOrder(input: { productId: string; mediaId: string; position: number }, db: PrismaClient): Promise<void> {
  if (!Number.isInteger(input.position) || input.position < 0) throw new AdminProductError('INVALID_MEDIA');
  await db.$transaction(async (tx) => {
    const frames = await tx.productMedia.findMany({ where: { productId: input.productId }, orderBy: [{ position: 'asc' }, { id: 'asc' }] });
    const from = frames.findIndex((frame) => frame.id === input.mediaId);
    if (from < 0) throw new AdminProductError('NOT_FOUND');
    const [moving] = frames.splice(from, 1);
    frames.splice(Math.min(input.position, frames.length), 0, moving);
    for (let position = 0; position < frames.length; position++) {
      await tx.productMedia.update({ where: { id: frames[position].id }, data: { position } });
    }
  });
}

export async function deleteMedia(input: { productId: string; mediaId: string }, db: PrismaClient, storage: MediaStorage): Promise<void> {
  const deleted = await db.$transaction(async (tx) => {
    const product = await tx.product.findUnique({ where: { id: input.productId }, include: { media: { orderBy: { position: 'asc' } } } });
    if (!product) throw new AdminProductError('NOT_FOUND');
    const media = product.media.find((item) => item.id === input.mediaId);
    if (!media) throw new AdminProductError('NOT_FOUND');
    // The video's poster points at this photo's file; deleting it would leave the video with a broken poster.
    if (media.kind === 'IMAGE' && product.media.some((item) => item.kind === 'VIDEO' && item.posterUrl === media.url)) throw new AdminProductError('POSTER_IN_USE');
    if (media.isCover) {
      const replacement = product.media.find((item) => item.id !== media.id && (item.kind === 'IMAGE' || !!item.posterUrl));
      if (!replacement && product.status === 'PUBLISHED') throw new AdminProductError('COVER_REQUIRED');
      if (replacement) {
        await tx.productMedia.update({ where: { id: replacement.id }, data: { isCover: true } });
      }
      await tx.product.update({ where: { id: product.id }, data: { image: replacement?.posterUrl || replacement?.url || '' } });
    }
    await tx.productMedia.delete({ where: { id: media.id } });
    return media;
  });
  try {
    await storage.delete(deleted.storageKey);
  } catch (error) {
    console.error('Media record deleted but object cleanup failed:', { key: deleted.storageKey, error });
    throw new AdminProductError('CLEANUP_FAILED');
  }
}

export async function publishProduct(id: string, db: PrismaClient) {
  return db.$transaction(async (tx) => {
    const product = await tx.product.findUnique({ where: { id }, include: ADMIN_PRODUCT_INCLUDE });
    if (!product) throw new AdminProductError('NOT_FOUND');
    const problems = getPublishErrors({
      price: product.price, category: product.category, color: product.color,
      variants: product.variants,
      media: product.media.map(({ kind, url, posterUrl, isCover }) => ({ kind: kind as 'IMAGE' | 'VIDEO', url, posterUrl, isCover })),
    });
    if (problems.length) throw new AdminProductError('INVALID_PUBLISH');
    const cover = product.media.find((media) => media.isCover)!;
    return tx.product.update({
      where: { id }, data: { status: 'PUBLISHED', image: cover.posterUrl || cover.url }, include: ADMIN_PRODUCT_INCLUDE,
    });
  });
}
