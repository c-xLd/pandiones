import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { logPersonalDataAccess } from '@/lib/security/admin-guard';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getCurrentUser(request);
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 403 });
    }
    await logPersonalDataAccess(session, 'contact-messages', 'Destek mesajları görüntülendi');

    const messages = await prisma.contactMessage.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(messages);
  } catch (error) {
    console.error('Admin contact messages GET error:', error);
    return NextResponse.json({ error: 'Mesajlar alınamadı.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getCurrentUser(request);
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 403 });
    }

    const { id, status } = await request.json();
    if (!id || !['YENI', 'YANITLANDI'].includes(status)) {
      return NextResponse.json({ error: 'Geçersiz mesaj ID veya durum.' }, { status: 400 });
    }

    const updated = await prisma.contactMessage.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json({ success: true, message: updated });
  } catch (error) {
    console.error('Admin contact message PATCH error:', error);
    return NextResponse.json({ error: 'Mesaj durumu güncellenemedi.' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getCurrentUser(request);
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 403 });
    }

    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ error: 'Mesaj ID gereklidir.' }, { status: 400 });
    }

    await prisma.contactMessage.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin contact message DELETE error:', error);
    return NextResponse.json({ error: 'Mesaj silinemedi.' }, { status: 500 });
  }
}
