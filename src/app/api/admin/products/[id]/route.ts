import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { saveProduct } from '@/lib/admin/product-editor-service';
import { adminForbiddenResponse, adminProductErrorResponse } from '@/lib/admin/product-editor-http';

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
    const product = await saveProduct({ ...(await request.json()), id }, prisma);
    return NextResponse.json({ success: true, product });
  } catch (error) { return adminProductErrorResponse(error); }
}
