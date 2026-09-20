import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { publicFindBySlug } from '@/lib/products/public-catalog';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const product = await publicFindBySlug(id, prisma.product);

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error('Error fetching product detail:', error);
    return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 });
  }
}
