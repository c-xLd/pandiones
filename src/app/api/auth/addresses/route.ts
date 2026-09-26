import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getCurrentUser(request);
    if (!session) {
      return NextResponse.json({ error: 'Oturum açmalısınız.' }, { status: 401 });
    }

    // Try through Prisma delegate or fallback to raw query
    let addresses: any[] = [];
    try {
      if ((prisma as any).address) {
        addresses = await (prisma as any).address.findMany({
          where: { userId: session.userId },
          orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
        });
      } else {
        addresses = await prisma.$queryRaw<any[]>`
          SELECT * FROM Address 
          WHERE userId = ${session.userId} 
          ORDER BY isDefault DESC, createdAt DESC
        `;
      }
    } catch {
      addresses = await prisma.$queryRaw<any[]>`
        SELECT * FROM Address 
        WHERE userId = ${session.userId} 
        ORDER BY isDefault DESC, createdAt DESC
      `.catch(() => []);
    }

    return NextResponse.json({ addresses });
  } catch (error) {
    console.error('Error fetching addresses:', error);
    return NextResponse.json({ error: 'Adresler alınamadı.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getCurrentUser(request);
    if (!session) {
      return NextResponse.json({ error: 'Oturum açmalısınız.' }, { status: 401 });
    }

    const body = await request.json();
    const { title, recipient, phone, address, district, city, postalCode, isDefault } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Lütfen adres başlığı (örn: Ev, İş) giriniz.' }, { status: 400 });
    }
    if (!recipient || !recipient.trim()) {
      return NextResponse.json({ error: 'Lütfen teslim alacak kişi adını giriniz.' }, { status: 400 });
    }
    if (!phone || !phone.trim()) {
      return NextResponse.json({ error: 'Lütfen telefon numarası giriniz.' }, { status: 400 });
    }
    if (!address || address.trim().length < 5) {
      return NextResponse.json({ error: 'Lütfen açık adresinizi eksiksiz giriniz.' }, { status: 400 });
    }
    if (!city || !city.trim() || !district || !district.trim()) {
      return NextResponse.json({ error: 'Lütfen il ve ilçe seçimini yapınız.' }, { status: 400 });
    }

    const cleanTitle = title.trim();
    const cleanRecipient = recipient.trim();
    const cleanPhone = phone.trim();
    const cleanAddress = address.trim();
    const cleanDistrict = district.trim();
    const cleanCity = city.trim();
    const cleanPostal = postalCode ? postalCode.trim() : null;
    const shouldBeDefault = Boolean(isDefault);

    // If this address should be default, unset others
    if (shouldBeDefault) {
      try {
        if ((prisma as any).address) {
          await (prisma as any).address.updateMany({
            where: { userId: session.userId },
            data: { isDefault: false },
          });
        } else {
          await prisma.$executeRaw`
            UPDATE Address SET isDefault = 0 WHERE userId = ${session.userId}
          `;
        }
      } catch (err) {
        console.error('Error clearing default addresses:', err);
      }
    }

    const newId = `addr_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    let created: any = null;

    try {
      if ((prisma as any).address) {
        created = await (prisma as any).address.create({
          data: {
            id: newId,
            userId: session.userId,
            title: cleanTitle,
            recipient: cleanRecipient,
            phone: cleanPhone,
            address: cleanAddress,
            district: cleanDistrict,
            city: cleanCity,
            postalCode: cleanPostal,
            isDefault: shouldBeDefault,
          },
        });
      } else {
        await prisma.$executeRaw`
          INSERT INTO Address (id, userId, title, recipient, phone, address, district, city, postalCode, isDefault, createdAt, updatedAt)
          VALUES (${newId}, ${session.userId}, ${cleanTitle}, ${cleanRecipient}, ${cleanPhone}, ${cleanAddress}, ${cleanDistrict}, ${cleanCity}, ${cleanPostal}, ${shouldBeDefault ? 1 : 0}, datetime('now'), datetime('now'))
        `;
        created = {
          id: newId,
          userId: session.userId,
          title: cleanTitle,
          recipient: cleanRecipient,
          phone: cleanPhone,
          address: cleanAddress,
          district: cleanDistrict,
          city: cleanCity,
          postalCode: cleanPostal,
          isDefault: shouldBeDefault,
          createdAt: new Date(),
        };
      }
    } catch (dbErr) {
      console.error('Direct create error, executing raw insert:', dbErr);
      await prisma.$executeRaw`
        INSERT INTO Address (id, userId, title, recipient, phone, address, district, city, postalCode, isDefault, createdAt, updatedAt)
        VALUES (${newId}, ${session.userId}, ${cleanTitle}, ${cleanRecipient}, ${cleanPhone}, ${cleanAddress}, ${cleanDistrict}, ${cleanCity}, ${cleanPostal}, ${shouldBeDefault ? 1 : 0}, datetime('now'), datetime('now'))
      `;
      created = {
        id: newId,
        userId: session.userId,
        title: cleanTitle,
        recipient: cleanRecipient,
        phone: cleanPhone,
        address: cleanAddress,
        district: cleanDistrict,
        city: cleanCity,
        postalCode: cleanPostal,
        isDefault: shouldBeDefault,
        createdAt: new Date(),
      };
    }

    return NextResponse.json({
      success: true,
      message: 'Adres başarıyla kaydedildi.',
      address: created,
    });
  } catch (error) {
    console.error('Error creating address:', error);
    return NextResponse.json({ error: 'Adres kaydedilemedi.' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getCurrentUser(request);
    if (!session) {
      return NextResponse.json({ error: 'Oturum açmalısınız.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Adres ID gerekli.' }, { status: 400 });
    }

    try {
      if ((prisma as any).address) {
        await (prisma as any).address.deleteMany({
          where: { id, userId: session.userId },
        });
      } else {
        await prisma.$executeRaw`
          DELETE FROM Address WHERE id = ${id} AND userId = ${session.userId}
        `;
      }
    } catch {
      await prisma.$executeRaw`
        DELETE FROM Address WHERE id = ${id} AND userId = ${session.userId}
      `;
    }

    return NextResponse.json({
      success: true,
      message: 'Adres silindi.',
    });
  } catch (error) {
    console.error('Error deleting address:', error);
    return NextResponse.json({ error: 'Adres silinemedi.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getCurrentUser(request);
    if (!session) {
      return NextResponse.json({ error: 'Oturum açmalısınız.' }, { status: 401 });
    }

    const body = await request.json();
    const { id, isDefault } = body;
    if (!id) {
      return NextResponse.json({ error: 'Adres ID gerekli.' }, { status: 400 });
    }

    if (isDefault) {
      // Unset other defaults
      await prisma.$executeRaw`
        UPDATE Address SET isDefault = 0 WHERE userId = ${session.userId}
      `.catch(() => {});

      await prisma.$executeRaw`
        UPDATE Address SET isDefault = 1, updatedAt = datetime('now') WHERE id = ${id} AND userId = ${session.userId}
      `.catch(() => {});
    }

    return NextResponse.json({
      success: true,
      message: 'Adres güncellendi.',
    });
  } catch (error) {
    console.error('Error updating address:', error);
    return NextResponse.json({ error: 'Adres güncellenemedi.' }, { status: 500 });
  }
}
