import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { markLabelsPrinted } from '@/lib/shipping/service';
import { forbidden } from '@/lib/shipping/http';
import { can } from '@/lib/security/roles';

export const dynamic = 'force-dynamic';

/** Remembers that labels were sent to the printer (first time only). */
export async function POST(request: Request) {
  const session = await getCurrentUser(request);
  if (!session || !can(session.role, 'orders')) return forbidden();
  const body = await request.json().catch(() => null);
  const ids = Array.isArray(body?.ids) ? body.ids.filter((id: unknown): id is string => typeof id === 'string').slice(0, 200) : [];
  if (!ids.length) return NextResponse.json({ error: 'Gönderi seçilmedi.' }, { status: 400 });
  try {
    return NextResponse.json({ success: true, updated: await markLabelsPrinted(prisma, ids) });
  } catch (error) {
    console.error('Mark labels printed error:', error);
    return NextResponse.json({ error: 'Etiket kaydı güncellenemedi.' }, { status: 500 });
  }
}
