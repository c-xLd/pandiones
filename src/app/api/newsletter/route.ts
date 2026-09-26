import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateNewsletterUnsubscribeToken, verifyNewsletterUnsubscribeToken } from '@/lib/auth';
import { sendNewsletterWelcomeEmail } from '@/lib/email/provider';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://pandiones.com';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Lütfen geçerli bir e-posta adresi giriniz.' },
        { status: 400 }
      );
    }

    const cleanEmail = email.toLowerCase().trim();

    const existing = await prisma.newsletter.findUnique({
      where: { email: cleanEmail },
    });

    if (existing) {
      return NextResponse.json({
        success: true,
        message: 'E-posta adresiniz zaten bülten listemizde kayıtlıdır.',
      });
    }

    await prisma.newsletter.create({
      data: { email: cleanEmail },
    });

    // Generate unsubscribe link and trigger welcome email
    const token = generateNewsletterUnsubscribeToken(cleanEmail);
    const unsubscribeUrl = `${SITE_URL}/api/newsletter/unsubscribe?email=${encodeURIComponent(cleanEmail)}&token=${encodeURIComponent(token)}`;

    // Safe trigger, does not fail the subscription request if email provider is offline
    await sendNewsletterWelcomeEmail({
      recipientEmail: cleanEmail,
      unsubscribeUrl,
    });

    return NextResponse.json({
      success: true,
      message: 'Pandiones bültenine hoş geldiniz. Özel davet ve seçkilerden haberdar edileceksiniz.',
    });
  } catch (error) {
    console.error('Newsletter subscription error:', error);
    return NextResponse.json(
      { error: 'Kayıt sırasında bir hata oluştu.' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    let email = '';
    let token = '';

    const { searchParams } = new URL(request.url);
    email = searchParams.get('email') || '';
    token = searchParams.get('token') || '';

    if (!email || !token) {
      try {
        const body = await request.json();
        email = body.email || email;
        token = body.token || token;
      } catch {
        // body might be empty in DELETE requests
      }
    }

    if (!email || !token) {
      return NextResponse.json(
        { error: 'E-posta adresi ve ayrılma anahtarı (token) zorunludur.' },
        { status: 400 }
      );
    }

    const cleanEmail = email.toLowerCase().trim();
    const isValidToken = verifyNewsletterUnsubscribeToken(cleanEmail, token);

    if (!isValidToken) {
      return NextResponse.json(
        { error: 'Geçersiz veya süresi dolmuş ayrılma bağlantısı.' },
        { status: 403 }
      );
    }

    const existing = await prisma.newsletter.findUnique({
      where: { email: cleanEmail },
    });

    if (existing) {
      await prisma.newsletter.delete({
        where: { email: cleanEmail },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Bülten aboneliğiniz başarıyla sonlandırılmıştır.',
    });
  } catch (error) {
    console.error('Newsletter unsubscribe error:', error);
    return NextResponse.json(
      { error: 'Abonelikten ayrılma işlemi sırasında bir hata oluştu.' },
      { status: 500 }
    );
  }
}
