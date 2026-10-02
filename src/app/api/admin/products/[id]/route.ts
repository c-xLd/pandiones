import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { saveProduct } from '@/lib/admin/product-editor-service';
import { adminForbiddenResponse, adminProductErrorResponse } from '@/lib/admin/product-editor-http';
import { diffFields, recordAuditAfter } from '@/lib/audit';

const TRACKED = ['name', 'slug', 'price', 'status', 'featured', 'color', 'category', 'subcategory'] as const;
const STATUS_TEXT: Record<string, string> = { DRAFT: 'taslağa alındı', PUBLISHED: 'yayınlandı' };

export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  try {
    const session = await getCurrentUser();
    if (!session || session.role !== 'ADMIN') return adminForbiddenResponse();
    const { id } = await params;
    const product = await prisma.product.findUnique({
      where: { id },
      include: { variants: true, media: { orderBy: { position: 'asc' } }, family: true },
    });
    if (!product) return adminProductErrorResponse({ code: 'NOT_FOUND' });
    return NextResponse.json({ success: true, product });
  } catch (error) { return adminProductErrorResponse(error); }
}

export async function PATCH(request: Request, { params }: Context) {
  try {
    const session = await getCurrentUser();
    if (!session || session.role !== 'ADMIN') return adminForbiddenResponse();
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
    return NextResponse.json({ success: true, product });
  } catch (error) { return adminProductErrorResponse(error); }
}
