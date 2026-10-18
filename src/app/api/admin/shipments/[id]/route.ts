import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { cancelShipment, handOver, recordManualStatus, setBarcode } from '@/lib/shipping/service';
import { forbidden, shipmentErrorResponse } from '@/lib/shipping/http';
import { can } from '@/lib/security/roles';

export const dynamic = 'force-dynamic';

/**
 * One shipment: `barcode` (PTT barcode; uploaded to PTT in API mode), `handover` (parcel left at the branch:
 * order Kargoda + e-mail), `status` (movement typed by hand), `cancel` (before hand-over only).
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getCurrentUser(request);
    if (!session || !can(session.role, 'orders')) return forbidden();
    const { id } = await params;
    const body = await request.json().catch(() => null);
    const action = body?.action;
    if (action === 'barcode') {
      const result = await setBarcode(prisma, session, id, String(body.barcode ?? ''));
      return NextResponse.json({ success: true, emails: result.emails });
    }
    if (action === 'handover') {
      const result = await handOver(prisma, session, id);
      return NextResponse.json({ success: true, emails: result.emails });
    }
    if (action === 'status') {
      await recordManualStatus(prisma, session, id, String(body.status ?? ''), typeof body.note === 'string' ? body.note.slice(0, 200) : null);
      return NextResponse.json({ success: true });
    }
    if (action === 'cancel') {
      await cancelShipment(prisma, session, id);
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ error: 'Geçersiz işlem.' }, { status: 400 });
  } catch (error) {
    return shipmentErrorResponse(error, 'Gönderi güncellenemedi.');
  }
}
