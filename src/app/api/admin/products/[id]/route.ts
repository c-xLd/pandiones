import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { ADMIN_PRODUCT_INCLUDE, saveProduct } from '@/lib/admin/product-editor-service';
import { adminForbiddenResponse, adminProductErrorResponse } from '@/lib/admin/product-editor-http';
import { diffFields, recordAuditAfter } from '@/lib/audit';
import { deleteProduct } from '@/lib/admin/product-delete';
import { mediaStorageFromEnvironment, type MediaStorage } from '@/lib/media/storage';
import { requirePermission, requireRecentAuth } from '@/lib/security/admin-guard';
import { refreshCatalogCache } from '@/lib/products/catalog-cache';
import { revalidatePath, revalidateTag } from 'next/cache';
import { can } from '@/lib/security/roles';

const TRACKED = ['name', 'slug', 'price', 'compareAtPrice', 'vatRate', 'status', 'featured', 'color', 'category', 'subcategory', 'seoTitle', 'seoDescription', 'canonicalUrl', 'noindex', 'excludeFromFeed'] as const;
const STATUS_TEXT: Record<string, string> = { DRAFT: 'taslağa alındı', PUBLISHED: 'yayınlandı' };

export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  try {
    const session = await getCurrentUser();
    if (!session || !can(session.role, 'catalog')) return adminForbiddenResponse();
    const { id } = await params;
    const product = await prisma.product.findUnique({
      where: { id },
      include: ADMIN_PRODUCT_INCLUDE,
    });
    if (!product) return adminProductErrorResponse({ code: 'NOT_FOUND' });
    return NextResponse.json({ success: true, product });
  } catch (error) { return adminProductErrorResponse(error); }
}

export async function PATCH(request: Request, { params }: Context) {
  try {
    const session = await getCurrentUser();
    if (!session || !can(session.role, 'catalog')) return adminForbiddenResponse();
    const { id } = await params;
    const before = await prisma.product.findUnique({ where: { id }, include: { variants: true } });
    const product = await saveProduct({ ...(await request.json()), id }, prisma);
    if (before) {
      const pick = (p: typeof before) => Object.fromEntries(TRACKED.map((field) => [field, p[field]])) as Record<(typeof TRACKED)[number], unknown>;
      const diff = diffFields(pick(before), pick(product as typeof before), [...TRACKED]);
      const stockBefore = new Map(before.variants.map((v) => [v.size, v.stock]));
      for (const variant of (product as typeof before).variants ?? []) {
        if (stockBefore.get(variant.size) !== variant.stock) diff[`stok ${variant.size}`] = [stockBefore.get(variant.size) ?? null, variant.stock];
      }
      if (Object.keys(diff).length > 0) {
        const statusChange = diff.status ? STATUS_TEXT[String(diff.status[1])] : null;
        await recordAuditAfter(prisma, session, {
          action: statusChange ? 'product.status' : 'product.update',
          entity: 'product',
          entityId: product.id,
          summary: `${product.name}: ${statusChange ?? 'düzenlendi'}`,
          diff,
        });
      }
    }
    refreshCatalogCache();
    try {
      revalidateTag('catalog');
      revalidatePath(`/urun/${product.slug}`);
      revalidatePath('/', 'layout');
    } catch {
      // Ignore outside request context
    }
    return NextResponse.json({ success: true, product });
  } catch (error) { return adminProductErrorResponse(error); }
}

/**
 * Permanently deletes a product that was never ordered (deleteProduct). Irreversible, so it needs a 2FA
 * confirmation in the last 10 minutes; a product on any order answers 409 HAS_ORDERS (take it to draft).
 */
export async function DELETE(request: Request, { params }: Context) {
  const guard = await requirePermission(request, 'catalog');
  if (guard.response) return guard.response;
  const reauth = requireRecentAuth(guard.session);
  if (reauth) return reauth;
  try {
    const { id } = await params;
    let storage: MediaStorage | null = null;
    try {
      storage = mediaStorageFromEnvironment();
    } catch {
      // No storage configured: the records are still deleted; the files are reported as not cleaned up.
    }
    const result = await deleteProduct(prisma, storage, guard.session, id);
    refreshCatalogCache();
    try {
      revalidateTag('catalog');
      revalidatePath('/', 'layout');
    } catch {
      // Ignore outside request context
    }
    return NextResponse.json({ success: true, ...result }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return adminProductErrorResponse(error); }
}
