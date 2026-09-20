import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { createDraft, saveProduct, saveVariantStock } from '@/lib/admin/product-editor-service';
import { adminForbiddenResponse, adminProductErrorResponse } from '@/lib/admin/product-editor-http';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getCurrentUser();
    if (!session || session.role !== 'ADMIN') {
      return adminForbiddenResponse();
    }

    const products = await prisma.product.findMany({
      include: {
        variants: true,
        media: { orderBy: { position: 'asc' } },
        family: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(products);
  } catch (error) {
    console.error('Admin products fetch error:', error);
    return NextResponse.json({ error: 'Ürünler alınamadı.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getCurrentUser();
    if (!session || session.role !== 'ADMIN') {
      return adminForbiddenResponse();
    }

    const body = await request.json();
    const product = await createDraft(body, prisma);

    return NextResponse.json({ success: true, product });
  } catch (error) {
    return adminProductErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getCurrentUser();
    if (!session || session.role !== 'ADMIN') {
      return adminForbiddenResponse();
    }

    const { variantId, stock, price, productId } = await request.json();

    if (variantId && stock !== undefined) {
      const product = await saveVariantStock(String(variantId), Number(stock), prisma, price !== undefined ? Number(price) : undefined);
      return NextResponse.json({ success: true, product });
    }
    if (productId && price !== undefined) {
      const product = await saveProduct({ id: String(productId), price: Number(price) }, prisma);
      return NextResponse.json({ success: true, product });
    }
    return adminProductErrorResponse({ code: 'INVALID_PRODUCT' });
  } catch (error) {
    return adminProductErrorResponse(error);
  }
}
