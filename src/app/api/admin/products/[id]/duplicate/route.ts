import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { duplicateProduct } from '@/lib/admin/product-catalog';
import { adminForbiddenResponse, adminProductErrorResponse } from '@/lib/admin/product-editor-http';

export const dynamic = 'force-dynamic';

/** Copies a product as a new draft (stock 0, no media). */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getCurrentUser(request);
    if (!session || session.role !== 'ADMIN') return adminForbiddenResponse();
    const { id } = await params;
    const product = await duplicateProduct(prisma, session, id);
    return NextResponse.json({ success: true, product });
  } catch (error) {
    return adminProductErrorResponse(error);
  }
}
