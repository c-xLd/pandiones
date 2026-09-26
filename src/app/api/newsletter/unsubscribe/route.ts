import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyNewsletterUnsubscribeToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function renderUnsubscribeResultPage(title: string, message: string, isSuccess: boolean): string {
  const statusColor = isSuccess ? '#166534' : '#991b1b';
  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — Pandiones</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f7f6f2;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      color: #1a1a1a;
    }
    .card {
      background: #ffffff;
      border: 1px solid #e8e6df;
      padding: 48px 40px;
      max-width: 480px;
      width: 90%;
      text-align: center;
      box-shadow: 0 4px 20px rgba(0,0,0,0.02);
    }
    .brand {
      font-family: Georgia, serif;
      font-size: 20px;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      margin-bottom: 24px;
      display: block;
      color: #111111;
      text-decoration: none;
    }
    h1 {
      font-family: Georgia, serif;
      font-size: 22px;
      font-weight: 400;
      color: ${statusColor};
      margin: 0 0 16px 0;
    }
    p {
      font-size: 14px;
      line-height: 1.6;
      color: #555555;
      margin: 0 0 24px 0;
    }
    a.btn {
      display: inline-block;
      background: #111111;
      color: #ffffff;
      text-decoration: none;
      font-size: 12px;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      padding: 12px 24px;
    }
  </style>
</head>
<body>
  <div class="card">
    <a href="/" class="brand">PANDIONES</a>
    <h1>${title}</h1>
    <p>${message}</p>
    <a href="/" class="btn">Mağazaya Dön</a>
  </div>
</body>
</html>`;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email') || '';
  const token = searchParams.get('token') || '';

  if (!email || !token) {
    return new Response(
      renderUnsubscribeResultPage(
        'Geçersiz İstek',
        'Eksik veya hatalı ayrılma bağlantısı. Lütfen e-postanızdaki bağlantıyı eksiksiz kopyalayınız.',
        false
      ),
      { status: 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }

  const cleanEmail = email.toLowerCase().trim();
  const isValid = verifyNewsletterUnsubscribeToken(cleanEmail, token);

  if (!isValid) {
    return new Response(
      renderUnsubscribeResultPage(
        'Bağlantı Geçersiz',
        'Ayrılma bağlantınızın geçerlilik süresi dolmuş veya bağlantı bozulmuş olabilir.',
        false
      ),
      { status: 403, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }

  try {
    const existing = await prisma.newsletter.findUnique({
      where: { email: cleanEmail },
    });

    if (existing) {
      await prisma.newsletter.delete({
        where: { email: cleanEmail },
      });
    }

    return new Response(
      renderUnsubscribeResultPage(
        'Aboneliğiniz İptal Edildi',
        `${cleanEmail} e-posta adresiniz Pandiones bülten listemizden başarıyla kaldırılmıştır.`,
        true
      ),
      { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  } catch (error) {
    console.error('Error in unsubscribe GET:', error);
    return new Response(
      renderUnsubscribeResultPage(
        'İşlem Başarısız',
        'Abonelik iptali sırasında bir sistem hatası meydana geldi. Lütfen daha sonra tekrar deneyiniz.',
        false
      ),
      { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, token } = body;

    if (!email || !token) {
      return NextResponse.json({ error: 'E-posta ve token zorunludur.' }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();
    if (!verifyNewsletterUnsubscribeToken(cleanEmail, token)) {
      return NextResponse.json({ error: 'Geçersiz token.' }, { status: 403 });
    }

    await prisma.newsletter.deleteMany({
      where: { email: cleanEmail },
    });

    return NextResponse.json({ success: true, message: 'Bülten aboneliği sonlandırıldı.' });
  } catch (error) {
    console.error('Error in unsubscribe POST:', error);
    return NextResponse.json({ error: 'İşlem başarısız.' }, { status: 500 });
  }
}
