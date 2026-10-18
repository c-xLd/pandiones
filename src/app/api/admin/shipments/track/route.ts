import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { trackOpenShipments } from '@/lib/shipping/service';
import { forbidden } from '@/lib/shipping/http';
import { can } from '@/lib/security/roles';

export const dynamic = 'force-dynamic';

/** "Takip durumlarını şimdi güncelle": the tracking job on demand (API mode only). */
export async function POST(request: Request) {
  const session = await getCurrentUser(request);
  if (!session || !can(session.role, 'orders')) return forbidden();
  try {
    const summary = await trackOpenShipments(prisma);
    if (summary.mode !== 'API') return NextResponse.json({ error: 'PTT bağlantısı yapılandırılmadı; durumlar elle girilir.' }, { status: 409 });
    return NextResponse.json({ success: true, ...summary });
  } catch (error) {
    console.error('Manual tracking error:', error);
    return NextResponse.json({ error: 'Takip durumları güncellenemedi.' }, { status: 500 });
  }
}
