import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { publicList } from '@/lib/products/public-catalog';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawCategory = searchParams.get('kategori') || searchParams.get('category');
    const q = searchParams.get('q');

    const where: Record<string, any> = {};

    if (rawCategory && rawCategory !== 'all' && rawCategory !== 'tumu') {
      let category = rawCategory;
      if (rawCategory === 'lingerie') category = 'ic-giyim';
      if (rawCategory === 'sleep') category = 'ev-giyim';
      where.category = category;
    }

    if (q) {
      where.OR = [
        { name: { contains: q } },
        { color: { contains: q } },
        { description: { contains: q } },
      ];
    }

    const products = await publicList(prisma.product, where);

    return NextResponse.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}
