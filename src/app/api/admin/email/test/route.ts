import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { sendTestEmail, emailDeliveryConfigured } from '@/lib/email/provider';
import { recordAuditAfter } from '@/lib/audit';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const session = await getCurrentUser(request);
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const targetEmail = typeof body.targetEmail === 'string' && emailRegex.test(body.targetEmail.trim())
      ? body.targetEmail.trim().toLowerCase()
      : session.email;

    const configured = emailDeliveryConfigured();
    const result = await sendTestEmail(targetEmail);

    await recordAuditAfter(prisma, session, {
      action: 'email.test',
      entity: 'email',
      summary: result.success
        ? `Test e-postası başarıyla gönderildi (${targetEmail})`
        : `Test e-postası gönderilemedi (${targetEmail}): ${result.error || 'Bilinmeyen hata'}`,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error || 'Test e-postası gönderilemedi.',
          configured,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `${targetEmail} adresine test e-postası gönderildi.`,
      provider: process.env.RESEND_API_KEY ? 'Resend' : 'InMemory (Yerel/Test)',
      configured,
      messageId: result.messageId,
    });
  } catch (error) {
    console.error('Test email error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Test e-postası gönderilemedi.' },
      { status: 500 }
    );
  }
}
