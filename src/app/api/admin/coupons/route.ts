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
    const session = await getCurrentUser();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 403 });
    }

    const body = await request.json();
    const { code, discountType, discountValue, minSpend, maxUses } = body;

    if (!code || !discountValue) {
      return NextResponse.json({ error: 'Kupon kodu ve indirim değeri zorunludur.' }, { status: 400 });
    }

    const created = await prisma.coupon.create({
      data: {
        code: code.toUpperCase().trim(),
        discountType: discountType || 'PERCENTAGE',
        discountValue: parseFloat(discountValue),
        minSpend: minSpend ? parseFloat(minSpend) : 0,
        maxUses: maxUses ? parseInt(maxUses) : 100,
        isActive: true,
      },
    });

    return NextResponse.json({ success: true, coupon: created });
  } catch (error) {
    console.error('Admin coupon create error:', error);
    return NextResponse.json({ error: 'Kupon oluşturulamadı.' }, { status: 500 });
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
      return NextResponse.json({ error: 'Kupon ID gerekli.' }, { status: 400 });
    }

    await prisma.coupon.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin coupon delete error:', error);
    return NextResponse.json({ error: 'Kupon silinemedi.' }, { status: 500 });
  }
}
