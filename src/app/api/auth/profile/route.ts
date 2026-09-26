import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function PATCH(request: Request) {
  try {
    const session = await getCurrentUser(request);
    if (!session) {
      return NextResponse.json(
        { error: 'Profil güncellemek için giriş yapmalısınız.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, phone } = body;

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json(
        { error: 'Lütfen en az 2 karakterden oluşan geçerli bir ad soyad giriniz.' },
        { status: 400 }
      );
    }

    if (name.trim().length > 100) {
      return NextResponse.json(
        { error: 'Ad soyad en fazla 100 karakter olabilir.' },
        { status: 400 }
      );
    }

    let sanitizedPhone: string | null = null;
    if (phone && typeof phone === 'string' && phone.trim().length > 0) {
      const clean = phone.trim();
      // Allow phone characters +, digits, spaces, parentheses, hyphens (min 7 digits)
      const digitCount = (clean.match(/\d/g) || []).length;
      if (digitCount < 7 || digitCount > 15) {
        return NextResponse.json(
          { error: 'Lütfen geçerli bir telefon numarası giriniz.' },
          { status: 400 }
        );
      }
      sanitizedPhone = clean;
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.userId },
      data: {
        name: name.trim(),
        phone: sanitizedPhone,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Profil bilgileriniz başarıyla güncellendi.',
      user: updatedUser,
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    return NextResponse.json(
      { error: 'Profil güncellenirken bir hata oluştu.' },
      { status: 500 }
    );
  }
}
