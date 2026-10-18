import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { requireRecentAuth } from '@/lib/security/admin-guard';
import { recordAudit } from '@/lib/audit';
import { SETTINGS_ID, readStoreSettings, revalidateStoreSettings, rowToSettings, settingsToRow } from '@/lib/settings/server';
import { SETTINGS_FIELDS, SETTINGS_LABELS, diffSettings, validateSettings, type StoreSettingsValues } from '@/lib/settings/shared';

export const dynamic = 'force-dynamic';

const forbidden = () => NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 403 });

export async function GET(request: Request) {
  const session = await getCurrentUser(request);
  if (!session || session.role !== 'ADMIN') return forbidden();
  try {
    return NextResponse.json({ settings: await readStoreSettings() });
  } catch (error) {
    console.error('Admin settings read error:', error);
    return NextResponse.json({ error: 'Ayarlar okunamadı.' }, { status: 500 });
  }
}

/** Saves the full settings set. `updatedAt` from the form guards against two admins overwriting each other. */
export async function PUT(request: Request) {
  const session = await getCurrentUser(request);
  if (!session || session.role !== 'ADMIN') return forbidden();
  const stepUp = requireRecentAuth(session);
  if (stepUp) return stepUp;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Geçersiz istek.' }, { status: 400 });
  }
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Geçersiz istek.' }, { status: 400 });

  const result = validateSettings(body);
  if (!result.ok) {
    return NextResponse.json({ error: 'Bazı alanlar hatalı.', fieldErrors: result.errors }, { status: 422 });
  }

  try {
    const saved = await prisma.$transaction(async (tx) => {
      const current = rowToSettings(await tx.storeSettings.findUnique({ where: { id: SETTINGS_ID } }));
      const expected = typeof body.updatedAt === 'string' ? body.updatedAt : null;
      if (current.updatedAt !== expected) return { conflict: true as const, current };

      const data = { ...settingsToRow(result.values), updatedById: session.userId };
      const row = await tx.storeSettings.upsert({
        where: { id: SETTINGS_ID },
        create: { id: SETTINGS_ID, ...data },
        update: data,
      });

      const { updatedAt: _unused, ...before } = current;
      const diff = diffSettings(before, result.values);
      const changed = SETTINGS_FIELDS.filter((field) => field in diff).map((field) => SETTINGS_LABELS[field]);
      if (changed.length > 0) {
        await recordAudit(tx, session, {
          action: 'settings.update',
          entity: 'settings',
          entityId: SETTINGS_ID,
          summary: `Ayarlar güncellendi: ${changed.join(', ')}`,
          diff,
        });
      }
      return { conflict: false as const, settings: rowToSettings(row) };
    });

    if (saved.conflict) {
      return NextResponse.json(
        { error: 'Ayarlar siz düzenlerken başka biri tarafından değiştirildi. Güncel hali yüklendi; değişikliklerinizi tekrar uygulayın.', settings: saved.current },
        { status: 409 },
      );
    }

    revalidateStoreSettings();
    return NextResponse.json({ settings: saved.settings });
  } catch (error) {
    console.error('Admin settings save error:', error);
    return NextResponse.json({ error: 'Ayarlar kaydedilemedi. Tekrar deneyin.' }, { status: 500 });
  }
}
