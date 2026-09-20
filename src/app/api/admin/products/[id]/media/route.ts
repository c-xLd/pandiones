import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { attachMedia, deleteMedia, saveMediaOrder, setCover } from '@/lib/admin/product-editor-service';
import { adminForbiddenResponse, adminProductErrorResponse } from '@/lib/admin/product-editor-http';
import { mediaStorageFromEnvironment } from '@/lib/media/storage';
import type { MediaRole } from '@/lib/products/media-domain';

export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ id: string }> };

async function currentProduct(id: string) {
  return prisma.product.findUnique({ where: { id }, include: { variants: true, media: { orderBy: { position: 'asc' } }, family: true } });
}

export async function POST(request: Request, { params }: Context) {
  try {
    const session = await getCurrentUser();
    if (!session || session.role !== 'ADMIN') return adminForbiddenResponse();
    const { id } = await params;
    const data = await request.formData();
    const file = data.get('file');
    if (!(file instanceof File)) return adminProductErrorResponse({ code: 'INVALID_MEDIA' });
    const posterMediaId = data.get('posterMediaId');
    const media = await attachMedia({
      productId: id, file, role: String(data.get('role')) as MediaRole,
      alt: String(data.get('alt') ?? ''),
      ...(typeof posterMediaId === 'string' && posterMediaId ? { posterMediaId } : {}),
      isCover: data.get('isCover') === 'true',
    }, prisma, mediaStorageFromEnvironment());
    return NextResponse.json({ success: true, media, product: await currentProduct(id) });
  } catch (error) { return adminProductErrorResponse(error); }
}

export async function PATCH(request: Request, { params }: Context) {
  try {
    const session = await getCurrentUser();
    if (!session || session.role !== 'ADMIN') return adminForbiddenResponse();
    const { id } = await params;
    const body = await request.json();
    if (body.action === 'cover') await setCover(id, String(body.mediaId), prisma);
    else if (body.action === 'order') await saveMediaOrder({ productId: id, mediaId: String(body.mediaId), position: body.position }, prisma);
    else return adminProductErrorResponse({ code: 'INVALID_MEDIA' });
    return NextResponse.json({ success: true, product: await currentProduct(id) });
  } catch (error) { return adminProductErrorResponse(error); }
}

export async function DELETE(request: Request, { params }: Context) {
  try {
    const session = await getCurrentUser();
    if (!session || session.role !== 'ADMIN') return adminForbiddenResponse();
    const { id } = await params;
    const body = await request.json();
    await deleteMedia({ productId: id, mediaId: String(body.mediaId) }, prisma, mediaStorageFromEnvironment());
    return NextResponse.json({ success: true, product: await currentProduct(id) });
  } catch (error) { return adminProductErrorResponse(error); }
}
