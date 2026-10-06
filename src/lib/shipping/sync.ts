import type { Prisma } from '@prisma/client';
import { PTT_CARRIER_NAME } from './statuses';

/**
 * Keeps an order's shipment in step when the order itself changes (status buttons, bulk actions, tracking
 * import), so the two never disagree whichever screen was used. Runs inside the order transaction.
 */
export async function syncShipmentWithOrder(
  tx: Prisma.TransactionClient,
  orderId: string,
  change: { trackingCompany?: string; trackingCode?: string; fromStatus?: string; toStatus?: string },
) {
  if (change.trackingCode && change.trackingCompany === PTT_CARRIER_NAME) {
    await tx.shipment.updateMany({ where: { orderId, status: { not: 'IPTAL' }, barcode: null }, data: { barcode: change.trackingCode } });
  }
  if (!change.toStatus || change.toStatus === change.fromStatus) return;

  const move = async (from: string[], to: string, description: string) => {
    const shipments = await tx.shipment.findMany({ where: { orderId, status: { in: from } }, select: { id: true } });
    for (const shipment of shipments) {
      await tx.shipment.update({ where: { id: shipment.id }, data: { status: to } });
      await tx.shipmentEvent.create({ data: { shipmentId: shipment.id, at: new Date(), description, source: 'PANEL' } });
    }
  };

  if (change.toStatus === 'KARGODA' && change.fromStatus !== 'KARGODA') await move(['ETIKET_HAZIR'], 'KABUL', 'Kargoya verildi');
  else if (change.toStatus === 'TESLIM_EDILDI') await move(['KABUL', 'DAGITIMDA', 'TESLIM_EDILEMEDI'], 'TESLIM_EDILDI', 'Teslim edildi');
  else if (change.fromStatus === 'KARGODA' && change.toStatus === 'HAZIRLANIYOR') await move(['KABUL'], 'ETIKET_HAZIR', 'Kargoya verilmesi geri alındı');
}
