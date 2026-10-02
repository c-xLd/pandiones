import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { requireRecentAuth } from '@/lib/security/admin-guard';
import { recordAudit } from '@/lib/audit';
import { validateCouponInput } from '@/lib/orders/coupon-rules';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getCurrentUser();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 403 });
    }

    const coupons = await prisma.coupon.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(coupons);
  } catch (error) {
    console.error('Admin coupons fetch error:', error);
    return NextResponse.json({ error: 'Kuponlar alınamadı.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getCurrentUser(request);
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 403 });
    }
    const stepUp = requireRecentAuth(session);
    if (stepUp) return stepUp;

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Geçersiz istek.' }, { status: 400 });
    const checked = validateCouponInput(body);
    if (!checked.ok) return NextResponse.json({ error: checked.error }, { status: 400 });
    if (await prisma.coupon.findUnique({ where: { code: checked.value.code }, select: { id: true } })) {
      return NextResponse.json({ error: 'Bu kodla bir kupon zaten var.' }, { status: 409 });
    }

    const created = await prisma.$transaction(async (tx) => {
      const coupon = await tx.coupon.create({ data: { ...checked.value, isActive: true } });
      await recordAudit(tx, session, {
        action: 'coupon.create',
        entity: 'coupon',
        entityId: coupon.id,
        summary: `${coupon.code} kuponu oluşturuldu (${coupon.discountType === 'PERCENTAGE' ? `%${coupon.discountValue}` : `${coupon.discountValue} ₺`})`,
      });
      return coupon;
    });

    return NextResponse.json({ success: true, coupon: created });
  } catch (error) {
    console.error('Admin coupon create error:', error);
    return NextResponse.json({ error: 'Kupon oluşturulamadı.' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getCurrentUser(request);
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 403 });
    }
    const stepUp = requireRecentAuth(session);
    if (stepUp) return stepUp;

    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ error: 'Kupon ID gerekli.' }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      const coupon = await tx.coupon.delete({ where: { id } });
      await recordAudit(tx, session, {
        action: 'coupon.delete',
        entity: 'coupon',
        entityId: coupon.id,
        summary: `${coupon.code} kuponu silindi`,
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin coupon delete error:', error);
    return NextResponse.json({ error: 'Kupon silinemedi.' }, { status: 500 });
  }
}
