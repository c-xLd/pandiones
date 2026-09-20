import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { initializeIyzicoCheckout } from '@/lib/payment/iyzico';
import { PUBLIC_PRODUCT_WHERE } from '@/lib/products/public-catalog';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      customerName,
      customerEmail,
      customerPhone,
      shippingAddress,
      shippingCity,
      shippingDistrict,
      shippingNotes,
      couponCode,
      discountAmount,
      cart,
    } = body;

    if (
      !customerName ||
      !customerEmail ||
      !customerPhone ||
      !shippingAddress ||
      !shippingCity ||
      !cart ||
      !cart.length
    ) {
      return NextResponse.json(
        { error: 'Lütfen tüm zorunlu alanları doldurunuz.' },
        { status: 400 }
      );
    }

    // Resolve products from database to ensure valid foreign keys
    const resolvedItems: Array<{
      productId: string;
      productName: string;
      size: string;
      quantity: number;
      price: number;
      category: string;
    }> = [];

    for (const item of cart) {
      const product = await prisma.product.findFirst({
        where: {
          ...PUBLIC_PRODUCT_WHERE,
          OR: [{ id: item.id || '' }, { slug: item.slug || item.id || '' }],
        },
      });

      if (product) {
        resolvedItems.push({
          productId: product.id,
          productName: product.name,
          size: item.size,
          quantity: Number(item.quantity) || 1,
          price: product.price,
          category: product.category === 'ic-giyim' ? 'İç Giyim' : 'Ev Giyim',
        });
      }
    }

    if (resolvedItems.length === 0) {
      return NextResponse.json(
        { error: 'Sepetteki ürünler veritabanında bulunamadı.' },
        { status: 400 }
      );
    }

    const orderNumber = `PAN-${Math.floor(100000 + Math.random() * 900000)}`;

    const rawTotal = resolvedItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    const discount = Number(discountAmount) || 0;
    const finalTotal = Math.max(0, rawTotal - discount);

    const session = await getCurrentUser();
    const conversationId = `conv_${orderNumber}_${Date.now()}`;

    // Create Order in pending state
    const order = await prisma.order.create({
      data: {
        orderNumber,
        userId: session?.userId || null,
        customerName,
        customerEmail: customerEmail.toLowerCase().trim(),
        customerPhone,
        shippingAddress,
        shippingCity,
        shippingDistrict: shippingDistrict || '',
        shippingNotes: shippingNotes || '',
        couponCode: couponCode || null,
        discountAmount: discount,
        totalAmount: finalTotal,
        status: 'ODEME_BEKLENIYOR',
        paymentProvider: 'IYZICO',
        paymentStatus: 'PENDING',
        items: {
          create: resolvedItems.map((it) => ({
            productId: it.productId,
            productName: it.productName,
            size: it.size,
            quantity: it.quantity,
            price: it.price,
          })),
        },
      },
    });

    // Determine site base URL for 3DS callback
    const reqUrl = new URL(request.url);
    const origin = process.env.NEXT_PUBLIC_SITE_URL || `${reqUrl.protocol}//${reqUrl.host}`;
    const callbackUrl = `${origin}/api/payment/callback`;

    // Separate first and last name
    const nameParts = customerName.trim().split(' ');
    const firstName = nameParts[0] || 'Değerli';
    const lastName = nameParts.slice(1).join(' ') || 'Müşterimiz';

    // Initialize iyzico checkout form
    const paymentResult = await initializeIyzicoCheckout({
      conversationId,
      basketId: order.id,
      price: rawTotal,
      paidPrice: finalTotal,
      callbackUrl,
      buyer: {
        id: session?.userId || `guest_${order.id}`,
        name: firstName,
        surname: lastName,
        email: customerEmail.toLowerCase().trim(),
        phone: customerPhone.replace(/\D/g, '').slice(-10),
        address: shippingAddress,
        city: shippingCity,
        district: shippingDistrict || shippingCity,
      },
      shippingAddress: {
        contactName: customerName,
        city: shippingCity,
        country: 'Turkey',
        address: shippingAddress,
      },
      billingAddress: {
        contactName: customerName,
        city: shippingCity,
        country: 'Turkey',
        address: shippingAddress,
      },
      basketItems: resolvedItems.map((item, idx) => ({
        id: `${item.productId}_${item.size}_${idx}`,
        name: `${item.productName} (${item.size})`,
        category1: item.category,
        price: item.price * item.quantity,
      })),
    });

    if (paymentResult.status !== 'success') {
      // Mark as failed if initialization could not proceed
      await prisma.order.update({
        where: { id: order.id },
        data: { status: 'ODEME_BASARISIZ', paymentStatus: 'FAILURE' },
      });

      return NextResponse.json(
        { error: paymentResult.errorMessage || 'Ödeme oturumu başlatılamadı.' },
        { status: 400 }
      );
    }

    // Save transaction record
    await prisma.paymentTransaction.create({
      data: {
        orderId: order.id,
        provider: 'IYZICO',
        conversationId,
        token: paymentResult.token || null,
        status: 'PENDING',
        amount: finalTotal,
        currency: 'TRY',
      },
    });

    return NextResponse.json({
      success: true,
      orderNumber: order.orderNumber,
      orderId: order.id,
      paymentToken: paymentResult.token,
      checkoutFormContent: paymentResult.checkoutFormContent,
      paymentPageUrl: paymentResult.paymentPageUrl,
      isMock: paymentResult.isMock,
    });
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: 'Sipariş işlenirken bir hata oluştu.' },
      { status: 500 }
    );
  }
}
