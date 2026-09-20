import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { publishProduct } from '@/lib/admin/product-editor-service';
import { adminForbiddenResponse, adminProductErrorResponse } from '@/lib/admin/product-editor-http';

export const dynamic = 'force-dynamic';

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getCurrentUser();
    if (!session || session.role !== 'ADMIN') return adminForbiddenResponse();
    const { id } = await params;
    const product = await publishProduct(id, prisma);
    return NextResponse.json({ success: true, product });
  } catch (error) { return adminProductErrorResponse(error); }
}
