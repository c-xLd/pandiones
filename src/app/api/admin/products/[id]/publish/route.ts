import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { publishProduct } from '@/lib/admin/product-editor-service';
import { adminForbiddenResponse, adminProductErrorResponse } from '@/lib/admin/product-editor-http';
import { recordAuditAfter } from '@/lib/audit';
import { refreshCatalogCache } from '@/lib/products/catalog-cache';

export const dynamic = 'force-dynamic';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getCurrentUser(request);
    if (!session || session.role !== 'ADMIN') return adminForbiddenResponse();
    const { id } = await params;
    const before = await prisma.product.findUnique({ where: { id }, select: { status: true } });
    const product = await publishProduct(id, prisma);
    if (before && before.status !== 'PUBLISHED') {
      await recordAuditAfter(prisma, session, { action: 'product.status', entity: 'product', entityId: id, summary: `${product.name}: yayınlandı`, diff: { status: [before.status, 'PUBLISHED'] } });
    }
    refreshCatalogCache();
    return NextResponse.json({ success: true, product });
  } catch (error) { return adminProductErrorResponse(error); }
}
