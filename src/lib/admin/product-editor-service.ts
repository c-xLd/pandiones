import { randomUUID } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';
import { assertFamilyCandidate, getPublishErrors, type MediaRole } from '@/lib/products/media-domain';
import { validateUpload } from '@/lib/media/validate-upload';
import type { MediaStorage } from '@/lib/media/storage';

const ADMIN_PRODUCT_INCLUDE = {
  variants: true,
  media: { orderBy: { position: 'asc' as const } },
  family: true,
} as const;

export class AdminProductError extends Error {
  constructor(public readonly code: 'INVALID_PRODUCT' | 'INVALID_MEDIA' | 'INVALID_PUBLISH' | 'NOT_FOUND' | 'COVER_REQUIRED' | 'CLEANUP_FAILED') {
    super(code);
  }
}

export type DraftInput = {
  name: string;
  slug?: string;
  price: number;
  color: string;
  category: string;
  description?: string;
  details?: string | null;
  material?: string | null;
  care?: string | null;
  variants: { size: string; stock: number }[];
};

function validateScalars(input: DraftInput): void {
  const sizes = input.variants?.map((variant) => variant.size.trim()) ?? [];
  if (!input.name?.trim() || input.name.trim().length > 160 ||
    !Number.isFinite(input.price) || input.price <= 0 ||
    !input.color?.trim() || input.color.trim().length > 80 ||
    !['ic-giyim', 'ev-giyim'].includes(input.category) ||
    !sizes.length || new Set(sizes).size !== sizes.length ||
    input.variants.some((variant) => !variant.size.trim() || !Number.isInteger(variant.stock) || variant.stock < 0)
  ) throw new AdminProductError('INVALID_PRODUCT');
}

function slugify(value: string): string {
  return value.toLocaleLowerCase('tr-TR')
    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
    .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export async function createDraft(input: DraftInput, db: PrismaClient) {
  validateScalars(input);
  const slugBase = slugify(input.slug?.trim() || input.name);
  if (!slugBase) throw new AdminProductError('INVALID_PRODUCT');
  return db.product.create({
    data: {
      slug: `${slugBase}-${randomUUID().slice(0, 8)}`,
      name: input.name.trim(), price: input.price, color: input.color.trim(),
      category: input.category, image: '', status: 'DRAFT',
      description: input.description?.trim() ?? '',
      details: input.details?.trim() || null,
      material: input.material?.trim() || null,
      care: input.care?.trim() || null,
      variants: { create: input.variants.map((variant) => ({ size: variant.size.trim(), stock: variant.stock })) },
    },
    include: ADMIN_PRODUCT_INCLUDE,
  });
}

export type ProductUpdate = { id: string } & Partial<Omit<DraftInput, 'slug'>>;

export async function saveProduct(input: ProductUpdate, db: PrismaClient) {
  return db.$transaction(async (tx) => {
    const current = await tx.product.findUnique({ where: { id: input.id }, include: { variants: true } });
    if (!current) throw new AdminProductError('NOT_FOUND');
    const merged: DraftInput = {
      name: input.name ?? current.name,
      price: input.price ?? current.price,
      color: input.color ?? current.color,
      category: input.category ?? current.category,
      description: input.description ?? current.description,
      details: input.details ?? current.details,
      material: input.material ?? current.material,
      care: input.care ?? current.care,
      variants: input.variants ?? current.variants.map(({ size, stock }) => ({ size, stock })),
    };
    validateScalars(merged);
    if (input.variants) {
      const sizes = input.variants.map((variant) => variant.size.trim());
      await tx.variant.deleteMany({ where: { productId: input.id, size: { notIn: sizes } } });
      for (const variant of input.variants) {
        await tx.variant.upsert({
          where: { productId_size: { productId: input.id, size: variant.size.trim() } },
          create: { productId: input.id, size: variant.size.trim(), stock: variant.stock },
          update: { stock: variant.stock },
        });
      }
    }
    return tx.product.update({
      where: { id: input.id },
      data: {
        name: merged.name.trim(), price: merged.price, color: merged.color.trim(), category: merged.category,
        description: merged.description?.trim() ?? '', details: merged.details?.trim() || null,
        material: merged.material?.trim() || null, care: merged.care?.trim() || null,
      },
      include: ADMIN_PRODUCT_INCLUDE,
    });
  });
}

export async function saveVariantStock(variantId: string, stock: number, db: PrismaClient, price?: number) {
  if (!Number.isInteger(stock) || stock < 0 ||
    price !== undefined && (!Number.isFinite(price) || price <= 0)) {
    throw new AdminProductError('INVALID_PRODUCT');
  }
  return db.$transaction(async (tx) => {
    const variant = await tx.variant.findUnique({ where: { id: variantId } });
    if (!variant) throw new AdminProductError('NOT_FOUND');
    await tx.variant.update({ where: { id: variantId }, data: { stock } });
    if (price !== undefined) await tx.product.update({ where: { id: variant.productId }, data: { price } });
    return tx.product.findUniqueOrThrow({ where: { id: variant.productId }, include: ADMIN_PRODUCT_INCLUDE });
  });
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

export async function saveMediaOrder(input: { productId: string; mediaId: string; position: number }, db: PrismaClient): Promise<void> {
  if (!Number.isInteger(input.position) || input.position < 0) throw new AdminProductError('INVALID_MEDIA');
  await db.$transaction(async (tx) => {
    const media = await tx.productMedia.findFirst({ where: { id: input.mediaId, productId: input.productId } });
    if (!media) throw new AdminProductError('NOT_FOUND');
    await tx.productMedia.update({ where: { id: media.id }, data: { position: input.position } });
  });
}

export async function deleteMedia(input: { productId: string; mediaId: string }, db: PrismaClient, storage: MediaStorage): Promise<void> {
  const deleted = await db.$transaction(async (tx) => {
    const product = await tx.product.findUnique({ where: { id: input.productId }, include: { media: { orderBy: { position: 'asc' } } } });
    if (!product) throw new AdminProductError('NOT_FOUND');
    const media = product.media.find((item) => item.id === input.mediaId);
    if (!media) throw new AdminProductError('NOT_FOUND');
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
