import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { createShipment } from '@/lib/shipping/service';
import { forbidden, shipmentErrorResponse } from '@/lib/shipping/http';
import { can } from '@/lib/security/roles';

export const dynamic = 'force-dynamic';

/** New PTT shipment (label ready) for a paid or preparing order. */
export async function POST(request: Request) {
  try {
    const session = await getCurrentUser(request);
    if (!session || !can(session.role, 'orders')) return forbidden();
    const body = await request.json().catch(() => null);
    if (!body || typeof body.orderId !== 'string') return NextResponse.json({ error: 'Sipariş seçilmedi.' }, { status: 400 });
    const weight = body.weightKg === null || body.weightKg === undefined || body.weightKg === '' ? null : Number(body.weightKg);
    const shipment = await createShipment(prisma, session, { orderId: body.orderId, desi: Number(body.desi), pieces: Number(body.pieces ?? 1), weightKg: weight });
    return NextResponse.json({ success: true, shipment });
  } catch (error) {
    return shipmentErrorResponse(error, 'Gönderi oluşturulamadı.');
  }
}
