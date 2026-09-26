import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const orderNumber = (body.orderNumber || '').trim().toUpperCase();
    const email = (body.email || '').trim().toLowerCase();

    if (!orderNumber || !email) {
      return NextResponse.json(
        { error: 'Lütfen sipariş numarası ve e-posta adresinizi giriniz.' },
        { status: 400 }
      );
    }

    const order = await prisma.order.findFirst({
      where: {
        orderNumber,
        customerEmail: {
          equals: email,
        },
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                image: true,
                color: true,
                category: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Belirtilen sipariş numarası ve e-posta ile eşleşen bir sipariş bulunamadı.' },
        { status: 404 }
      );
    }

    // Masked and secure customer view
    const safeOrder = {
      orderNumber: order.orderNumber,
      createdAt: order.createdAt,
      status: order.status,
      totalAmount: order.totalAmount,
      shippingCity: order.shippingCity,
      shippingDistrict: order.shippingDistrict,
      shippingAddressMasked: order.shippingAddress.length > 10
        ? `${order.shippingAddress.slice(0, 8)}...`
        : order.shippingAddress,
      trackingCompany: order.trackingCompany,
      trackingCode: order.trackingCode,
      items: order.items.map((item) => ({
        id: item.id,
        productName: item.product?.name || 'Ürün',
        productSlug: item.product?.slug || '',
        productImage: item.product?.image || '',
        category: item.product?.category || 'ic-giyim',
        color: item.product?.color || '',
        size: item.size,
        quantity: item.quantity,
        price: item.price,
      })),
    };

    return NextResponse.json({ success: true, order: safeOrder });
  } catch (error) {
    console.error('Order tracking lookup error:', error);
    return NextResponse.json(
      { error: 'Sipariş sorgulanırken bir hata oluştu. Lütfen tekrar deneyin.' },
      { status: 500 }
    );
  }
}
