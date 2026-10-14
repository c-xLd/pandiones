import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const PER_TYPE = 5;

/** Command-palette search: orders, products and customers matching `?q=` (min. 2 characters). */
export async function GET(request: Request) {
  const session = await getCurrentUser(request);
  if (!session || session.role !== 'ADMIN') return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 403 });

  const q = (new URL(request.url).searchParams.get('q') ?? '').trim().slice(0, 80);
  if (q.length < 2) return NextResponse.json({ orders: [], products: [], customers: [] });

  try {
    const [orders, products, customers] = await Promise.all([
      prisma.order.findMany({
        where: { OR: [{ orderNumber: { contains: q, mode: 'insensitive' } }, { customerEmail: { contains: q, mode: 'insensitive' } }, { customerName: { contains: q, mode: 'insensitive' } }, { trackingCode: { contains: q, mode: 'insensitive' } }] },
        select: { id: true, orderNumber: true, customerName: true, totalAmount: true, status: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: PER_TYPE,
      }),
      prisma.product.findMany({
        where: {
          category: { not: 'hediye-karti' },
          OR: [{ name: { contains: q, mode: 'insensitive' } }, { slug: { contains: q, mode: 'insensitive' } }, { color: { contains: q, mode: 'insensitive' } }],
        },
        select: { id: true, name: true, slug: true, image: true, status: true, price: true },
        orderBy: { createdAt: 'desc' },
        take: PER_TYPE,
      }),
      prisma.user.findMany({
        where: { role: 'CUSTOMER', OR: [{ name: { contains: q, mode: 'insensitive' } }, { email: { contains: q, mode: 'insensitive' } }, { phone: { contains: q, mode: 'insensitive' } }] },
        select: { id: true, name: true, email: true },
        orderBy: { createdAt: 'desc' },
        take: PER_TYPE,
      }),
    ]);
    return NextResponse.json({
      orders: orders.map((o) => ({ ...o, createdAt: o.createdAt.toISOString() })),
      products,
      customers,
    });
  } catch (error) {
    console.error('Admin search error:', error);
    return NextResponse.json({ error: 'Arama yapılamadı.' }, { status: 500 });
  }
}
