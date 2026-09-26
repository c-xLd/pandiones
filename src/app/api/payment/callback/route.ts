import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { retrieveIyzicoPayment } from '@/lib/payment/iyzico';
import { generateOrderGuestToken } from '@/lib/auth';
import { sendOrderConfirmationEmail, sendGiftCardDeliveryEmail } from '@/lib/email/provider';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const reqUrl = new URL(request.url);
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || `${reqUrl.protocol}//${reqUrl.host}`;

  try {
    let token = '';
    let conversationId = '';

    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      token = (formData.get('token') as string) || '';
      conversationId = (formData.get('conversationId') as string) || '';
    } else {
      const text = await request.text();
      const params = new URLSearchParams(text);
      token = params.get('token') || '';
      conversationId = params.get('conversationId') || '';
    }

    if (!token) {
      console.error('iyzico callback received without token');
      return NextResponse.redirect(`${baseUrl}/odeme?error=token_eksik`, { status: 303 });
    }

    // Retrieve payment transaction
    const transaction = await prisma.paymentTransaction.findFirst({
      where: { token },
      include: {
        order: {
          include: {
            items: true,
          },
        },
      },
    });

    if (!transaction || !transaction.order) {
      console.error(`Transaction not found for token: ${token}`);
      return NextResponse.redirect(`${baseUrl}/odeme?error=siparis_bulunamadi`, { status: 303 });
    }

    const order = transaction.order;

    // Idempotency: If the order has already been marked as ODENDI or transaction SUCCESS,
    // do NOT deduct stock or increment coupon usage again!
    if (order.status === 'ODENDI' || transaction.status === 'SUCCESS') {
      const guestToken = generateOrderGuestToken(order.orderNumber);
      return NextResponse.redirect(`${baseUrl}/siparis-onay/${order.orderNumber}?token=${guestToken}`, { status: 303 });
    }

    // Verify payment with iyzico
    const verifyResult = await retrieveIyzicoPayment(token, conversationId || transaction.conversationId);

    if (verifyResult.status === 'success' && verifyResult.paymentStatus === 'SUCCESS') {
      // Complete order transaction atomically
      const { activatedGiftCards } = await prisma.$transaction(async (tx) => {
        // Re-check order status inside transaction to handle concurrent webhook deliveries
        const freshOrder = await tx.order.findUnique({
          where: { id: order.id },
        });

        if (freshOrder?.status === 'ODENDI') {
          return { activatedGiftCards: [] };
        }

        // 1. Update PaymentTransaction
        await tx.paymentTransaction.update({
          where: { id: transaction.id },
          data: {
            status: 'SUCCESS',
            paymentId: verifyResult.paymentId || null,
            installment: verifyResult.installment || 1,
            cardType: verifyResult.cardType || null,
            cardAssociation: verifyResult.cardAssociation || null,
            cardFamily: verifyResult.cardFamily || null,
            binNumber: verifyResult.binNumber || null,
            lastFourDigits: verifyResult.lastFourDigits || null,
            rawResponse: verifyResult.rawResponse || null,
          },
        });

        // 2. Update Order
        await tx.order.update({
          where: { id: order.id },
          data: {
            status: 'ODENDI',
            paymentStatus: 'SUCCESS',
            paymentId: verifyResult.paymentId || null,
            paidAt: new Date(),
          },
        });

        // 3. Increment coupon usage
        if (order.couponCode) {
          try {
            await tx.coupon.updateMany({
              where: { code: order.couponCode },
              data: { usedCount: { increment: 1 } },
            });
          } catch {
            // ignore coupon update failure
          }
        }

        // 3b. Deduct gift card balance if used
        if (order.giftCardCode && order.giftCardAmount && order.giftCardAmount > 0) {
          try {
            const usedGiftCard = await tx.giftCard.findUnique({
              where: { code: order.giftCardCode },
            });
            if (usedGiftCard) {
              const deduct = Math.min(usedGiftCard.currentBalance, order.giftCardAmount);
              await tx.giftCard.update({
                where: { id: usedGiftCard.id },
                data: { currentBalance: { decrement: deduct } },
              });
              await tx.giftCardUsage.create({
                data: {
                  giftCardId: usedGiftCard.id,
                  orderId: order.id,
                  amount: deduct,
                },
              });
            }
          } catch (gcErr) {
            console.warn('Gift card balance deduction error in payment callback:', gcErr);
          }
        }

        // 4. Decrement variant stock with strict lower-bound check (never below 0)
        for (const item of order.items) {
          try {
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
                data: {
                  stock: newStock,
                },
              });
            }
          } catch (err) {
            console.warn('Could not decrement variant stock:', err);
          }
        }

        // 5. Activate any purchased gift cards in this order
        const pendingGiftCards = await tx.giftCard.findMany({
          where: { orderId: order.id, isActive: false },
        });

        if (pendingGiftCards.length > 0) {
          await tx.giftCard.updateMany({
            where: { orderId: order.id, isActive: false },
            data: { isActive: true },
          });
        }

        return { activatedGiftCards: pendingGiftCards };
      });

      // Dispatch gift card delivery emails asynchronously
      for (const card of activatedGiftCards) {
        sendGiftCardDeliveryEmail({
          code: card.code,
          initialBalance: card.initialBalance,
          recipientName: card.recipientName,
          recipientEmail: card.recipientEmail,
          senderName: card.senderName || undefined,
          giftNote: card.giftNote || undefined,
          theme: card.theme,
          expiresAt: card.expiresAt,
        }).catch((err) => {
          console.warn(`[GIFT_CARD_DELIVERY_EMAIL_FAILED] Code ${card.code}:`, err);
        });
      }

      // Safely dispatch order confirmation email asynchronously
      sendOrderConfirmationEmail({
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        shippingAddress: order.shippingAddress,
        shippingCity: order.shippingCity,
        shippingDistrict: order.shippingDistrict,
        items: order.items.map((item) => ({
          productName: item.productName,
          size: item.size,
          quantity: item.quantity,
          price: item.price,
        })),
        totalAmount: order.totalAmount,
        discountAmount: order.discountAmount,
        couponCode: order.couponCode,
        paidAt: new Date(),
      }).catch((err) => {
        console.warn(`[ORDER_CONFIRMATION_EMAIL_FAILED] Order ${order.orderNumber}:`, err);
      });

      const guestToken = generateOrderGuestToken(order.orderNumber);
      return NextResponse.redirect(`${baseUrl}/siparis-onay/${order.orderNumber}?token=${guestToken}`, { status: 303 });
    } else {
      // Payment Failed or Rejected
      const errorMsg = verifyResult.errorMessage || 'Ödeme banka tarafından onaylanmadı.';

      await prisma.$transaction(async (tx) => {
        await tx.paymentTransaction.update({
          where: { id: transaction.id },
          data: {
            status: 'FAILURE',
            errorMessage: errorMsg,
            rawResponse: verifyResult.rawResponse || null,
          },
        });

        await tx.order.update({
          where: { id: order.id },
          data: {
            status: 'ODEME_BASARISIZ',
            paymentStatus: 'FAILURE',
          },
        });
      });

      const redirectUrl = `${baseUrl}/odeme?error=${encodeURIComponent(errorMsg)}`;
      return NextResponse.redirect(redirectUrl, { status: 303 });
    }
  } catch (error: any) {
    console.error('Payment callback processing error:', error);
    return NextResponse.redirect(
      `${baseUrl}/odeme?error=${encodeURIComponent('Ödeme sonucu işlenirken bir hata oluştu.')}`,
      { status: 303 }
    );
  }
}
