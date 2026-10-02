import { NextResponse } from 'next/server';
import { enforce } from '@/lib/security/rate-limit';
import { prisma } from '@/lib/prisma';
import { PUBLIC_PRODUCT_WHERE } from '@/lib/products/public-catalog';
import { validateStockAlertInput } from '@/lib/products/stock-alert';

export const dynamic = 'force-dynamic';

/** Records a "notify me when this size is back" request for a published product's sold-out size.
 *  The email is sent by dispatchStockAlerts when the size is restocked. A repeat request for the same
 *  product, size and email is accepted without creating a second record. */
export async function POST(request: Request) {
  const limited = await enforce(request, 'stockAlert');
  if (limited) return limited;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Geçersiz istek.' }, { status: 400 });
  }

  const input = validateStockAlertInput(body);
  if (!input.ok) return NextResponse.json({ error: input.error }, { status: 400 });
  const { productId, size, email } = input.value;

  try {
    const product = await prisma.product.findFirst({
      where: { ...PUBLIC_PRODUCT_WHERE, id: productId },
      select: { id: true, variants: { select: { size: true, stock: true } } },
    });
    if (!product) return NextResponse.json({ error: 'Ürün bulunamadı.' }, { status: 404 });

    const variant = product.variants.find((v) => v.size === size);
    if (!variant) return NextResponse.json({ error: 'Bu ürün için böyle bir beden yok.' }, { status: 400 });
    if (variant.stock > 0) {
      return NextResponse.json({ error: `${size} bedeni şu anda stokta; doğrudan çantana ekleyebilirsin.` }, { status: 409 });
    }

    const existing = await prisma.stockAlert.findFirst({
      where: { productId, size, email, isNotified: false },
      select: { id: true },
    });
    if (!existing) {
      await prisma.stockAlert.create({ data: { productId, size, email } });
    }

    return NextResponse.json({
      success: true,
      message: `Talebin kaydedildi. ${size} bedeni stoğa girdiğinde ${email} adresine e-posta göndereceğiz.`,
    });
  } catch (error) {
    console.error('[STOCK_ALERT_CREATE_FAILED]', error);
    return NextResponse.json({ error: 'Talebin kaydedilemedi. Lütfen tekrar dene.' }, { status: 500 });
  }
}
