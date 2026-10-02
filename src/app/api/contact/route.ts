import { NextResponse } from 'next/server';
import { HUMAN_CHECK_FAILED, verifyHuman } from '@/lib/security/turnstile';
import { enforce } from '@/lib/security/rate-limit';
import { prisma } from '@/lib/prisma';
import { normalizeContact, validateContact } from '@/lib/contact/validate';
import { readStoreSettings } from '@/lib/settings/server';
import { sendContactNotificationEmail } from '@/lib/email/provider';

export const dynamic = 'force-dynamic';

/**
 * Stores the message, then forwards it to the support inbox. Success is reported only when the
 * inbox e-mail actually went out; a stored-but-undelivered message stays in the table with
 * notifiedAt = null so it can be recovered.
 */
export async function POST(request: Request) {
  const limited = await enforce(request, 'contact');
  if (limited) return limited;
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'İstek okunamadı.' }, { status: 400 });
  }
  if (!(await verifyHuman(request, body.turnstileToken))) {
    return NextResponse.json({ error: HUMAN_CHECK_FAILED, code: 'HUMAN_CHECK_FAILED' }, { status: 400 });
  }

  // Honeypot: a hidden field real visitors never fill.
  if (typeof body.website === 'string' && body.website.trim()) {
    return NextResponse.json({ error: 'Mesaj gönderilemedi.' }, { status: 400 });
  }

  const input = normalizeContact(body);
  const fieldErrors = validateContact(input);
  const firstField = Object.keys(fieldErrors)[0];
  if (firstField) {
    return NextResponse.json(
      { error: fieldErrors[firstField as keyof typeof fieldErrors], field: firstField, fieldErrors },
      { status: 400 },
    );
  }

  try {
    const saved = await prisma.contactMessage.create({
      data: {
        name: input.name,
        email: input.email,
        phone: input.phone || null,
        orderNumber: input.orderNumber || null,
        subject: input.subject,
        message: input.message,
      },
    });

    // A private inbox in CONTACT_INBOX_EMAIL wins; otherwise the public address from Yönetim → Ayarlar.
    const supportEmail = (await readStoreSettings().catch(() => null))?.contactEmail ?? 'destek@pandiones.com';
    const delivery = await sendContactNotificationEmail({
      inboxEmail: process.env.CONTACT_INBOX_EMAIL || supportEmail,
      ...input,
      receivedAt: saved.createdAt,
    });

    if (!delivery.success) {
      console.error('[CONTACT_NOTIFY_FAILED]', { id: saved.id, error: delivery.error });
      return NextResponse.json(
        {
          error: `Mesajınız şu an ekibimize ulaştırılamadı. Lütfen tekrar deneyin ya da ${supportEmail} adresine doğrudan yazın.`,
          code: 'NOTIFY_FAILED',
        },
        { status: 503 },
      );
    }

    await prisma.contactMessage.update({ where: { id: saved.id }, data: { notifiedAt: new Date() } });

    return NextResponse.json({ success: true, id: saved.id }, { status: 201 });
  } catch (error) {
    console.error('[CONTACT_SAVE_FAILED]', error);
    return NextResponse.json({ error: 'Mesajınız kaydedilemedi. Lütfen tekrar deneyin.' }, { status: 500 });
  }
}
