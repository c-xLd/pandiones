import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { attachMedia, deleteMedia, saveMediaOrder, setCover, setVideoPoster, updateMediaMeta } from '@/lib/admin/product-editor-service';
import { adminForbiddenResponse, adminProductErrorResponse } from '@/lib/admin/product-editor-http';
import { mediaStorageFromEnvironment } from '@/lib/media/storage';
import type { MediaRole } from '@/lib/products/media-domain';
import { readJson } from '@/lib/security/request';
import { refreshCatalogCache } from '@/lib/products/catalog-cache';
import { can } from '@/lib/security/roles';
import { toTlJson } from '@/lib/money-json';

export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ id: string }> };

async function currentProduct(id: string) {
  return prisma.product.findUnique({ where: { id }, include: { variants: true, media: { orderBy: { position: 'asc' } }, family: true } });
}

export async function POST(request: Request, { params }: Context) {
  try {
    const session = await getCurrentUser();
    if (!session || !can(session.role, 'catalog')) return adminForbiddenResponse();
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
    refreshCatalogCache();
    return NextResponse.json({ success: true, media, product: toTlJson(await currentProduct(id)) });
  } catch (error) { return adminProductErrorResponse(error); }
}

type MediaPatch = { action?: unknown; mediaId?: unknown; position?: unknown; role?: unknown; alt?: unknown; posterMediaId?: unknown };

/**
 * PATCH { action: 'cover', mediaId } | { action: 'order', mediaId, position }
 *     | { action: 'meta', mediaId, role?, alt? } | { action: 'poster', mediaId (video), posterMediaId }
 */
export async function PATCH(request: Request, { params }: Context) {
  try {
    const session = await getCurrentUser(request);
    if (!session || !can(session.role, 'catalog')) return adminForbiddenResponse();
    const { id } = await params;
    const parsed = await readJson<MediaPatch>(request, 2048);
    if (!parsed.ok) return adminProductErrorResponse({ code: 'INVALID_MEDIA' });
    const body = parsed.body;
    const mediaId = String(body.mediaId ?? '');
    if (body.action === 'cover') await setCover(id, mediaId, prisma);
    else if (body.action === 'order') await saveMediaOrder({ productId: id, mediaId, position: body.position as number }, prisma);
    else if (body.action === 'meta') {
      await updateMediaMeta({
        productId: id, mediaId,
        ...(body.role !== undefined ? { role: String(body.role) as MediaRole } : {}),
        ...(body.alt !== undefined ? { alt: String(body.alt) } : {}),
      }, prisma);
    } else if (body.action === 'poster') await setVideoPoster({ productId: id, videoId: mediaId, posterMediaId: String(body.posterMediaId ?? '') }, prisma);
    else return adminProductErrorResponse({ code: 'INVALID_MEDIA' });
    refreshCatalogCache();
    return NextResponse.json({ success: true, product: toTlJson(await currentProduct(id)) });
  } catch (error) { return adminProductErrorResponse(error); }
}

export async function DELETE(request: Request, { params }: Context) {
  try {
    const session = await getCurrentUser(request);
    if (!session || !can(session.role, 'catalog')) return adminForbiddenResponse();
    const { id } = await params;
    const parsed = await readJson<{ mediaId?: unknown }>(request, 1024);
    if (!parsed.ok) return adminProductErrorResponse({ code: 'INVALID_MEDIA' });
    const body = parsed.body;
    await deleteMedia({ productId: id, mediaId: String(body.mediaId) }, prisma, mediaStorageFromEnvironment());
    refreshCatalogCache();
    return NextResponse.json({ success: true, product: toTlJson(await currentProduct(id)) });
  } catch (error) { return adminProductErrorResponse(error); }
}
