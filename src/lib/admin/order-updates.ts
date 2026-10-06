import type { PrismaClient } from '@prisma/client';
import type { UserSession } from '@/lib/auth';
import { recordAudit, recordAuditAfter } from '@/lib/audit';
import { sendOrderShippedEmail } from '@/lib/email/provider';
import { checkTracking, checkTransition, statusLabel } from '@/lib/orders/transitions';
import { syncShipmentWithOrder } from '@/lib/shipping/sync';

/** One requested change to one order. Fields left out are not touched. */
export type OrderChange = {
  id: string;
  status?: string;
  trackingCompany?: string;
  trackingCode?: string;
  adminNotes?: string;
};

export type OrderChangeResult = {
  updatedIds: string[];
  skipped: { id: string; orderNumber: string; reason: string }[];
  emails: { sent: string[]; failed: string[] };
};

/** Statuses in which a tracking number may be written. */
const TRACKABLE = ['ODENDI', 'HAZIRLANIYOR', 'KARGODA', 'TESLIM_EDILDI'];

export const ADMIN_ORDER_INCLUDE = {
  items: { include: { product: { select: { id: true, image: true, slug: true, category: true } } } },
  // The order's current (not cancelled) shipment, for the list and the label.
  shipments: {
    where: { status: { not: 'IPTAL' } },
    orderBy: { createdAt: 'desc' },
    take: 1,
    select: { id: true, status: true, barcode: true, reference: true, desi: true, pieces: true, weightKg: true, mode: true, labelPrintedAt: true },
  },
} as const;

/**
 * Applies the changes that pass the transition and tracking rules, in one transaction with their
 * activity-log rows; the rest come back in `skipped` with the reason. Orders that moved to KARGODA get
 * the shipping e-mail afterwards, and the outcome of each send is logged so the order timeline shows it.
 */
export async function applyOrderChanges(db: PrismaClient, session: Pick<UserSession, 'userId' | 'email'>, changes: OrderChange[]): Promise<OrderChangeResult> {
  const result: OrderChangeResult = { updatedIds: [], skipped: [], emails: { sent: [], failed: [] } };
  const shipped: string[] = [];

  await db.$transaction(async (tx) => {
    const orders = await tx.order.findMany({
      where: { id: { in: changes.map((change) => change.id) } },
      select: { id: true, orderNumber: true, status: true, trackingCompany: true, trackingCode: true, adminNotes: true },
    });
    const byId = new Map(orders.map((order) => [order.id, order]));

    for (const change of changes) {
      const order = byId.get(change.id);
      if (!order) {
        result.skipped.push({ id: change.id, orderNumber: '—', reason: 'Sipariş bulunamadı.' });
        continue;
      }
      const skip = (reason: string) => result.skipped.push({ id: order.id, orderNumber: order.orderNumber, reason });
      const data: { status?: string; trackingCompany?: string; trackingCode?: string; adminNotes?: string } = {};

      if (change.trackingCompany !== undefined || change.trackingCode !== undefined) {
        const tracking = checkTracking(change.trackingCompany ?? order.trackingCompany, change.trackingCode ?? order.trackingCode);
        if (!tracking.ok) {
          skip(tracking.reason);
          continue;
        }
        const statusAfter = change.status ?? order.status;
        if (!TRACKABLE.includes(statusAfter)) {
          skip('Ödemesi tamamlanmamış siparişe takip numarası girilemez.');
          continue;
        }
        data.trackingCompany = tracking.company;
        data.trackingCode = tracking.code;
      }

      if (change.status !== undefined) {
        const check = checkTransition(order, change.status, data.trackingCode ?? order.trackingCode);
        if (!check.ok) {
          skip(check.reason);
          continue;
        }
        data.status = change.status;
      }

      if (change.adminNotes !== undefined) data.adminNotes = change.adminNotes.slice(0, 2000);

      const diff: Record<string, [unknown, unknown]> = {};
      for (const [field, value] of Object.entries(data)) {
        const previous = order[field as keyof typeof order];
        if (previous === value) continue;
        // Internal notes can hold customer details; the log records that they changed, not the text.
        diff[field] = field === 'adminNotes' ? ['önceki not', 'yeni not'] : [previous, value];
      }
      if (Object.keys(diff).length === 0) {
        result.updatedIds.push(order.id);
        continue;
      }

      await tx.order.update({ where: { id: order.id }, data });
      await syncShipmentWithOrder(tx, order.id, { trackingCompany: data.trackingCompany, trackingCode: data.trackingCode, fromStatus: order.status, toStatus: data.status });
      const parts = [
        diff.status ? `durum ${statusLabel(String(diff.status[1]))}` : null,
        diff.trackingCode || diff.trackingCompany ? 'kargo bilgisi' : null,
        diff.adminNotes ? 'yönetici notu' : null,
      ].filter(Boolean);
      await recordAudit(tx, session, {
        action: diff.status ? 'order.status' : diff.adminNotes && parts.length === 1 ? 'order.note' : 'order.tracking',
        entity: 'order',
        entityId: order.id,
        summary: `#${order.orderNumber}: ${parts.join(', ')} güncellendi`,
        diff,
      });
      result.updatedIds.push(order.id);
      if (diff.status && data.status === 'KARGODA') shipped.push(order.id);
    }
  });

  if (shipped.length) {
    const orders = await db.order.findMany({
      where: { id: { in: shipped } },
      select: { id: true, orderNumber: true, customerName: true, customerEmail: true, trackingCompany: true, trackingCode: true },
    });
    // Awaited so the send finishes inside this request (a serverless function may stop right after the response).
    await Promise.all(
      orders.map(async (order) => {
        const sent = await sendOrderShippedEmail({
          orderNumber: order.orderNumber,
          customerName: order.customerName,
          customerEmail: order.customerEmail,
          trackingCompany: order.trackingCompany || 'Kargo',
          trackingCode: order.trackingCode as string,
        }).catch((error: unknown) => ({ success: false, error: error instanceof Error ? error.message : String(error) }));
        (sent.success ? result.emails.sent : result.emails.failed).push(order.orderNumber);
        await recordAuditAfter(db, session, {
          action: sent.success ? 'order.email' : 'order.email_failed',
          entity: 'order',
          entityId: order.id,
          summary: sent.success ? `#${order.orderNumber}: kargo e-postası gönderildi` : `#${order.orderNumber}: kargo e-postası gönderilemedi`,
        });
      }),
    );
  }

  return result;
}
