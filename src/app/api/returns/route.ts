import { NextResponse } from 'next/server';
import { enforce } from '@/lib/security/rate-limit';
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
      select: {
        id: true,
        status: true,
        reason: true,
        createdAt: true,
        order: {
          select: {
            id: true,
            orderNumber: true,
            createdAt: true,
            items: { select: { id: true, productName: true, size: true, quantity: true, price: true } },
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
  const limited = await enforce(request, 'returns');
  if (limited) return limited;
  try {
    const body = await request.json().catch(() => ({}));
    const orderId = typeof body?.orderId === 'string' ? body.orderId.slice(0, 64) : '';
    const customerEmail = typeof body?.customerEmail === 'string' ? body.customerEmail : '';
    const reason = typeof body?.reason === 'string' ? body.reason : '';

    if (!orderId || !reason.trim()) {
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

    if (reason.trim().length > 1000) {
      return NextResponse.json({ error: 'İade gerekçesi en fazla 1000 karakter olabilir.' }, { status: 400 });
    }

    // Who may ask: an order tied to an account only by that account (or an admin); a guest order by
    // whoever knows its (random, 10-character) number and the e-mail it was placed with. Every refusal
    // gives the same answer as a missing order, so order numbers cannot be probed.
    const session = await getCurrentUser(request);
    const emailMatches = Boolean(order && customerEmail && order.customerEmail.toLowerCase() === customerEmail.trim().toLowerCase());
    const allowed =
      order &&
      (session?.role === 'ADMIN' ||
        (order.userId ? session?.userId === order.userId : emailMatches || (session && session.email.toLowerCase() === order.customerEmail.toLowerCase())));
    if (!order || !allowed) {
      return NextResponse.json({ error: 'Sipariş bulunamadı ya da bilgiler eşleşmiyor.' }, { status: 404 });
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
