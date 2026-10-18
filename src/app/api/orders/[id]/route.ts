import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, hasGuestOrderAccess } from '@/lib/auth';
import { can } from '@/lib/security/roles';

export const dynamic = 'force-dynamic';

/** What the buyer may see of their own order. No internal notes, payment ids or idempotency keys. */
const BUYER_ORDER_SELECT = {
  id: true,
  orderNumber: true,
  userId: true,
  status: true,
  paymentStatus: true,
  totalAmount: true,
  discountAmount: true,
  giftCardAmount: true,
  couponCode: true,
  createdAt: true,
  paidAt: true,
  trackingCompany: true,
  trackingCode: true,
  customerName: true,
  customerEmail: true,
  customerPhone: true,
  shippingAddress: true,
  shippingCity: true,
  shippingDistrict: true,
  shippingNotes: true,
  items: { select: { id: true, productId: true, productName: true, size: true, quantity: true, price: true } },
} as const;

/**
 * One order for its owner (signed in), an admin, or the guest who just placed it (24-hour HttpOnly
 * cookie set at checkout). Unknown and forbidden answer the same 404, so order numbers cannot be probed.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!id || id.length > 64) return NextResponse.json({ error: 'Sipariş bulunamadı.' }, { status: 404 });

    const order = await prisma.order.findFirst({ where: { OR: [{ id }, { orderNumber: id }] }, select: BUYER_ORDER_SELECT });
    const session = await getCurrentUser(request);
    const allowed =
      order &&
      (can(session?.role, 'orders') ||
        (session?.userId && order.userId === session.userId) ||
        (await hasGuestOrderAccess(order.orderNumber, request)));
    if (!order || !allowed) return NextResponse.json({ error: 'Sipariş bulunamadı.' }, { status: 404 });

    const { userId: _owner, ...visible } = order;
    return NextResponse.json(visible, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Error fetching order:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Sipariş bilgileri alınırken bir hata oluştu.' }, { status: 500 });
  }
}
