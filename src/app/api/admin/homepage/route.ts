import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { requireRecentAuth } from '@/lib/security/admin-guard';
import { recordAudit } from '@/lib/audit';
import { HOMEPAGE_CONFIG_ID, parseHomePageRow, readHomePageConfig, revalidateHomePage } from '@/lib/homepage/server';
import { diffHomePageConfig, validateHomePageConfig, type HomePageConfig } from '@/lib/homepage/shared';

export const dynamic = 'force-dynamic';

const forbidden = () => NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 403 });

export async function GET(request: Request) {
  const session = await getCurrentUser(request);
  if (!session || session.role !== 'ADMIN') return forbidden();

  try {
    const [config, products] = await Promise.all([
      readHomePageConfig(),
      prisma.product.findMany({
        where: { status: 'PUBLISHED' },
        select: { id: true, slug: true, name: true, color: true, image: true },
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    return NextResponse.json({ config, products });
  } catch (error) {
    console.error('Admin homepage read error:', error);
    return NextResponse.json({ error: 'Anasayfa ayarları okunamadı.' }, { status: 500 });
  }
}

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

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Geçersiz istek.' }, { status: 400 });
  }

  const result = validateHomePageConfig(body);
  if (!result.ok) {
    return NextResponse.json({ error: 'Bazı alanlar hatalı.', fieldErrors: result.errors }, { status: 422 });
  }

  try {
    const current = await readHomePageConfig();
    const expected = typeof body.updatedAt === 'string' ? body.updatedAt : null;
    if (current.updatedAt && expected && current.updatedAt !== expected) {
      return NextResponse.json(
        {
          error: 'Anasayfa siz düzenlerken başka bir oturum tarafından güncellendi. Güncel veriler yüklendi; lütfen kontrol ederek tekrar kaydedin.',
          config: current,
        },
        { status: 409 },
      );
    }

    const jsonPayload = JSON.stringify(result.values);

    const rows = await prisma.$queryRaw<
      Array<{ id: string; data: string; updatedAt: Date; updatedById: string | null }>
    >`
      INSERT INTO "HomePageConfig" ("id", "data", "updatedAt", "updatedById")
      VALUES (${HOMEPAGE_CONFIG_ID}, ${jsonPayload}, NOW(), ${session.userId})
      ON CONFLICT ("id") DO UPDATE SET
        "data" = EXCLUDED."data",
        "updatedAt" = NOW(),
        "updatedById" = EXCLUDED."updatedById"
      RETURNING "id", "data", "updatedAt", "updatedById"
    `;

    const savedRow = rows[0];
    const savedConfig = parseHomePageRow(savedRow);

    const diff = diffHomePageConfig(current, result.values);
    if (Object.keys(diff).length > 0) {
      await recordAudit(prisma, session, {
        action: 'homepage.update',
        entity: 'homepage',
        entityId: HOMEPAGE_CONFIG_ID,
        summary: `Anasayfa vitrini güncellendi: ${Object.keys(diff).join(', ')}`,
        diff,
      });
    }

    revalidateHomePage();
    return NextResponse.json({ config: savedConfig });
  } catch (error) {
    console.error('Admin homepage save error:', error);
    return NextResponse.json({ error: 'Anasayfa ayarları kaydedilemedi. Tekrar deneyin.' }, { status: 500 });
  }
}
