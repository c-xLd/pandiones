import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { applyOrderChanges } from '@/lib/admin/order-updates';
import { normalizeCarrier, TRACKING_IMPORT_LIMIT } from '@/lib/admin/tracking-csv';
import { CARRIERS, checkTracking, checkTransition } from '@/lib/orders/transitions';
import { can } from '@/lib/security/roles';

export const dynamic = 'force-dynamic';

type RowResult = { line: number; orderNumber: string; ok: boolean; reason?: string; emailSent?: boolean; willShip?: boolean };

/**
 * Tracking numbers for many orders at once. `dryRun: true` only checks every row and reports; otherwise
 * the valid rows are written together (and, with `ship`, moved to Kargoda with the shipping e-mail).
 */
export async function POST(request: Request) {
  try {
    const session = await getCurrentUser(request);
    if (!session || !can(session.role, 'orders')) {
      return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 403 });
    }
    const body = await request.json().catch(() => null);
    const rawRows = Array.isArray(body?.rows) ? body.rows : null;
    if (!rawRows || rawRows.length === 0) return NextResponse.json({ error: 'Yüklenecek satır yok.' }, { status: 400 });
    if (rawRows.length > TRACKING_IMPORT_LIMIT) return NextResponse.json({ error: `Tek seferde en çok ${TRACKING_IMPORT_LIMIT} satır yüklenebilir.` }, { status: 400 });
    const ship = body.ship === true;
    const dryRun = body.dryRun !== false;

    const rows = rawRows.map((row: Record<string, unknown>, index: number) => ({
      line: Number.isInteger(row?.line) ? Number(row.line) : index + 1,
      orderNumber: String(row?.orderNumber ?? '').trim().replace(/^#/, ''),
      company: normalizeCarrier(String(row?.company ?? ''), CARRIERS),
      code: String(row?.code ?? '').trim(),
    }));

    const orders = await prisma.order.findMany({
      where: { orderNumber: { in: rows.map((row: { orderNumber: string }) => row.orderNumber).filter(Boolean) } },
      select: { id: true, orderNumber: true, status: true },
    });
    const byNumber = new Map(orders.map((order) => [order.orderNumber, order]));
    const seen = new Set<string>();

    const results: RowResult[] = [];
    const valid: { line: number; id: string; orderNumber: string; company: string; code: string; ship: boolean }[] = [];
    for (const row of rows) {
      const fail = (reason: string) => results.push({ line: row.line, orderNumber: row.orderNumber || '—', ok: false, reason });
      if (!row.orderNumber) {
        fail('Sipariş numarası boş.');
        continue;
      }
      if (seen.has(row.orderNumber)) {
        fail('Bu sipariş dosyada birden fazla kez geçiyor.');
        continue;
      }
      seen.add(row.orderNumber);
      const order = byNumber.get(row.orderNumber);
      if (!order) {
        fail('Sipariş bulunamadı.');
        continue;
      }
      const tracking = checkTracking(row.company, row.code);
      if (!tracking.ok) {
        fail(tracking.reason);
        continue;
      }
      if (!['ODENDI', 'HAZIRLANIYOR', 'KARGODA', 'TESLIM_EDILDI'].includes(order.status)) {
        fail('Ödemesi tamamlanmamış siparişe takip numarası girilemez.');
        continue;
      }
      // Already shipped or delivered orders only get the new number; ship applies to the rest.
      const shipThis = ship && (order.status === 'ODENDI' || order.status === 'HAZIRLANIYOR');
      if (shipThis) {
        const check = checkTransition(order, 'KARGODA', tracking.code);
        if (!check.ok) {
          fail(check.reason);
          continue;
        }
      }
      valid.push({ line: row.line, id: order.id, orderNumber: order.orderNumber, company: tracking.company, code: tracking.code, ship: shipThis });
      results.push({ line: row.line, orderNumber: order.orderNumber, ok: true, willShip: shipThis });
    }

    if (dryRun || valid.length === 0) {
      return NextResponse.json({ dryRun: true, results: results.sort((a, b) => a.line - b.line) });
    }

    const outcome = await applyOrderChanges(
      prisma,
      session,
      valid.map((row) => ({ id: row.id, trackingCompany: row.company, trackingCode: row.code, ...(row.ship ? { status: 'KARGODA' } : {}) })),
    );
    const skipped = new Map(outcome.skipped.map((item) => [item.id, item.reason]));
    const final = results.map((result) => {
      const row = valid.find((item) => item.line === result.line);
      if (!row) return result;
      const reason = skipped.get(row.id);
      if (reason) return { ...result, ok: false, reason, willShip: undefined };
      if (!row.ship) return result;
      return { ...result, emailSent: outcome.emails.sent.includes(row.orderNumber) };
    });

    return NextResponse.json({ dryRun: false, results: final.sort((a, b) => a.line - b.line) });
  } catch (error) {
    console.error('Admin tracking import error:', error);
    return NextResponse.json({ error: 'Takip numaraları yüklenemedi.' }, { status: 500 });
  }
}
