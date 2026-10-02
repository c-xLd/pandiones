import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { MFA_COOKIE, clearedCookie, getCurrentUser } from '@/lib/auth';
import { verifySecondFactor } from '@/lib/auth/mfa-service';
import { enforce } from '@/lib/security/rate-limit';
import { readJson } from '@/lib/security/request';

export const dynamic = 'force-dynamic';

/**
 * KVKK data rights for the signed-in customer.
 * GET: everything the shop stores about the account, as a JSON download (no password or 2FA material).
 * DELETE: closes the account. Orders stay (tax law requires keeping invoices) but are detached from the
 * account; addresses, favourites, sessions and the newsletter subscription are removed.
 */
export async function GET(request: Request) {
  const session = await getCurrentUser(request);
  if (!session) return NextResponse.json({ error: 'Oturum açmanız gerekiyor.' }, { status: 401 });
  const data = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      name: true,
      email: true,
      phone: true,
      createdAt: true,
      emailVerifiedAt: true,
      totpEnabledAt: true,
      addresses: true,
      wishlists: { select: { createdAt: true, product: { select: { name: true, slug: true } } } },
      orders: {
        select: {
          orderNumber: true,
          status: true,
          totalAmount: true,
          createdAt: true,
          customerName: true,
          customerEmail: true,
          customerPhone: true,
          shippingAddress: true,
          shippingCity: true,
          shippingDistrict: true,
          items: { select: { productName: true, size: true, quantity: true, price: true } },
          returns: { select: { status: true, reason: true, createdAt: true } },
        },
      },
      sessions: { where: { revokedAt: null }, select: { createdAt: true, lastSeenAt: true, userAgent: true } },
    },
  });
  if (!data) return NextResponse.json({ error: 'Hesap bulunamadı.' }, { status: 404 });
  const newsletter = await prisma.newsletter.findUnique({ where: { email: data.email }, select: { subscribedAt: true } });
  const body = JSON.stringify({ exportedAt: new Date().toISOString(), account: data, newsletter }, null, 2);
  return new NextResponse(body, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': 'attachment; filename="pandiones-hesap-verilerim.json"',
      'Cache-Control': 'no-store',
    },
  });
}

export async function DELETE(request: Request) {
  const session = await getCurrentUser(request);
  if (!session) return NextResponse.json({ error: 'Oturum açmanız gerekiyor.' }, { status: 401 });
  if (session.role === 'ADMIN') return NextResponse.json({ error: 'Yönetici hesabı buradan silinemez.' }, { status: 403 });
  const limited = await enforce(request, 'login', session.email);
  if (limited) return limited;
  const parsed = await readJson<{ password?: unknown; code?: unknown; confirm?: unknown }>(request, 2048);
  if (!parsed.ok) return NextResponse.json({ error: 'Geçersiz istek.' }, { status: parsed.status });
  if (parsed.body.confirm !== 'HESABIMI SIL') {
    return NextResponse.json({ error: 'Onay için kutuya HESABIMI SIL yazın.', field: 'confirm' }, { status: 400 });
  }

  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.userId }, select: { passwordHash: true, email: true, totpEnabledAt: true } });
  const passwordOk = typeof parsed.body.password === 'string' && (await bcrypt.compare(parsed.body.password, user.passwordHash));
  const codeOk = !user.totpEnabledAt || (typeof parsed.body.code === 'string' && (await verifySecondFactor(prisma, session.userId, parsed.body.code)) !== null);
  if (!passwordOk || !codeOk) return NextResponse.json({ error: 'Şifre ya da doğrulama kodu hatalı.' }, { status: 401 });

  await prisma.$transaction([
    prisma.newsletter.deleteMany({ where: { email: user.email } }),
    prisma.stockAlert.deleteMany({ where: { email: user.email } }),
    // Cascades: sessions, addresses, wishlist, reset links. Orders: userId → NULL (kept for invoices).
    prisma.user.delete({ where: { id: session.userId } }),
  ]);
  const response = NextResponse.json({ success: true });
  response.cookies.set(clearedCookie());
  response.cookies.set(clearedCookie(MFA_COOKIE));
  return response;
}
