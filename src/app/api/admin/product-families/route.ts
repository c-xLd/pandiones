import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { createFamily, setFamily } from '@/lib/admin/product-editor-service';
import { adminForbiddenResponse, adminProductErrorResponse } from '@/lib/admin/product-editor-http';
import { can } from '@/lib/security/roles';
import { toTlJson } from '@/lib/money-json';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getCurrentUser();
    if (!session || !can(session.role, 'catalog')) return adminForbiddenResponse();
    const families = await prisma.productFamily.findMany({ include: { products: { select: { id: true, name: true, color: true, category: true, status: true } } }, orderBy: { createdAt: 'desc' } });
    return NextResponse.json({ success: true, families });
  } catch (error) { return adminProductErrorResponse(error); }
}

export async function POST(request: Request) {
  try {
    const session = await getCurrentUser();
    if (!session || !can(session.role, 'catalog')) return adminForbiddenResponse();
    const body = await request.json();
    const family = await createFamily(body.name, prisma);
    return NextResponse.json({ success: true, family }, { status: 201 });
  } catch (error) { return adminProductErrorResponse(error); }
}

export async function PATCH(request: Request) {
  try {
    const session = await getCurrentUser();
    if (!session || !can(session.role, 'catalog')) return adminForbiddenResponse();
    const body = await request.json();
    const product = await setFamily({ productId: String(body.productId), familyId: body.familyId ? String(body.familyId) : null }, prisma);
    return NextResponse.json({ success: true, product: toTlJson(product) });
  } catch (error) { return adminProductErrorResponse(error); }
}
