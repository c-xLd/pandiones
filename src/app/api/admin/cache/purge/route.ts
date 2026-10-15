import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, requireRecentAuth } from '@/lib/security/admin-guard';
import { recordAudit } from '@/lib/audit';
import { revalidatePath, revalidateTag } from 'next/cache';
import { refreshCatalogCache } from '@/lib/products/catalog-cache';
import { revalidateStoreSettings } from '@/lib/settings/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const guard = await requireAdmin(request);
  if (guard.response) return guard.response;

  const stepUp = requireRecentAuth(guard.session);
  if (stepUp) return stepUp;

  let body: { target?: string; path?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Geçersiz JSON içeriği.' }, { status: 400 });
  }

  const target = body?.target || 'all';
  const validTargets = ['all', 'home', 'categories', 'products', 'specific'];
  if (!validTargets.includes(target)) {
    return NextResponse.json({ error: 'Geçersiz önbellek hedefi.' }, { status: 422 });
  }

  const purged: string[] = [];

  try {
    if (target === 'all') {
      refreshCatalogCache();
      revalidateTag('catalog');
      revalidateTag('categories');
      revalidateStoreSettings();
      revalidatePath('/', 'layout');
      purged.push('catalog', 'categories', 'store-settings', '/');
    } else if (target === 'home') {
      refreshCatalogCache();
      revalidateTag('catalog');
      revalidatePath('/');
      purged.push('catalog', '/');
    } else if (target === 'categories') {
      revalidateTag('categories');
      revalidatePath('/[kategori]', 'page');
      purged.push('categories', '/[kategori]');
    } else if (target === 'products') {
      refreshCatalogCache();
      revalidateTag('catalog');
      revalidatePath('/urun/[slug]', 'page');
      purged.push('catalog', '/urun/[slug]');
    } else if (target === 'specific') {
      const p = body.path && body.path.startsWith('/') ? body.path : '/';
      revalidatePath(p);
      purged.push(p);
    }
  } catch {
    // Outside a Next request context (e.g. tests), ignore cache engine absence
  }

  const timestamp = new Date().toISOString();

  await recordAudit(prisma, guard.session, {
    action: 'cache.purge',
    entity: 'cache',
    entityId: target,
    summary: `Önbellek temizlendi (Hedef: ${target}, Temizlenen: ${purged.join(', ')})`,
  });

  return NextResponse.json(
    {
      success: true,
      target,
      purged,
      timestamp,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
