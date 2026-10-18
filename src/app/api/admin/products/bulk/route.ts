import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { BULK_ACTIONS, bulkUpdateProducts, type BulkAction } from '@/lib/admin/product-catalog';
import { adminForbiddenResponse, adminProductErrorResponse } from '@/lib/admin/product-editor-http';
import { refreshCatalogCache } from '@/lib/products/catalog-cache';
import { mediaStorageFromEnvironment, type MediaStorage } from '@/lib/media/storage';
import { requireRecentAuth } from '@/lib/security/admin-guard';
import { revalidatePath, revalidateTag } from 'next/cache';
import { can } from '@/lib/security/roles';

export const dynamic = 'force-dynamic';

/** One action (publish, draft, feature, unfeature, category, delete) for up to 100 products. */
export async function POST(request: Request) {
  try {
    const session = await getCurrentUser(request);
    if (!session || !can(session.role, 'catalog')) return adminForbiddenResponse();
    const body = await request.json().catch(() => null);
    const ids = Array.isArray(body?.ids) ? body.ids.filter((id: unknown): id is string => typeof id === 'string') : [];
    const action = body?.action as BulkAction;
    if (!ids.length || ids.length > 100 || !BULK_ACTIONS.includes(action)) {
      return NextResponse.json({ success: false, error: '1–100 ürün ve geçerli bir işlem seçin.' }, { status: 400 });
    }
    if (action === 'delete') {
      const reauth = requireRecentAuth(session);
      if (reauth) return reauth;
    }
    let storage: MediaStorage | null = null;
    try {
      storage = mediaStorageFromEnvironment();
    } catch {
      // storage unavailable
    }
    const result = await bulkUpdateProducts(
      prisma,
      session,
      {
        ids,
        action,
        category: typeof body.category === 'string' ? body.category : null,
        subcategory: typeof body.subcategory === 'string' && body.subcategory ? body.subcategory : null,
      },
      storage,
    );
    refreshCatalogCache();
    try {
      revalidateTag('catalog');
      revalidatePath('/', 'layout');
    } catch {
      // Ignore outside request context
    }
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return adminProductErrorResponse(error);
  }
}
