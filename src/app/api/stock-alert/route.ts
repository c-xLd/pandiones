import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { productId, size, email } = body;

    if (!productId || !size || !email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Lütfen geçerli bir e-posta adresi ve beden seçiniz.' },
        { status: 400 }
      );
    }

    const alert = await prisma.stockAlert.create({
      data: {
        productId,
        size,
        email: email.trim().toLowerCase(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Stok talebiniz kayıtlarımıza alındı. Beden güncellendiğinde talebiniz işleme alınacaktır.',
      alert,
    });
  } catch (error) {
    console.error('Stock alert creation error:', error);
    return NextResponse.json(
      { error: 'Bildirim kaydedilirken bir hata oluştu.' },
      { status: 500 }
    );
  }
}
