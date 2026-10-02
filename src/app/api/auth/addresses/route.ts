import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { readJson } from '@/lib/security/request';

export const dynamic = 'force-dynamic';

const ADDRESS_SELECT = {
  id: true,
  title: true,
  recipient: true,
  phone: true,
  address: true,
  district: true,
  city: true,
  postalCode: true,
  isDefault: true,
  createdAt: true,
} as const;

const text = (value: unknown, max: number) => (typeof value === 'string' ? value.trim().slice(0, max) : '');

export async function GET(request: Request) {
  const session = await getCurrentUser(request);
  if (!session) return NextResponse.json({ error: 'Oturum açmalısınız.' }, { status: 401 });
  try {
    const addresses = await prisma.address.findMany({
      where: { userId: session.userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      select: ADDRESS_SELECT,
    });
    return NextResponse.json({ addresses });
  } catch (error) {
    console.error('Error fetching addresses:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Adresler alınamadı.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getCurrentUser(request);
  if (!session) return NextResponse.json({ error: 'Oturum açmalısınız.' }, { status: 401 });
  const parsed = await readJson<Record<string, unknown>>(request, 8 * 1024);
  if (!parsed.ok) return NextResponse.json({ error: 'Geçersiz istek.' }, { status: parsed.status });
  const body = parsed.body;

  const title = text(body.title, 40);
  const recipient = text(body.recipient, 120);
  const phone = text(body.phone, 30);
  const address = text(body.address, 500);
  const district = text(body.district, 80);
  const city = text(body.city, 80);
  const postalCode = text(body.postalCode, 10) || null;
  const isDefault = body.isDefault === true;

  if (!title) return NextResponse.json({ error: 'Lütfen adres başlığı (örn: Ev, İş) giriniz.' }, { status: 400 });
  if (!recipient) return NextResponse.json({ error: 'Lütfen teslim alacak kişi adını giriniz.' }, { status: 400 });
  if (!phone) return NextResponse.json({ error: 'Lütfen telefon numarası giriniz.' }, { status: 400 });
  if (address.length < 5) return NextResponse.json({ error: 'Lütfen açık adresinizi eksiksiz giriniz.' }, { status: 400 });
  if (!city || !district) return NextResponse.json({ error: 'Lütfen il ve ilçe seçimini yapınız.' }, { status: 400 });

  try {
    const created = await prisma.$transaction(async (tx) => {
      if (isDefault) await tx.address.updateMany({ where: { userId: session.userId }, data: { isDefault: false } });
      return tx.address.create({
        data: { userId: session.userId, title, recipient, phone, address, district, city, postalCode, isDefault },
        select: ADDRESS_SELECT,
      });
    });
    return NextResponse.json({ success: true, message: 'Adres başarıyla kaydedildi.', address: created });
  } catch (error) {
    console.error('Error creating address:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Adres kaydedilemedi.' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const session = await getCurrentUser(request);
  if (!session) return NextResponse.json({ error: 'Oturum açmalısınız.' }, { status: 401 });
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Adres ID gerekli.' }, { status: 400 });
  try {
    // Ownership is part of the filter: another user's id deletes nothing and reads as "not found".
    const { count } = await prisma.address.deleteMany({ where: { id, userId: session.userId } });
    if (count === 0) return NextResponse.json({ error: 'Adres bulunamadı.' }, { status: 404 });
    return NextResponse.json({ success: true, message: 'Adres silindi.' });
  } catch (error) {
    console.error('Error deleting address:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Adres silinemedi.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = await getCurrentUser(request);
  if (!session) return NextResponse.json({ error: 'Oturum açmalısınız.' }, { status: 401 });
  const parsed = await readJson<{ id?: unknown; isDefault?: unknown }>(request, 1024);
  if (!parsed.ok) return NextResponse.json({ error: 'Geçersiz istek.' }, { status: parsed.status });
  const id = typeof parsed.body.id === 'string' ? parsed.body.id : '';
  if (!id) return NextResponse.json({ error: 'Adres ID gerekli.' }, { status: 400 });
  if (parsed.body.isDefault !== true) return NextResponse.json({ error: 'Desteklenmeyen güncelleme.' }, { status: 400 });

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const owned = await tx.address.findFirst({ where: { id, userId: session.userId }, select: { id: true } });
      if (!owned) return false;
      await tx.address.updateMany({ where: { userId: session.userId, NOT: { id } }, data: { isDefault: false } });
      await tx.address.update({ where: { id }, data: { isDefault: true } });
      return true;
    });
    if (!updated) return NextResponse.json({ error: 'Adres bulunamadı.' }, { status: 404 });
    return NextResponse.json({ success: true, message: 'Adres güncellendi.' });
  } catch (error) {
    console.error('Error updating address:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Adres güncellenemedi.' }, { status: 500 });
  }
}
