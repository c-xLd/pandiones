import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { unpublishProduct } from '@/lib/admin/product-catalog';
import { adminForbiddenResponse, adminProductErrorResponse } from '@/lib/admin/product-editor-http';
import { refreshCatalogCache } from '@/lib/products/catalog-cache';
import { can } from '@/lib/security/roles';
import { productJson } from '@/lib/money-json';

export const dynamic = 'force-dynamic';

/** Takes a product off the store (back to draft). */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getCurrentUser(request);
    if (!session || !can(session.role, 'catalog')) return adminForbiddenResponse();
    const { id } = await params;
    const product = await unpublishProduct(prisma, session, id);
    refreshCatalogCache();
    return NextResponse.json({ success: true, product: productJson(product) });
  } catch (error) {
    return adminProductErrorResponse(error);
  }
}
