import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/security/admin-guard';
import fs from 'node:fs';
import path from 'node:path';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const guard = await requireAdmin(request);
  if (guard.response) return guard.response;

  try {
    const [products, categories, mediaItems] = await Promise.all([
      prisma.product.findMany({
        select: {
          id: true,
          name: true,
          slug: true,
          priceKurus: true,
          image: true,
          description: true,
          status: true,
          seoTitle: true,
          seoDescription: true,
          excludeFromFeed: true,
        },
      }),
      prisma.category.findMany({
        select: {
          id: true,
          name: true,
          slug: true,
          seoTitle: true,
          seoDescription: true,
        },
      }),
      prisma.productMedia.findMany({
        select: {
          id: true,
          productId: true,
          url: true,
          alt: true,
          product: {
            select: { name: true },
          },
        },
      }),
    ]);

    // 1. Missing Meta
    const missingMeta: Array<{ type: 'product' | 'category'; id: string; name: string; slug: string; reason: string }> = [];

    for (const p of products) {
      const missingTitle = !p.seoTitle || !p.seoTitle.trim();
      const missingDesc = !p.seoDescription || !p.seoDescription.trim();
      if (missingTitle || missingDesc) {
        missingMeta.push({
          type: 'product',
          id: p.id,
          name: p.name,
          slug: p.slug,
          reason: missingTitle && missingDesc ? 'SEO başlığı ve açıklaması girilmemiş' : missingTitle ? 'SEO başlığı girilmemiş' : 'SEO açıklaması girilmemiş',
        });
      }
    }

    for (const c of categories) {
      const missingTitle = !c.seoTitle || !c.seoTitle.trim();
      const missingDesc = !c.seoDescription || !c.seoDescription.trim();
      if (missingTitle || missingDesc) {
        missingMeta.push({
          type: 'category',
          id: c.id,
          name: c.name,
          slug: c.slug,
          reason: missingTitle && missingDesc ? 'Kategori SEO başlığı ve açıklaması girilmemiş' : missingTitle ? 'Kategori SEO başlığı girilmemiş' : 'Kategori SEO açıklaması girilmemiş',
        });
      }
    }

    // 2. Missing Alt Text
    const missingAlt: Array<{ id: string; productId: string; productName: string; url: string }> = [];
    for (const m of mediaItems) {
      if (!m.alt || !m.alt.trim() || m.alt.trim().toLowerCase() === 'product') {
        missingAlt.push({
          id: m.id,
          productId: m.productId,
          productName: m.product?.name || 'Bilinmeyen Ürün',
          url: m.url,
        });
      }
    }

    // 3. Oversized Images (> 500 KB) in public assets
    const oversizedImages: Array<{ path: string; sizeBytes: number; format: string }> = [];
    const publicAssetsDir = path.join(process.cwd(), 'public', 'assets');

    async function scanDir(dir: string) {
      try {
        const entries = await fs.promises.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            await scanDir(fullPath);
          } else if (entry.isFile() && /\.(jpe?g|png|webp|avif|gif)$/i.test(entry.name)) {
            const stat = await fs.promises.stat(fullPath);
            if (stat.size > 500 * 1024) {
              const rel = path.relative(process.cwd(), fullPath).replace(/\\/g, '/');
              oversizedImages.push({
                path: `/${rel.replace(/^public\//, '')}`,
                sizeBytes: stat.size,
                format: path.extname(entry.name).replace('.', ''),
              });
            }
          }
        }
      } catch {
        // Directory scanning error tolerance
      }
    }
    await scanDir(publicAssetsDir);

    // 4. Ineligible Feed Products
    const ineligibleFeedProducts: Array<{ id: string; name: string; slug: string; reasons: string[] }> = [];

    for (const p of products) {
      const reasons: string[] = [];
      if (!p.image || !p.image.trim()) reasons.push('Görsel eksik');
      if (!p.priceKurus || p.priceKurus <= 0) reasons.push('Fiyat 0 veya tanımsız');
      if (!p.description || !p.description.trim()) reasons.push('Ürün açıklaması eksik');
      if (p.status !== 'PUBLISHED') reasons.push('Ürün yayında değil (taslak)');
      if (p.excludeFromFeed) reasons.push('Feedden manuel olarak hariç tutuldu');

      if (reasons.length > 0) {
        ineligibleFeedProducts.push({
          id: p.id,
          name: p.name,
          slug: p.slug,
          reasons,
        });
      }
    }

    return NextResponse.json(
      {
        missingMeta,
        missingAlt,
        oversizedImages,
        ineligibleFeedProducts,
        timestamp: new Date().toISOString(),
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('Admin health report error:', error);
    return NextResponse.json({ error: 'Sağlık raporu oluşturulamadı.' }, { status: 500 });
  }
}
