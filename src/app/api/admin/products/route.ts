import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { createDraft, saveProduct, saveVariantStock } from '@/lib/admin/product-editor-service';
import { adminForbiddenResponse, adminProductErrorResponse } from '@/lib/admin/product-editor-http';
import { recordAudit, recordAuditAfter } from '@/lib/audit';
import { listAdminProducts } from '@/lib/admin/product-catalog';
import { getStoreSettings } from '@/lib/settings/server';
import { refreshCatalogCache } from '@/lib/products/catalog-cache';

export const dynamic = 'force-dynamic';

/** Products for the panel, with 30-day sales, waiting stock requests per size and the low-stock threshold. */
export async function GET() {
  try {
    const session = await getCurrentUser();
    if (!session || session.role !== 'ADMIN') {
      return adminForbiddenResponse();
    }
    const [products, settings] = await Promise.all([listAdminProducts(prisma), getStoreSettings()]);
    return NextResponse.json({ products, lowStockThreshold: settings.lowStockThreshold });
  } catch (error) {
    console.error('Admin products fetch error:', error);
    return NextResponse.json({ error: 'Ürünler alınamadı.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getCurrentUser();
    if (!session || session.role !== 'ADMIN') {
      return adminForbiddenResponse();
    }

    const body = await request.json();
    const product = await createDraft(body, prisma);
    await recordAuditAfter(prisma, session, {
      action: 'product.create',
      entity: 'product',
      entityId: product.id,
      summary: `${product.name}: taslak oluşturuldu`,
    });

    refreshCatalogCache();
    return NextResponse.json({ success: true, product });
  } catch (error) {
    return adminProductErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getCurrentUser();
    if (!session || session.role !== 'ADMIN') {
      return adminForbiddenResponse();
    }

    const { variantId, stock, price, productId, featured } = await request.json();

    if (variantId && stock !== undefined) {
      const before = await prisma.variant.findUnique({ where: { id: String(variantId) }, select: { size: true, stock: true, product: { select: { price: true } } } });
      const product = await saveVariantStock(String(variantId), Number(stock), prisma, price !== undefined ? Number(price) : undefined);
      if (before) {
        const diff: Record<string, [unknown, unknown]> = {};
        if (before.stock !== Number(stock)) diff[`stok ${before.size}`] = [before.stock, Number(stock)];
        if (price !== undefined && before.product.price !== Number(price)) diff.price = [before.product.price, Number(price)];
        if (Object.keys(diff).length > 0) {
          await recordAuditAfter(prisma, session, {
            action: 'product.stock',
            entity: 'product',
            entityId: product.id,
            summary: `${product.name}: ${before.size} bedeni stoğu ${before.stock} → ${Number(stock)}`,
            diff,
          });
        }
      }
      refreshCatalogCache();
      return NextResponse.json({ success: true, product });
    }
    if (productId && price !== undefined) {
      const before = await prisma.product.findUnique({ where: { id: String(productId) }, select: { price: true } });
      const product = await saveProduct({ id: String(productId), price: Number(price) }, prisma);
      if (before && before.price !== product.price) {
        await recordAuditAfter(prisma, session, {
          action: 'product.update',
          entity: 'product',
          entityId: product.id,
          summary: `${product.name}: fiyat güncellendi`,
          diff: { price: [before.price, product.price] },
        });
      }
      refreshCatalogCache();
      return NextResponse.json({ success: true, product });
    }
    if (productId && featured !== undefined) {
      const product = await prisma.$transaction(async (tx) => {
        const updated = await tx.product.update({
          where: { id: String(productId) },
          data: { featured: Boolean(featured) },
        });
        await recordAudit(tx, session, {
          action: 'product.update',
          entity: 'product',
          entityId: updated.id,
          summary: `${updated.name}: vitrin ${updated.featured ? 'açıldı' : 'kapatıldı'}`,
          diff: { featured: [!updated.featured, updated.featured] },
        });
        return updated;
      });
      refreshCatalogCache();
      return NextResponse.json({ success: true, product });
    }
    return adminProductErrorResponse({ code: 'INVALID_PRODUCT' });
  } catch (error) {
    return adminProductErrorResponse(error);
  }
}
