import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { addColorVariant, linkColorProduct, listColorCandidates } from '@/lib/admin/product-catalog';
import { adminForbiddenResponse, adminProductErrorResponse } from '@/lib/admin/product-editor-http';
import { readJson } from '@/lib/security/request';
import { refreshCatalogCache } from '@/lib/products/catalog-cache';
import { can } from '@/lib/security/roles';
import { productJson } from '@/lib/money-json';

export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ id: string }> };

/** GET — products that could join this model as a colour ("Mevcut ürünü bağla"). */
export async function GET(request: Request, { params }: Context) {
  try {
    const session = await getCurrentUser(request);
    if (!session || !can(session.role, 'catalog')) return adminForbiddenResponse();
    const { id } = await params;
    return NextResponse.json({ success: true, candidates: await listColorCandidates(prisma, id) });
  } catch (error) {
    return adminProductErrorResponse(error);
  }
}

/**
 * POST { color } — the same model in another colour, as a new draft in the product's colour family.
 * POST { productId } — an existing product joins the family as a colour.
 */
export async function POST(request: Request, { params }: Context) {
  try {
    const session = await getCurrentUser(request);
    if (!session || !can(session.role, 'catalog')) return adminForbiddenResponse();
    const parsed = await readJson<{ color?: unknown; productId?: unknown }>(request, 1024);
    if (!parsed.ok) return NextResponse.json({ success: false, error: 'Geçersiz istek.' }, { status: parsed.status });
    const { id } = await params;
    const product = parsed.body.productId !== undefined
      ? await linkColorProduct(prisma, session, id, parsed.body.productId)
      : await addColorVariant(prisma, session, id, parsed.body.color);
    refreshCatalogCache();
    return NextResponse.json({ success: true, product: productJson(product) });
  } catch (error) {
    return adminProductErrorResponse(error);
  }
}
