import { NextResponse } from 'next/server';
import { enforce } from '@/lib/security/rate-limit';
import { checkGiftCardBalance } from '@/lib/gift-cards/gift-card-service';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const limited = await enforce(request, 'codeCheck');
  if (limited) return limited;
  try {
    const body = await request.json().catch(() => ({}));
    const code = typeof body?.code === 'string' ? body.code.slice(0, 40) : '';

    if (!code) {
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

    // Balance only: whoever holds a code (it may have been forwarded) does not learn who sent it, to whom, or the note.
    return NextResponse.json({ valid: true, code: result.code, theme: result.theme, initialBalance: result.initialBalance, currentBalance: result.currentBalance, expiresAt: result.expiresAt });
  } catch (error) {
    console.error('Gift card balance inquiry error:', error);
    return NextResponse.json(
      { error: 'Bakiye sorgulanırken bir hata oluştu.' },
      { status: 500 }
    );
  }
}
