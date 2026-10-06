import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { statusLabel } from '@/lib/orders/transitions';

export const dynamic = 'force-dynamic';

type TimelineEntry = { at: string; kind: 'created' | 'payment' | 'paid' | 'status' | 'tracking' | 'note' | 'email' | 'shipping'; title: string; detail?: string; actor?: string; tone?: 'success' | 'danger' };

const AUDIT_KIND: Record<string, TimelineEntry['kind']> = {
  'order.status': 'status',
  'order.tracking': 'tracking',
  'order.note': 'note',
  'order.email': 'email',
  'order.email_failed': 'email',
  'order.shipment': 'shipping',
};

/** One order for the detail panel: everything the list leaves out, plus its timeline. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getCurrentUser(request);
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 403 });
    }
    const { id } = await params;
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: { include: { product: { select: { id: true, image: true, slug: true, category: true } } } },
        transactions: { orderBy: { createdAt: 'asc' } },
        shipments: { orderBy: { createdAt: 'asc' }, include: { events: { orderBy: { at: 'asc' } } } },
      },
    });
    if (!order) return NextResponse.json({ error: 'Sipariş bulunamadı.' }, { status: 404 });

    const audit = await prisma.auditLog.findMany({
      where: { entity: 'order', entityId: order.id },
      orderBy: { createdAt: 'asc' },
      take: 200,
    });

    const timeline: TimelineEntry[] = [{ at: order.createdAt.toISOString(), kind: 'created', title: 'Sipariş oluşturuldu' }];
    for (const tx of order.transactions) {
      const ok = tx.status === 'SUCCESS';
      timeline.push({
        at: tx.createdAt.toISOString(),
        kind: 'payment',
        title: ok ? 'Ödeme denemesi başarılı' : 'Ödeme denemesi başarısız',
        detail: tx.errorMessage || undefined,
        tone: ok ? 'success' : 'danger',
      });
    }
    if (order.paidAt) timeline.push({ at: order.paidAt.toISOString(), kind: 'paid', title: 'Ödeme alındı', tone: 'success' });
    for (const entry of audit) {
      const kind = AUDIT_KIND[entry.action];
      if (!kind) continue;
      let detail: string | undefined;
      if (entry.diff) {
        try {
          const diff = JSON.parse(entry.diff) as Record<string, [unknown, unknown]>;
          if (diff.status) detail = `${statusLabel(String(diff.status[0]))} → ${statusLabel(String(diff.status[1]))}`;
          else if (diff.trackingCode) detail = `${diff.trackingCode[0] ?? '—'} → ${diff.trackingCode[1]}`;
        } catch {
          // A malformed diff only loses the detail line; the entry itself still shows.
        }
      }
      timeline.push({
        at: entry.createdAt.toISOString(),
        kind,
        title: entry.summary.replace(/^#[^:]+:\s*/, ''),
        detail,
        actor: entry.actorEmail,
        tone: entry.action === 'order.email_failed' ? 'danger' : entry.action === 'order.email' ? 'success' : undefined,
      });
    }
    // Carrier movements (PTT or typed in the panel); panel actions already appear through the audit rows.
    for (const shipment of order.shipments) {
      for (const event of shipment.events) {
        if (event.source !== 'PTT') continue;
        timeline.push({ at: event.at.toISOString(), kind: 'shipping', title: `PTT: ${event.description}`, detail: event.location || undefined });
      }
    }
    timeline.sort((a, b) => a.at.localeCompare(b.at));

    return NextResponse.json({ order, timeline });
  } catch (error) {
    console.error('Admin order detail error:', error);
    return NextResponse.json({ error: 'Sipariş alınamadı.' }, { status: 500 });
  }
}
