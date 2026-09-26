import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json(
        { error: 'İade taleplerini görüntülemek için giriş yapmalısınız.' },
        { status: 401 }
      );
    }

    const returns = await prisma.returnRequest.findMany({
      where: {
        order: {
          userId: session.userId,
        },
      },
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

    return NextResponse.json({ returns });
  } catch (error) {
    console.error('Error fetching user returns:', error);
    return NextResponse.json(
      { error: 'İade talepleri alınırken bir hata oluştu.' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { orderId, customerEmail, reason } = body;

    if (!orderId || !reason || !reason.trim()) {
      return NextResponse.json(
        { error: 'Lütfen sipariş bilgisi ve iade gerekçesini eksiksiz doldurunuz.' },
        { status: 400 }
      );
    }

    // Resolve order by either CUID id or orderNumber
    const order = await prisma.order.findFirst({
      where: {
        OR: [{ id: String(orderId) }, { orderNumber: String(orderId) }],
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Belirtilen sipariş bulunamadı.' },
        { status: 404 }
      );
    }

    // Authorization check
    const session = await getCurrentUser();
    if (session) {
      if (order.userId && order.userId !== session.userId && session.role !== 'ADMIN') {
        return NextResponse.json(
          { error: 'Bu siparişe iade talebi oluşturma yetkiniz bulunmamaktadır.' },
          { status: 403 }
        );
      }
    } else {
      if (!customerEmail || order.customerEmail.toLowerCase() !== String(customerEmail).trim().toLowerCase()) {
        return NextResponse.json(
          { error: 'Girilen e-posta adresi bu siparişle uyuşmuyor.' },
          { status: 403 }
        );
      }
    }

    // Order status check: only completed orders are returnable
    const eligibleStatuses = ['ODENDI', 'HAZIRLANIYOR', 'KARGODA', 'TESLIM_EDILDI'];
    if (!eligibleStatuses.includes(order.status)) {
      return NextResponse.json(
        { error: 'Ödemesi tamamlanmamış siparişler için iade talebi oluşturulamaz.' },
        { status: 400 }
      );
    }

    // Check for existing pending return request
    const existingPending = await prisma.returnRequest.findFirst({
      where: {
        orderId: order.id,
        status: 'BEKLIYOR',
      },
    });

    if (existingPending) {
      return NextResponse.json(
        { error: 'Bu sipariş için halen incelenmekte olan aktif bir iade talebiniz bulunmaktadır.' },
        { status: 409 }
      );
    }

    const returnReq = await prisma.returnRequest.create({
      data: {
        orderId: order.id,
        customerEmail: order.customerEmail,
        reason: reason.trim(),
        status: 'BEKLIYOR',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'İade talebiniz başarıyla alındı. İnceleme sonrası e-posta ile dönüş yapılacaktır.',
      returnRequest: returnReq,
    });
  } catch (error) {
    console.error('Error creating return request:', error);
    return NextResponse.json(
      { error: 'İade talebi oluşturulurken bir hata meydana geldi.' },
      { status: 500 }
    );
  }
}
