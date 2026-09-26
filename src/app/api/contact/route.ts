import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = (body.name || '').trim();
    const email = (body.email || '').trim().toLowerCase();
    const phone = (body.phone || '').trim();
    const orderNumber = (body.orderNumber || '').trim().toUpperCase();
    const subject = (body.subject || 'Genel Danışmanlık').trim();
    const message = (body.message || '').trim();

    if (!name || name.length < 2) {
      return NextResponse.json({ error: 'Lütfen adınızı ve soyadınızı giriniz.' }, { status: 400 });
    }

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Lütfen geçerli bir e-posta adresi giriniz.' }, { status: 400 });
    }

    if (!message || message.length < 10) {
      return NextResponse.json({ error: 'Lütfen en az 10 karakterlik açıklayıcı bir mesaj giriniz.' }, { status: 400 });
    }

    console.log('[CUSTOMER_CONTACT_SUBMISSION]', {
      name,
      email,
      phone,
      orderNumber,
      subject,
      messageLength: message.length,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: 'Mesajınız başarıyla iletildi. Müşteri danışmanımız en geç 24 saat içinde sizinle iletişime geçecektir.',
    });
  } catch (error) {
    console.error('Contact submission error:', error);
    return NextResponse.json({ error: 'Mesajınız gönderilemedi. Lütfen tekrar deneyin.' }, { status: 500 });
  }
}
