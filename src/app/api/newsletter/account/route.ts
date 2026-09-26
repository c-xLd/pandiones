import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, generateNewsletterUnsubscribeToken } from '@/lib/auth';
import { sendNewsletterWelcomeEmail } from '@/lib/email/provider';

export const dynamic = 'force-dynamic';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://pandiones.com';

export async function GET(request: Request) {
  try {
    const session = await getCurrentUser(request);
    if (!session) {
      return NextResponse.json(
        { error: 'Bülten tercihlerini görmek için giriş yapmalısınız.' },
        { status: 401 }
      );
    }

    const cleanEmail = session.email.toLowerCase().trim();
    const subscription = await prisma.newsletter.findUnique({
      where: { email: cleanEmail },
    });

    return NextResponse.json({
      subscribed: Boolean(subscription),
      subscribedAt: subscription?.subscribedAt || null,
    });
  } catch (error) {
    console.error('Error fetching newsletter status:', error);
    return NextResponse.json(
      { error: 'Bülten tercihi alınamadı.' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getCurrentUser(request);
    if (!session) {
      return NextResponse.json(
        { error: 'Bülten tercihlerini güncellemek için giriş yapmalısınız.' },
        { status: 401 }
      );
    }

    const cleanEmail = session.email.toLowerCase().trim();
    const body = await request.json().catch(() => ({}));
    const shouldSubscribe = typeof body.subscribe === 'boolean'
      ? body.subscribe
      : undefined;

    const existing = await prisma.newsletter.findUnique({
      where: { email: cleanEmail },
    });

    // If explicit boolean not sent, toggle
    const targetState = shouldSubscribe !== undefined ? shouldSubscribe : !existing;

    if (targetState) {
      if (!existing) {
        await prisma.newsletter.create({
          data: { email: cleanEmail },
        });

        // Trigger welcome email safely
        const token = generateNewsletterUnsubscribeToken(cleanEmail);
        const unsubscribeUrl = `${SITE_URL}/api/newsletter/unsubscribe?email=${encodeURIComponent(cleanEmail)}&token=${encodeURIComponent(token)}`;
        await sendNewsletterWelcomeEmail({
          recipientEmail: cleanEmail,
          unsubscribeUrl,
        }).catch((err) => console.error('Safe welcome email send error:', err));
      }

      return NextResponse.json({
        success: true,
        subscribed: true,
        message: 'Pandiones bültenine başarıyla abone oldunuz.',
      });
    } else {
      if (existing) {
        await prisma.newsletter.delete({
          where: { email: cleanEmail },
        });
      }

      return NextResponse.json({
        success: true,
        subscribed: false,
        message: 'Bülten aboneliğiniz sonlandırıldı.',
      });
    }
  } catch (error) {
    console.error('Error toggling newsletter subscription:', error);
    return NextResponse.json(
      { error: 'Bülten tercihi güncellenemedi.' },
      { status: 500 }
    );
  }
}
