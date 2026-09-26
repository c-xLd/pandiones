import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ user: null });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
        orders: {
          orderBy: { createdAt: 'desc' },
          include: {
            items: {
              include: {
                product: {
                  select: {
                    slug: true,
                    image: true,
                    name: true,
                    color: true,
                  },
                },
              },
            },
            returns: true,
          },
        },
        wishlists: {
          orderBy: { createdAt: 'desc' },
          include: {
            product: {
              include: {
                variants: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ user: null });
    }

    const newsletter = await prisma.newsletter.findUnique({
      where: { email: user.email.toLowerCase().trim() },
    });

    return NextResponse.json({
      user: {
        ...user,
        isSubscribedNewsletter: Boolean(newsletter),
      },
    });
  } catch (error) {
    console.error('Error in /api/auth/me:', error);
    return NextResponse.json(
      { error: 'Kullanıcı bilgisi alınamadı.' },
      { status: 500 }
    );
  }
}
