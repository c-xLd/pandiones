import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { unpublishProduct } from '@/lib/admin/product-catalog';
import { adminForbiddenResponse, adminProductErrorResponse } from '@/lib/admin/product-editor-http';
import { refreshCatalogCache } from '@/lib/products/catalog-cache';

export const dynamic = 'force-dynamic';

/** Takes a product off the store (back to draft). */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getCurrentUser(request);
    if (!session || session.role !== 'ADMIN') return adminForbiddenResponse();
    const { id } = await params;
    const product = await unpublishProduct(prisma, session, id);
    refreshCatalogCache();
    return NextResponse.json({ success: true, product });
  } catch (error) {
    return adminProductErrorResponse(error);
  }
}
