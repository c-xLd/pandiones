import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { logPersonalDataAccess } from '@/lib/security/admin-guard';
import { recordAudit } from '@/lib/audit';

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

    const updated = await prisma.$transaction(async (tx) => {
      const before = await tx.contactMessage.findUnique({
        where: { id },
        select: { status: true, email: true, subject: true },
      });
      if (!before) {
        return null;
      }
      const changed = await tx.contactMessage.update({
        where: { id },
        data: { status },
      });
      if (before.status !== status) {
        await recordAudit(tx, session, {
          action: 'contact_message.status',
          entity: 'contact_message',
          entityId: changed.id,
          summary: `İletişim mesajı (${before.email}): ${status === 'YANITLANDI' ? 'yanıtlandı' : 'yeniye alındı'}`,
          diff: { status: [before.status, status] },
        });
      }
      return changed;
    });

    if (!updated) {
      return NextResponse.json({ error: 'Mesaj bulunamadı.' }, { status: 404 });
    }

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

    const deleted = await prisma.$transaction(async (tx) => {
      const before = await tx.contactMessage.findUnique({
        where: { id },
        select: { email: true, subject: true },
      });
      if (!before) {
        return false;
      }
      await tx.contactMessage.delete({
        where: { id },
      });
      await recordAudit(tx, session, {
        action: 'contact_message.delete',
        entity: 'contact_message',
        entityId: id,
        summary: `İletişim mesajı silindi (${before.email} - ${before.subject})`,
      });
      return true;
    });

    if (!deleted) {
      return NextResponse.json({ error: 'Mesaj bulunamadı.' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin contact message DELETE error:', error);
    return NextResponse.json({ error: 'Mesaj silinemedi.' }, { status: 500 });
  }
}

