import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, generateOrderGuestToken } from '@/lib/auth';
import { initializeIyzicoCheckout, isIyzicoSandbox } from '@/lib/payment/iyzico';
import { PUBLIC_PRODUCT_WHERE } from '@/lib/products/public-catalog';
import {
  ensureGiftCardProduct,
  generateGiftCardCode,
  GIFT_CARD_PRODUCT_ID,
  GIFT_CARD_PRODUCT_SLUG,
} from '@/lib/gift-cards/gift-card-service';
import { sendOrderConfirmationEmail, sendGiftCardDeliveryEmail } from '@/lib/email/provider';

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

    // Resolve products and variants from database to ensure valid catalog items, prices and stock
    const resolvedItems: Array<{
      productId: string;
      productName: string;
      size: string;
      quantity: number;
      price: number;
      category: string;
      isGiftCard?: boolean;
      giftCardTheme?: string;
      recipientName?: string;
      recipientEmail?: string;
      senderName?: string | null;
      giftNote?: string | null;
      deliveryDate?: string | null;
    }> = [];

    for (const item of cart) {
      const quantity = Math.max(1, Math.floor(Number(item.quantity) || 1));
      const requestedSize = typeof item.size === 'string' ? item.size.trim().toUpperCase() : '';

      const isGiftCard =
        item.id === GIFT_CARD_PRODUCT_ID ||
        item.slug === GIFT_CARD_PRODUCT_SLUG ||
        item.category === 'hediye-karti' ||
        (typeof item.slug === 'string' && item.slug.startsWith('dijital-hediye-karti'));

      if (isGiftCard) {
        await ensureGiftCardProduct(prisma);
        const cardPrice = Math.max(500, Math.floor(Number(item.price) || 0));
        const effectiveSize = requestedSize || `${cardPrice} TL`;

        // Ensure variant exists on the gift card product
        await prisma.variant.upsert({
          where: {
            productId_size: {
              productId: GIFT_CARD_PRODUCT_ID,
              size: effectiveSize,
            },
          },
          update: {},
          create: {
            productId: GIFT_CARD_PRODUCT_ID,
            size: effectiveSize,
            stock: 9999,
          },
        });

        resolvedItems.push({
          productId: GIFT_CARD_PRODUCT_ID,
          productName: item.name || 'Pandiones Dijital Hediye Kartı',
          size: effectiveSize,
          quantity,
          price: cardPrice,
          category: 'Hediye Kartı',
          isGiftCard: true,
          giftCardTheme: item.giftCardTheme || 'noir',
          recipientName: item.recipientName || 'Değerli Misafirimiz',
          recipientEmail: item.recipientEmail || customerEmail,
          senderName: item.senderName || customerName,
          giftNote: item.giftNote || null,
          deliveryDate: item.deliveryDate || 'now',
        });
        continue;
      }

      if (!requestedSize) {
        return NextResponse.json(
          { error: 'Lütfen sepetteki tüm ürünler için geçerli bir beden seçiniz.' },
          { status: 400 }
        );
      }

      const product = await prisma.product.findFirst({
        where: {
          ...PUBLIC_PRODUCT_WHERE,
          OR: [{ id: item.id || '' }, { slug: item.slug || item.id || '' }],
        },
        include: {
          variants: true,
        },
      });

      if (!product) {
        return NextResponse.json(
          { error: `"${item.name || 'Seçilen ürün'}" veritabanında bulunamadı veya satışta değil.` },
          { status: 400 }
        );
      }

      const variant = product.variants.find(
        (v) => v.size.toUpperCase() === requestedSize
      );

      if (!variant) {
        return NextResponse.json(
          { error: `"${product.name}" için "${requestedSize}" bedeni mevcut değil.` },
          { status: 400 }
        );
      }

      if (variant.stock < quantity) {
        return NextResponse.json(
          {
            error: `"${product.name} (${variant.size})" için yeterli stok bulunmamaktadır. (Mevcut stok: ${variant.stock})`,
          },
          { status: 400 }
        );
      }

      resolvedItems.push({
        productId: product.id,
        productName: product.name,
        size: variant.size,
        quantity,
        price: product.price,
        category: product.category === 'ic-giyim' ? 'İç Giyim' : 'Ev Giyim',
      });
    }

    if (resolvedItems.length === 0) {
      return NextResponse.json(
        { error: 'Sepetteki ürünler veritabanında bulunamadı.' },
        { status: 400 }
      );
    }

    let orderNumber = `PAN-${Math.floor(100000 + Math.random() * 900000)}`;
    const existingOrder = await prisma.order.findUnique({ where: { orderNumber } });
    if (existingOrder) {
      orderNumber = `PAN-${Date.now().toString().slice(-6)}`;
    }

    const rawTotal = resolvedItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    // Calculate discount strictly on server side using coupon or gift card rules from database
    let calculatedDiscount = 0;
    let validatedCouponCode: string | null = null;
    let validatedGiftCardCode: string | null = null;
    let validatedGiftCardAmount = 0;
    let validatedGiftCardId: string | null = null;

    if (couponCode && typeof couponCode === 'string' && couponCode.trim()) {
      const normalizedCode = couponCode.trim().toUpperCase();

      // 1. Check Coupon table
      const coupon = await prisma.coupon.findUnique({
        where: { code: normalizedCode },
      });

      if (coupon && coupon.isActive) {
        if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
          return NextResponse.json(
            { error: 'Bu kuponun toplam kullanım limiti tükenmiştir.' },
            { status: 400 }
          );
        }

        if (coupon.minSpend && rawTotal < coupon.minSpend) {
          const formattedMinSpend = new Intl.NumberFormat('tr-TR', {
            style: 'currency',
            currency: 'TRY',
            maximumFractionDigits: 0,
          }).format(coupon.minSpend);
          return NextResponse.json(
            { error: `Bu kupon yalnızca ${formattedMinSpend} ve üzeri siparişlerde geçerlidir.` },
            { status: 400 }
          );
        }

        if (coupon.discountType === 'PERCENTAGE') {
          calculatedDiscount = Math.round((rawTotal * coupon.discountValue) / 100);
        } else {
          calculatedDiscount = Math.min(coupon.discountValue, rawTotal);
        }

        validatedCouponCode = coupon.code;
      } else {
        // 2. Check GiftCard table
        const giftCard = await prisma.giftCard.findUnique({
          where: { code: normalizedCode },
        });

        if (giftCard) {
          if (!giftCard.isActive) {
            return NextResponse.json(
              { error: 'Bu hediye kartı kullanım dışıdır.' },
              { status: 400 }
            );
          }
          if (new Date() > giftCard.expiresAt) {
            return NextResponse.json(
              { error: 'Bu hediye kartının geçerlilik süresi dolmuştur.' },
              { status: 400 }
            );
          }
          if (giftCard.currentBalance <= 0) {
            return NextResponse.json(
              { error: 'Bu hediye kartının bakiyesi tükenmiştir.' },
              { status: 400 }
            );
          }

          calculatedDiscount = Math.min(giftCard.currentBalance, rawTotal);
          validatedGiftCardCode = giftCard.code;
          validatedGiftCardAmount = calculatedDiscount;
          validatedGiftCardId = giftCard.id;
        } else {
          return NextResponse.json(
            { error: 'Girilen kupon veya hediye kartı kodu geçersiz veya süresi dolmuş.' },
            { status: 400 }
          );
        }
      }
    }

    const finalTotal = Math.max(0, rawTotal - calculatedDiscount);
    const session = await getCurrentUser();

    // SPECIAL FLOW: 100% Covered by Gift Card / Coupon (0 TL final total)
    // No bank or Iyzico card payment required. Fulfill directly and atomically!
    if (finalTotal === 0) {
      const guestToken = generateOrderGuestToken(orderNumber);

      const orderResult = await prisma.$transaction(async (tx) => {
        const order = await tx.order.create({
          data: {
            orderNumber,
            userId: session?.userId || null,
            customerName: customerName.trim(),
            customerEmail: customerEmail.toLowerCase().trim(),
            customerPhone: customerPhone.trim(),
            shippingAddress: shippingAddress.trim(),
            shippingCity: shippingCity.trim(),
            shippingDistrict: (shippingDistrict || '').trim(),
            shippingNotes: (shippingNotes || '').trim(),
            couponCode: validatedCouponCode,
            discountAmount: calculatedDiscount,
            giftCardCode: validatedGiftCardCode,
            giftCardAmount: validatedGiftCardAmount,
            totalAmount: 0,
            status: 'ODENDI',
            paymentProvider: validatedGiftCardCode ? 'GIFT_CARD' : 'COUPON',
            paymentStatus: 'SUCCESS',
            paidAt: new Date(),
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

        // Deduct gift card balance if used
        if (validatedGiftCardId && validatedGiftCardAmount > 0) {
          await tx.giftCard.update({
            where: { id: validatedGiftCardId },
            data: { currentBalance: { decrement: validatedGiftCardAmount } },
          });
          await tx.giftCardUsage.create({
            data: {
              giftCardId: validatedGiftCardId,
              orderId: order.id,
              amount: validatedGiftCardAmount,
            },
          });
        }

        // Increment coupon usage if standard coupon used
        if (validatedCouponCode) {
          await tx.coupon.updateMany({
            where: { code: validatedCouponCode },
            data: { usedCount: { increment: 1 } },
          });
        }

        // Decrement variant stock for physical items
        for (const item of resolvedItems) {
          if (!item.isGiftCard) {
            const currentVariant = await tx.variant.findFirst({
              where: {
                productId: item.productId,
                size: item.size,
              },
            });
            if (currentVariant) {
              const newStock = Math.max(0, currentVariant.stock - item.quantity);
              await tx.variant.update({
                where: { id: currentVariant.id },
                data: { stock: newStock },
              });
            }
          }
        }

        // If purchased gift cards in cart, create and activate them immediately
        const createdGiftCards = [];
        for (const item of resolvedItems) {
          if (item.isGiftCard) {
            for (let q = 0; q < item.quantity; q++) {
              let code = generateGiftCardCode();
              let exists = await tx.giftCard.findUnique({ where: { code } });
              while (exists) {
                code = generateGiftCardCode();
                exists = await tx.giftCard.findUnique({ where: { code } });
              }

              const expiresAt = new Date();
              expiresAt.setMonth(expiresAt.getMonth() + 12);

              const gc = await tx.giftCard.create({
                data: {
                  code,
                  initialBalance: item.price,
                  currentBalance: item.price,
                  currency: 'TRY',
                  theme: item.giftCardTheme || 'noir',
                  recipientName: item.recipientName || 'Değerli Misafirimiz',
                  recipientEmail: item.recipientEmail || customerEmail,
                  senderName: item.senderName || customerName,
                  giftNote: item.giftNote || null,
                  deliveryDate: item.deliveryDate || 'now',
                  orderId: order.id,
                  isActive: true,
                  expiresAt,
                },
              });
              createdGiftCards.push(gc);
            }
          }
        }

        return { order, createdGiftCards };
      });

      // Dispatch delivery emails for created gift cards
      for (const gc of orderResult.createdGiftCards) {
        sendGiftCardDeliveryEmail({
          code: gc.code,
          initialBalance: gc.initialBalance,
          recipientName: gc.recipientName,
          recipientEmail: gc.recipientEmail,
          senderName: gc.senderName || undefined,
          giftNote: gc.giftNote || undefined,
          theme: gc.theme,
          expiresAt: gc.expiresAt,
        }).catch((err) => console.warn(`Gift card delivery email failed (${gc.code}):`, err));
      }

      // Dispatch order confirmation email
      sendOrderConfirmationEmail({
        orderNumber: orderResult.order.orderNumber,
        customerName: orderResult.order.customerName,
        customerEmail: orderResult.order.customerEmail,
        shippingAddress: orderResult.order.shippingAddress,
        shippingCity: orderResult.order.shippingCity,
        shippingDistrict: orderResult.order.shippingDistrict,
        items: resolvedItems.map((item) => ({
          productName: item.productName,
          size: item.size,
          quantity: item.quantity,
          price: item.price,
        })),
        totalAmount: 0,
        discountAmount: calculatedDiscount,
        couponCode: validatedCouponCode || validatedGiftCardCode,
        paidAt: new Date(),
      }).catch((err) => console.warn(`Order confirmation email failed (${orderNumber}):`, err));

      return NextResponse.json({
        success: true,
        orderNumber: orderResult.order.orderNumber,
        orderId: orderResult.order.id,
        guestToken,
        directComplete: true,
      });
    }

    const conversationId = `conv_${orderNumber}_${Date.now()}`;

    // Create Order in pending state
    const order = await prisma.order.create({
      data: {
        orderNumber,
        userId: session?.userId || null,
        customerName: customerName.trim(),
        customerEmail: customerEmail.toLowerCase().trim(),
        customerPhone: customerPhone.trim(),
        shippingAddress: shippingAddress.trim(),
        shippingCity: shippingCity.trim(),
        shippingDistrict: (shippingDistrict || '').trim(),
        shippingNotes: (shippingNotes || '').trim(),
        couponCode: validatedCouponCode,
        discountAmount: calculatedDiscount,
        giftCardCode: validatedGiftCardCode,
        giftCardAmount: validatedGiftCardAmount,
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

    // If there are gift cards purchased in cart, pre-create them with isActive: false
    for (const item of resolvedItems) {
      if (item.isGiftCard) {
        for (let q = 0; q < item.quantity; q++) {
          let code = generateGiftCardCode();
          let exists = await prisma.giftCard.findUnique({ where: { code } });
          while (exists) {
            code = generateGiftCardCode();
            exists = await prisma.giftCard.findUnique({ where: { code } });
          }
          const expiresAt = new Date();
          expiresAt.setMonth(expiresAt.getMonth() + 12);

          await prisma.giftCard.create({
            data: {
              code,
              initialBalance: item.price,
              currentBalance: item.price,
              currency: 'TRY',
              theme: item.giftCardTheme || 'noir',
              recipientName: item.recipientName || 'Değerli Misafirimiz',
              recipientEmail: item.recipientEmail || customerEmail,
              senderName: item.senderName || customerName,
              giftNote: item.giftNote || null,
              deliveryDate: item.deliveryDate || 'now',
              orderId: order.id,
              isActive: false, // Activated upon payment callback!
              expiresAt,
            },
          });
        }
      }
    }

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

    const guestToken = generateOrderGuestToken(order.orderNumber);

    return NextResponse.json({
      success: true,
      orderNumber: order.orderNumber,
      orderId: order.id,
      guestToken,
      paymentToken: paymentResult.token,
      checkoutFormContent: paymentResult.checkoutFormContent,
      paymentPageUrl: paymentResult.paymentPageUrl,
      isMock: paymentResult.isMock,
      isTestMode: paymentResult.isMock || isIyzicoSandbox(),
    });
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: 'Sipariş işlenirken bir hata oluştu.' },
      { status: 500 }
    );
  }
}
