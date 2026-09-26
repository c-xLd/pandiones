import { NextResponse } from 'next/server';
import { checkGiftCardBalance } from '@/lib/gift-cards/gift-card-service';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { code } = await request.json();

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { error: 'Lütfen geçerli bir hediye kartı kodu giriniz.' },
        { status: 400 }
      );
    }

    const result = await checkGiftCardBalance(code);
    if (!result.valid) {
      return NextResponse.json(
        { error: result.error || 'Hediye kartı bulunamadı.' },
        { status: 404 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Gift card balance inquiry error:', error);
    return NextResponse.json(
      { error: 'Bakiye sorgulanırken bir hata oluştu.' },
      { status: 500 }
    );
  }
}
