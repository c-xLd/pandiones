import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getCurrentUser();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 403 });
    }

    const returns = await prisma.returnRequest.findMany({
      include: {
        order: {
          include: {
            items: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(returns);
  } catch (error) {
    console.error('Error fetching admin return requests:', error);
    return NextResponse.json(
      { error: 'İade talepleri yüklenemedi.' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getCurrentUser();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 403 });
    }

    const body = await request.json();
    const { id, status, adminNotes } = body;

    if (!id || !['BEKLIYOR', 'ONAYLANDI', 'REDDEDILDI'].includes(status)) {
      return NextResponse.json(
        { error: 'Geçersiz talep ID veya durum.' },
        { status: 400 }
      );
    }

    const updated = await prisma.returnRequest.update({
      where: { id },
      data: {
        status,
        ...(adminNotes !== undefined ? { adminNotes } : {}),
      },
    });

    return NextResponse.json({
      success: true,
      message: `İade talebi durumu "${status}" olarak güncellendi.`,
      returnRequest: updated,
    });
  } catch (error) {
    console.error('Error updating return request:', error);
    return NextResponse.json(
      { error: 'İade talebi güncellenirken bir hata oluştu.' },
      { status: 500 }
    );
  }
}
