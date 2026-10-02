import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 30;
const ENTITIES = ['settings', 'order', 'product', 'coupon', 'return', 'pii'] as const;

/** Activity log, newest first. `?entity=` filters, `?cursor=<id>` continues. */
export async function GET(request: Request) {
  const session = await getCurrentUser(request);
  if (!session || session.role !== 'ADMIN') return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 403 });

  const params = new URL(request.url).searchParams;
  const entityParam = params.get('entity');
  const entity = ENTITIES.find((value) => value === entityParam);
  const cursor = params.get('cursor');

  try {
    const rows = await prisma.auditLog.findMany({
      where: entity ? { entity } : undefined,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: PAGE_SIZE + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    const hasMore = rows.length > PAGE_SIZE;
    const entries = rows.slice(0, PAGE_SIZE).map((row) => ({
      ...row,
      createdAt: row.createdAt.toISOString(),
      diff: row.diff ? (JSON.parse(row.diff) as Record<string, [unknown, unknown]>) : null,
    }));
    return NextResponse.json({ entries, nextCursor: hasMore ? entries[entries.length - 1].id : null });
  } catch (error) {
    console.error('Admin audit read error:', error);
    return NextResponse.json({ error: 'Etkinlik kaydı okunamadı.' }, { status: 500 });
  }
}
