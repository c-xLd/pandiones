import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { logPersonalDataAccess } from '@/lib/security/admin-guard';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getCurrentUser();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 403 });
    }
    await logPersonalDataAccess(session, 'newsletter', 'Bülten aboneleri görüntülendi');

    const subscribers = await prisma.newsletter.findMany({
      orderBy: { subscribedAt: 'desc' },
    });

    return NextResponse.json(subscribers);
  } catch (error) {
    console.error('Admin newsletter error:', error);
    return NextResponse.json({ error: 'Aboneler alınamadı.' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getCurrentUser();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 403 });
    }

    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ error: 'Abone ID gerekli.' }, { status: 400 });
    }

    await prisma.newsletter.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin newsletter delete error:', error);
    return NextResponse.json({ error: 'Abone silinemedi.' }, { status: 500 });
  }
}
