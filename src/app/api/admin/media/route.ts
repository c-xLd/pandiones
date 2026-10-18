import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { can } from '@/lib/security/roles';
import { getAdminMediaGallery } from '@/lib/admin/media-gallery';

export const dynamic = 'force-dynamic';

const forbidden = () => NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 403 });

export async function GET(request: Request) {
  const session = await getCurrentUser(request);
  if (!session || (!can(session.role, 'catalog') && session.role !== 'ADMIN')) {
    return forbidden();
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') ?? undefined;
  const category = searchParams.get('category') ?? undefined;

  try {
    const items = await getAdminMediaGallery(prisma, { query, category });
    return NextResponse.json({ success: true, items });
  } catch (error) {
    console.error('Admin media fetch error:', error);
    return NextResponse.json({ error: 'Medya galerisi okunamadı.' }, { status: 500 });
  }
}
