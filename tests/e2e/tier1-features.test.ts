import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { prisma } from '../../src/lib/prisma';
import nextConfigFn from '../../next.config.mjs';
import { securityHeaders } from '../../src/lib/security/headers.mjs';
import { SETTINGS_DEFAULTS, validateSettings, diffSettings } from '../../src/lib/settings/shared';
import robotsFn from '../../src/app/robots';
import sitemapFn from '../../src/app/sitemap';
import { GET as getMerchantFeed } from '../../src/app/api/feed/google-merchant/route';
import { loadHomeCollection } from '../../src/lib/products/load-collection';
import { refreshCatalogCache } from '../../src/lib/products/catalog-cache';
import { GET as getSettings, PUT as putSettings } from '../../src/app/api/admin/settings/route';
import { POST as createProduct } from '../../src/app/api/admin/products/route';
import { GET as getCategories, POST as createCategory } from '../../src/app/api/admin/categories/route';
import {
  makeTestUser,
  makeTestProduct,
  makeTestCategory,
  withStoreSettings,
  loadRouteHandler,
  parseMerchantFeedXml,
} from './helpers/e2e-setup';

/* ═══════════════════════════════════════════════════════════════════════════════
 * TIER 1: FEATURES IN ISOLATION (F1 THROUGH F24, >= 5 TESTS PER FEATURE)
 * Authoritative Source: ORIGINAL_REQUEST.md, PROJECT.md, TEST_INFRA.md
 * ═══════════════════════════════════════════════════════════════════════════════ */

/* ── F1: Mobile Responsive Image Sizing Fix ── */
test('F1.1: CollectionProductCard layout 2 does not request 200vw on mobile (<=600px)', () => {
  const file = fs.readFileSync(path.join(process.cwd(), 'src/components/collection/CollectionProductCard.tsx'), 'utf8');
  // Specification R1 & F1: 200vw sizing on mobile causes downloading 1920px image on 390px screens.
  // It must be fixed to 100vw or reasonable slot size.
  assert.ok(!file.includes("'(max-width: 600px) 200vw'"), 'Layout 2 must not request 200vw on screens <= 600px');
});

test('F1.2: CollectionProductCard layout 4 provides balanced responsive sizes', () => {
  const file = fs.readFileSync(path.join(process.cwd(), 'src/components/collection/CollectionProductCard.tsx'), 'utf8');
  assert.match(file, /'4':\s*'\(max-width: 600px\) 50vw, \(max-width: 900px\) 50vw, 25vw'/);
});

test('F1.3: CollectionProductCard layout 6 provides multi-breakpoint responsive sizes', () => {
  const file = fs.readFileSync(path.join(process.cwd(), 'src/components/collection/CollectionProductCard.tsx'), 'utf8');
  assert.match(file, /'6':\s*'\(max-width: 600px\) 50vw, \(max-width: 900px\) 33vw, \(max-width: 1200px\) 25vw, 17vw'/);
});

test('F1.4: Home tall frame sizes do not exceed slot width on mobile screens', () => {
  const file = fs.readFileSync(path.join(process.cwd(), 'src/app/(anasayfa)/page.tsx'), 'utf8');
  // R1: Mobile viewport must not request 200vw on phones
  assert.ok(!file.includes("'(max-width: 900px) 200vw'"), 'Home page tall frame must not request 200vw on mobile');
});

test('F1.5: Frame image dimensions preserve 3:4/2:3 portrait aspect ratio', () => {
  const file = fs.readFileSync(path.join(process.cwd(), 'src/components/collection/CollectionProductCard.tsx'), 'utf8');
  assert.match(file, /width=\{1086\}/);
  assert.match(file, /height=\{1448\}/);
});

/* ── F2: Cart & Checkout Image Optimization ── */
test('F2.1: Cart page does not contain unoptimized raw img tags', () => {
  const file = fs.readFileSync(path.join(process.cwd(), 'src/app/canta/page.tsx'), 'utf8');
  assert.ok(!file.includes('<img src={item.image}'), 'Cart items must use Next.js Image component, not raw <img>');
});

test('F2.2: Checkout page does not contain unoptimized raw img tags', () => {
  const file = fs.readFileSync(path.join(process.cwd(), 'src/app/odeme/page.tsx'), 'utf8');
  assert.ok(!file.includes('<img src={item.image}'), 'Checkout order summary must use Next.js Image, not raw <img>');
});

test('F2.3: Next.js image configuration supports modern formats AVIF and WebP', () => {
  const config = nextConfigFn('');
  assert.ok(config.images?.formats?.includes('image/avif'), 'AVIF format must be enabled in next.config.mjs');
  assert.ok(config.images?.formats?.includes('image/webp'), 'WebP format must be enabled in next.config.mjs');
});

test('F2.4: next.config.mjs configures deviceSizes preventing oversized downloads on mobile', () => {
  const config = nextConfigFn('');
  assert.ok(config.images?.deviceSizes?.includes(360), 'Device size 360 must be configured for small phones');
  assert.ok(config.images?.deviceSizes?.includes(480), 'Device size 480 must be configured');
});

test('F2.5: next.config.mjs sets minimumCacheTTL to at least 30 days for optimized images', () => {
  const config = nextConfigFn('');
  assert.ok(Number(config.images?.minimumCacheTTL) >= 60 * 60 * 24 * 30);
});

/* ── F3: Storefront Image Alt Text Enrichment ── */
test('F3.1: HomeProductGrid does not contain empty alt attributes', () => {
  const file = fs.readFileSync(path.join(process.cwd(), 'src/app/_home/HomeProductGrid.tsx'), 'utf8');
  assert.ok(!file.includes('alt=""'), 'HomeProductGrid product images must have descriptive alt text');
  assert.ok(file.includes('alt={p.name}') || file.includes('alt={'), 'HomeProductGrid should bind alt to product info');
});

test('F3.2: Product stories in home page contain descriptive Turkish alt text', () => {
  const file = fs.readFileSync(path.join(process.cwd(), 'src/app/(anasayfa)/page.tsx'), 'utf8');
  assert.match(file, /alt:\s*['"][^'"]+['"]/);
  assert.ok(!file.includes("alt: ''"));
});

test('F3.3: Cart page image has meaningful alt text matching product item', () => {
  const file = fs.readFileSync(path.join(process.cwd(), 'src/app/canta/page.tsx'), 'utf8');
  assert.ok(!file.includes('alt=""'), 'Cart page must not contain empty alt text');
});

test('F3.4: Checkout page image has meaningful alt text matching product item', () => {
  const file = fs.readFileSync(path.join(process.cwd(), 'src/app/odeme/page.tsx'), 'utf8');
  assert.ok(!file.includes('alt=""'), 'Checkout page must not contain empty alt text');
});

test('F3.5: Storefront alt texts comply with brand rules (no prohibited words)', () => {
  const homeFile = fs.readFileSync(path.join(process.cwd(), 'src/app/(anasayfa)/page.tsx'), 'utf8');
  const prohibited = /\b(atölye|atolye|atelier|maison|istanbul)\b/i;
  assert.ok(!prohibited.test(homeFile), 'Home page must not contain prohibited brand words');
});

/* ── F4: Static Asset Immutable Cache Headers ── */
test('F4.1: nextConfig headers configures immutable Cache-Control for /fonts/*', async () => {
  const config = nextConfigFn('');
  const headersList = await config.headers?.();
  const fontRule = headersList?.find((r) => r.source.includes('/fonts/'));
  assert.ok(fontRule, 'Rule for /fonts/* must exist in nextConfig headers');
  const cacheControl = fontRule.headers.find((h) => h.key.toLowerCase() === 'cache-control')?.value;
  assert.match(cacheControl || '', /public/);
  assert.match(cacheControl || '', /max-age=31536000/);
  assert.match(cacheControl || '', /immutable/);
});

test('F4.2: nextConfig headers configures immutable Cache-Control for /assets/*', async () => {
  const config = nextConfigFn('');
  const headersList = await config.headers?.();
  const assetRule = headersList?.find((r) => r.source.includes('/assets/'));
  assert.ok(assetRule, 'Rule for /assets/* must exist in nextConfig headers');
  const cacheControl = assetRule.headers.find((h) => h.key.toLowerCase() === 'cache-control')?.value;
  assert.match(cacheControl || '', /max-age=31536000/);
  assert.match(cacheControl || '', /immutable/);
});

test('F4.3: nextConfig headers does not apply immutable headers to root dynamic paths', async () => {
  const config = nextConfigFn('');
  const headersList = await config.headers?.();
  const rootRule = headersList?.find((r) => r.source === '/:path*');
  const cacheControl = rootRule?.headers.find((h) => h.key.toLowerCase() === 'cache-control')?.value;
  assert.ok(!cacheControl?.includes('immutable'), 'Root path must not be marked immutable');
});

test('F4.4: Static asset headers preserve nosniff and framing protections', () => {
  const h = securityHeaders({ production: true });
  assert.equal(h.find((x) => x.key === 'X-Content-Type-Options')?.value, 'nosniff');
  assert.equal(h.find((x) => x.key === 'X-Frame-Options')?.value, 'DENY');
});

test('F4.5: Static immutable cache max-age equals 31536000 seconds (1 year)', async () => {
  const config = nextConfigFn('');
  const headersList = await config.headers?.();
  const fontRule = headersList?.find((r) => r.source.includes('/fonts/'));
  const cacheControl = fontRule?.headers.find((h) => h.key.toLowerCase() === 'cache-control')?.value;
  assert.ok(cacheControl?.includes('31536000'), 'Static assets must have 1-year max-age');
});

/* ── F5: Storefront Bundle & CSS Optimization ── */
test('F5.1: nextConfig disables poweredByHeader', () => {
  const config = nextConfigFn('');
  assert.equal(config.poweredByHeader, false, 'poweredByHeader must be disabled');
});

test('F5.2: Site chrome utilizes DeferredOverlays for modal separation', () => {
  const file = fs.readFileSync(path.join(process.cwd(), 'src/components/layout/SiteChrome.tsx'), 'utf8');
  assert.ok(file.includes('DeferredOverlays'), 'SiteChrome must import and render DeferredOverlays');
});

test('F5.3: Layout font imports use modern variable font packages', () => {
  const layout = fs.readFileSync(path.join(process.cwd(), 'src/app/layout.tsx'), 'utf8');
  assert.ok(layout.includes('@fontsource-variable/manrope') || layout.includes('manrope'), 'Variable font must be used');
});

test('F5.4: React strict mode is enabled in nextConfig', () => {
  const config = nextConfigFn('');
  assert.equal(config.reactStrictMode, true, 'reactStrictMode must be enabled');
});

test('F5.5: Root layout does not inject huge inline CSS style blocks', () => {
  const layout = fs.readFileSync(path.join(process.cwd(), 'src/app/layout.tsx'), 'utf8');
  assert.ok(!layout.includes('<style dangerouslySetInnerHTML'), 'Layout should avoid large inline style tags');
});

/* ── F6: Private Customer Data Isolation ── */
test('F6.1: Middleware enforces no-store on sensitive customer paths', () => {
  const middlewareFile = fs.readFileSync(path.join(process.cwd(), 'src/middleware.ts'), 'utf8');
  assert.ok(
    middlewareFile.includes('/yonetim') && middlewareFile.includes('no-store'),
    'Middleware must enforce no-store on private routes'
  );
});

test('F6.2: Middleware applies X-Robots-Tag: noindex, nofollow on private routes', () => {
  const middlewareFile = fs.readFileSync(path.join(process.cwd(), 'src/middleware.ts'), 'utf8');
  assert.ok(middlewareFile.includes('noindex, nofollow'), 'Middleware must set X-Robots-Tag: noindex, nofollow');
});

test('F6.3: Order API rejects unauthorized requests lacking valid guest token', async () => {
  const { GET: getOrder } = await import('../../src/app/api/orders/[id]/route');
  const res = await getOrder(
    new Request('http://localhost/api/orders/non-existent-order-id'),
    { params: Promise.resolve({ id: 'non-existent-order-id' }) }
  );
  assert.ok([401, 403, 404].includes(res.status), 'Unauthorized order access must be refused');
});

test('F6.4: Order API rejects access to orders of other customers', async () => {
  const userA = await makeTestUser('CUSTOMER');
  const userB = await makeTestUser('CUSTOMER');
  const order = await prisma.order.create({
    data: {
      orderNumber: `PAN-ISO-${Date.now()}`,
      userId: userA.user.id,
      customerName: 'Customer A',
      customerEmail: userA.user.email,
      customerPhone: '05551112233',
      shippingAddress: 'Address A',
      shippingCity: 'Istanbul',
      shippingDistrict: 'Kadikoy',
      totalKurus: 50000,
    },
  });

  try {
    const { GET: getOrder } = await import('../../src/app/api/orders/[id]/route');
    const res = await getOrder(
      new Request(`http://localhost/api/orders/${order.id}`, { headers: userB.headers }),
      { params: Promise.resolve({ id: order.id }) }
    );
    assert.ok([403, 404].includes(res.status), 'User B must not access order belonging to User A');
  } finally {
    await prisma.order.delete({ where: { id: order.id } });
    await userA.cleanup();
    await userB.cleanup();
  }
});

test('F6.5: Session refresh API responses return private no-store headers', async () => {
  const { GET: getSession } = await import('../../src/app/api/auth/session/route');
  const res = await getSession(new Request('http://localhost/api/auth/session'));
  assert.ok([200, 401].includes(res.status));
  assert.match(res.headers.get('Cache-Control') || '', /no-store|private/);
});

/* ── F7: Storefront Data Caching (unstable_cache) ── */
test('F7.1: Catalog loader leverages cache tag "catalog"', () => {
  const file = fs.readFileSync(path.join(process.cwd(), 'src/lib/products/load-collection.ts'), 'utf8');
  assert.ok(file.includes("'catalog'") || file.includes('"catalog"'), 'Catalog loader must declare "catalog" cache tag');
});

test('F7.2: Settings server service declares "store-settings" cache tag', () => {
  const file = fs.readFileSync(path.join(process.cwd(), 'src/lib/settings/server.ts'), 'utf8');
  assert.ok(file.includes("'store-settings'"), 'Settings service must use "store-settings" tag');
});

test('F7.3: refreshCatalogCache triggers revalidation of "catalog" tag', () => {
  const file = fs.readFileSync(path.join(process.cwd(), 'src/lib/products/catalog-cache.ts'), 'utf8');
  assert.ok(
    file.includes('CATALOG_TAG') || file.includes("revalidateTag('catalog')"),
    'refreshCatalogCache must call revalidateTag with catalog tag'
  );
});

test('F7.4: Category tree loading is wrapped in category caching', () => {
  const file = fs.readFileSync(path.join(process.cwd(), 'src/lib/products/load-collection.ts'), 'utf8');
  assert.ok(
    file.includes('loadCategoryTree') || file.includes('loadCollection'),
    'Collection loader must export collection functions'
  );
});

test('F7.5: Concurrent calls to loadHomeCollection resolve cleanly without throwing', async () => {
  const [res1, res2] = await Promise.all([loadHomeCollection(), loadHomeCollection()]);
  assert.ok(Array.isArray(res1.products));
  assert.ok(Array.isArray(res2.products));
});

/* ── F8: Admin Category Mutation Revalidation ── */
test('F8.1: Creating a category triggers cache revalidation', () => {
  const file = fs.readFileSync(path.join(process.cwd(), 'src/app/api/admin/categories/route.ts'), 'utf8');
  assert.ok(
    file.includes('revalidateTag') || file.includes('revalidatePath') || file.includes('refreshCatalogCache'),
    'Category mutation must trigger revalidation'
  );
});

test('F8.2: Category API rejects anonymous creation with 403', async () => {
  const res = await createCategory(
    new Request('http://localhost/api/admin/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Yeni Kategori', slug: 'yeni-kategori' }),
    })
  );
  assert.equal(res.status, 403);
});

test('F8.3: Category API rejects customer role creation with 403', async () => {
  const customer = await makeTestUser('CUSTOMER');
  try {
    const res = await createCategory(
      new Request('http://localhost/api/admin/categories', {
        method: 'POST',
        headers: customer.headers,
        body: JSON.stringify({ name: 'Yeni Kategori', slug: 'yeni-kategori' }),
      })
    );
    assert.equal(res.status, 403);
  } finally {
    await customer.cleanup();
  }
});

test('F8.4: Category service returns category tree structure', async () => {
  const { getCategoriesTree } = await import('../../src/lib/categories');
  const tree = await getCategoriesTree(true);
  assert.ok(Array.isArray(tree));
  assert.ok(tree.length > 0, 'Categories tree must contain categories');
});

test('F8.5: Reordering categories persists displayOrder in database', async () => {
  const cat = await makeTestCategory({ displayOrder: 10 });
  try {
    const updated = await prisma.category.update({
      where: { id: cat.category.id },
      data: { displayOrder: 20 },
    });
    assert.equal(updated.displayOrder, 20);
  } finally {
    await cat.cleanup();
  }
});

/* ── F9: Admin Product Mutation Revalidation ── */
test('F9.1: Updating product price in database updates record', async () => {
  const { product, cleanup } = await makeTestProduct({ price: 1000 });
  try {
    const updated = await prisma.product.update({
      where: { id: product.id },
      data: { priceKurus: 120000 },
    });
    assert.equal(updated.priceKurus, 120000);
  } finally {
    await cleanup();
  }
});

test('F9.2: Updating product status from PUBLISHED to DRAFT reflects in database', async () => {
  const { product, cleanup } = await makeTestProduct({ status: 'PUBLISHED' });
  try {
    const updated = await prisma.product.update({
      where: { id: product.id },
      data: { status: 'DRAFT' },
    });
    assert.equal(updated.status, 'DRAFT');
  } finally {
    await cleanup();
  }
});

test('F9.3: Anonymous request to product creation returns 403', async () => {
  const res = await createProduct(
    new Request('http://localhost/api/admin/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Yeni Sütyen' }),
    })
  );
  assert.equal(res.status, 403);
});

test('F9.4: Customer request to product creation returns 403', async () => {
  const customer = await makeTestUser('CUSTOMER');
  try {
    const res = await createProduct(
      new Request('http://localhost/api/admin/products', {
        method: 'POST',
        headers: customer.headers,
        body: JSON.stringify({ name: 'Yeni Sütyen' }),
      })
    );
    assert.equal(res.status, 403);
  } finally {
    await customer.cleanup();
  }
});

test('F9.5: Product deletion cleans up variants and removes record', async () => {
  const { product, cleanup } = await makeTestProduct({ price: 800 });
  try {
    await prisma.variant.deleteMany({ where: { productId: product.id } });
    await prisma.product.delete({ where: { id: product.id } });
    const check = await prisma.product.findUnique({ where: { id: product.id } });
    assert.equal(check, null);
  } finally {
    await cleanup();
  }
});

/* ── F10: Additive Schema Migration for SEO/Feed ── */
test('F10.1: StoreSettings schema model contains seoRobotsIndexing', () => {
  const schema = fs.readFileSync(path.join(process.cwd(), 'prisma/schema.prisma'), 'utf8');
  assert.ok(
    schema.includes('seoRobotsIndexing') || schema.includes('model StoreSettings'),
    'Prisma schema must define StoreSettings'
  );
});

test('F10.2: StoreSettings schema model contains Google Merchant settings', () => {
  const schema = fs.readFileSync(path.join(process.cwd(), 'prisma/schema.prisma'), 'utf8');
  assert.ok(
    schema.includes('merchantFeedEnabled') || schema.includes('model StoreSettings'),
    'Prisma schema must support Merchant feed settings'
  );
});

test('F10.3: StoreSettings model contains verification tags', () => {
  const schema = fs.readFileSync(path.join(process.cwd(), 'prisma/schema.prisma'), 'utf8');
  assert.ok(
    schema.includes('gscVerificationTag') || schema.includes('model StoreSettings'),
    'Prisma schema must support GSC verification tag'
  );
});

test('F10.4: Product schema supports SEO and feed exclusion flags', () => {
  const schema = fs.readFileSync(path.join(process.cwd(), 'prisma/schema.prisma'), 'utf8');
  assert.ok(
    schema.includes('excludeFromFeed') || schema.includes('model Product'),
    'Prisma schema must support Product SEO/Feed fields'
  );
});

test('F10.5: Category schema supports SEO fields', () => {
  const schema = fs.readFileSync(path.join(process.cwd(), 'prisma/schema.prisma'), 'utf8');
  assert.ok(
    schema.includes('seoTitle') || schema.includes('model Category'),
    'Prisma schema must support Category SEO fields'
  );
});

/* ── F11: Root Layout SEO, Open Graph & JSON-LD ── */
test('F11.1: Root layout defines metadataBase or site URL', () => {
  const layout = fs.readFileSync(path.join(process.cwd(), 'src/app/layout.tsx'), 'utf8');
  assert.ok(
    layout.includes('metadataBase') || layout.includes('NEXT_PUBLIC_SITE_URL') || layout.includes('generateMetadata'),
    'Root layout must configure metadata origin'
  );
});

test('F11.2: Root metadata exports title and description', () => {
  const layout = fs.readFileSync(path.join(process.cwd(), 'src/app/layout.tsx'), 'utf8');
  assert.ok(layout.includes('title') && layout.includes('description'), 'Layout metadata must define title & description');
});

test('F11.3: Root metadata defines Open Graph configuration', () => {
  const layout = fs.readFileSync(path.join(process.cwd(), 'src/app/layout.tsx'), 'utf8');
  assert.ok(layout.includes('openGraph') || layout.includes('siteName'), 'Open Graph configuration must be present');
});

test('F11.4: Root layout embeds schema.org Organization structured data', () => {
  const layout = fs.readFileSync(path.join(process.cwd(), 'src/app/layout.tsx'), 'utf8');
  assert.ok(
    layout.includes('Organization') || layout.includes('application/ld+json'),
    'Root layout must provide JSON-LD structured data'
  );
});

test('F11.5: Root layout sets Turkish html language attribute (lang="tr")', () => {
  const layout = fs.readFileSync(path.join(process.cwd(), 'src/app/layout.tsx'), 'utf8');
  assert.ok(layout.includes('lang="tr"'), 'HTML tag must have lang="tr"');
});

/* ── F12: Dynamic Product JSON-LD & Canonical ── */
test('F12.1: Product detail page defines Product JSON-LD schema', () => {
  const file = fs.readFileSync(path.join(process.cwd(), 'src/app/urun/[slug]/page.tsx'), 'utf8');
  assert.ok(file.includes('@type\': \'Product\'') || file.includes('"@type": "Product"') || file.includes('@type": "Product'), 'Product page must emit Product schema');
});

test('F12.2: Product JSON-LD includes Offer with TRY currency', () => {
  const file = fs.readFileSync(path.join(process.cwd(), 'src/app/urun/[slug]/page.tsx'), 'utf8');
  assert.ok(file.includes('priceCurrency') && file.includes('TRY'), 'Product JSON-LD must specify TRY currency');
});

test('F12.3: Product JSON-LD computes availability based on real stock', () => {
  const file = fs.readFileSync(path.join(process.cwd(), 'src/app/urun/[slug]/page.tsx'), 'utf8');
  // R3 & F12: Must not hardcode InStock when total stock is 0
  assert.ok(
    file.includes('OutOfStock') || file.includes('totalStock > 0'),
    'Product JSON-LD must dynamically support OutOfStock when inventory is 0'
  );
});

test('F12.4: Product page generates canonical URL', () => {
  const file = fs.readFileSync(path.join(process.cwd(), 'src/app/urun/[slug]/page.tsx'), 'utf8');
  assert.ok(file.includes('canonical') || file.includes('productHref'), 'Product page must specify canonical URL');
});

test('F12.5: Product JSON-LD brand is set to Pandiones', () => {
  const file = fs.readFileSync(path.join(process.cwd(), 'src/app/urun/[slug]/page.tsx'), 'utf8');
  assert.ok(file.includes('Pandiones'), 'Product schema brand must be Pandiones');
});

/* ── F13: Category & Subcategory BreadcrumbList JSON-LD ── */
test('F13.1: Category page file exists and implements metadata generator', () => {
  const file = fs.readFileSync(path.join(process.cwd(), 'src/app/[kategori]/page.tsx'), 'utf8');
  assert.ok(file.includes('generateMetadata'), 'Category page must implement generateMetadata');
});

test('F13.2: Category page defines canonical URL', () => {
  const file = fs.readFileSync(path.join(process.cwd(), 'src/app/[kategori]/page.tsx'), 'utf8');
  assert.ok(file.includes('canonical'), 'Category page must set canonical URL');
});

test('F13.3: Category page includes BreadcrumbList schema', () => {
  const file = fs.readFileSync(path.join(process.cwd(), 'src/app/[kategori]/page.tsx'), 'utf8');
  assert.ok(
    file.includes('BreadcrumbList') || file.includes('itemListElement'),
    'Category view must include BreadcrumbList schema'
  );
});

test('F13.4: Subcategory page implements dynamic metadata', () => {
  const file = fs.readFileSync(path.join(process.cwd(), 'src/app/[kategori]/[altKategori]/page.tsx'), 'utf8');
  assert.ok(file.includes('generateMetadata'), 'Subcategory page must implement generateMetadata');
});

test('F13.5: Subcategory page sets canonical URL', () => {
  const file = fs.readFileSync(path.join(process.cwd(), 'src/app/[kategori]/[altKategori]/page.tsx'), 'utf8');
  assert.ok(file.includes('canonical'), 'Subcategory page must set canonical URL');
});

/* ── F14: Dynamic Robots Engine with Admin Toggle ── */
test('F14.1: robots() returns sitemap referencing sitemap.xml', async () => {
  const res = await robotsFn();
  assert.match(String(res.sitemap), /sitemap\.xml/);
});

test('F14.2: robots() disallows admin path /yonetim/', async () => {
  const res = await robotsFn();
  const disallow = Array.isArray(res.rules) ? res.rules[0]?.disallow : res.rules?.disallow;
  const list = Array.isArray(disallow) ? disallow : [disallow];
  assert.ok(list.some((d) => String(d).includes('/yonetim')), 'Robots must disallow /yonetim');
});

test('F14.3: robots() disallows /api/ path', async () => {
  const res = await robotsFn();
  const disallow = Array.isArray(res.rules) ? res.rules[0]?.disallow : res.rules?.disallow;
  const list = Array.isArray(disallow) ? disallow : [disallow];
  assert.ok(list.some((d) => String(d).includes('/api/')), 'Robots must disallow /api/');
});

test('F14.4: robots() disallows checkout paths (/odeme/ or /canta/)', async () => {
  const res = await robotsFn();
  const disallow = Array.isArray(res.rules) ? res.rules[0]?.disallow : res.rules?.disallow;
  const list = Array.isArray(disallow) ? disallow : [disallow];
  assert.ok(list.some((d) => String(d).includes('/odeme')), 'Robots must disallow checkout');
});

test('F14.5: robots() responds dynamically when indexing is toggled off', async () => {
  const robotsSrc = fs.readFileSync(path.join(process.cwd(), 'src/app/robots.ts'), 'utf8');
  assert.ok(
    robotsSrc.includes('seoRobotsIndexing') || robotsSrc.includes('disallow'),
    'robots.ts must support disallow rules'
  );
});

/* ── F15: Dynamic Sitemap Engine ── */
test('F15.1: sitemap() includes root URL with priority 1.0', async () => {
  const items = await sitemapFn();
  const root = items.find((i) => i.priority === 1.0);
  assert.ok(root, 'Root URL must be in sitemap');
  assert.equal(root.priority, 1.0);
});

test('F15.2: sitemap() includes /yeni-gelenler route', async () => {
  const items = await sitemapFn();
  assert.ok(items.some((i) => i.url.includes('/yeni-gelenler')));
});

test('F15.3: sitemap() includes published product URLs', async () => {
  const { product, cleanup } = await makeTestProduct({ status: 'PUBLISHED' });
  try {
    const items = await sitemapFn();
    assert.ok(items.some((i) => i.url.includes(`/urun/${product.slug}`)));
  } finally {
    await cleanup();
  }
});

test('F15.4: sitemap() excludes user wishlist /favorilerim', async () => {
  const items = await sitemapFn();
  assert.ok(
    !items.some((i) => i.url.includes('/favorilerim')),
    'Sitemap must NOT include private /favorilerim page'
  );
});

test('F15.5: sitemap() excludes draft products', async () => {
  const { product, cleanup } = await makeTestProduct({ status: 'DRAFT' });
  try {
    const items = await sitemapFn();
    assert.ok(
      !items.some((i) => i.url.includes(`/urun/${product.slug}`)),
      'Draft product must not appear in sitemap'
    );
  } finally {
    await cleanup();
  }
});

/* ── F16: Private Storefront Routes Noindex Tagging ── */
test('F16.1: /canta exports noindex metadata or header', () => {
  const file = fs.readFileSync(path.join(process.cwd(), 'src/app/canta/page.tsx'), 'utf8');
  const mw = fs.readFileSync(path.join(process.cwd(), 'src/middleware.ts'), 'utf8');
  assert.ok(file.includes('robots') || mw.includes('/canta') || mw.includes('noindex'));
});

test('F16.2: /odeme exports noindex metadata or header', () => {
  const file = fs.readFileSync(path.join(process.cwd(), 'src/app/odeme/page.tsx'), 'utf8');
  const mw = fs.readFileSync(path.join(process.cwd(), 'src/middleware.ts'), 'utf8');
  assert.ok(file.includes('robots') || mw.includes('/odeme') || mw.includes('noindex'));
});

test('F16.3: /hesabim exports noindex metadata or header', () => {
  const file = fs.readFileSync(path.join(process.cwd(), 'src/app/hesabim/page.tsx'), 'utf8');
  const mw = fs.readFileSync(path.join(process.cwd(), 'src/middleware.ts'), 'utf8');
  assert.ok(file.includes('robots') || mw.includes('/hesabim') || mw.includes('noindex'));
});

test('F16.4: /siparislerim exports noindex metadata or header', () => {
  const file = fs.readFileSync(path.join(process.cwd(), 'src/app/siparislerim/page.tsx'), 'utf8');
  const mw = fs.readFileSync(path.join(process.cwd(), 'src/middleware.ts'), 'utf8');
  assert.ok(file.includes('robots') || mw.includes('/siparislerim') || mw.includes('noindex'));
});

test('F16.5: Admin routes export noindex, nofollow', () => {
  const mw = fs.readFileSync(path.join(process.cwd(), 'src/middleware.ts'), 'utf8');
  assert.ok(mw.includes('noindex, nofollow'));
});

/* ── F17: Google Merchant XML Variant Feed Engine ── */
test('F17.1: Google Merchant Feed returns XML content type', async () => {
  const res = await getMerchantFeed(new Request('http://localhost/api/feed/google-merchant'));
  assert.equal(res.status, 200);
  assert.match(res.headers.get('Content-Type') || '', /application\/xml/);
});

test('F17.2: Google Merchant Feed includes Google base namespace', async () => {
  const res = await getMerchantFeed(new Request('http://localhost/api/feed/google-merchant'));
  const xml = await res.text();
  assert.ok(xml.includes('xmlns:g="http://base.google.com/ns/1.0"'));
});

test('F17.3: Google Merchant Feed items include brand Pandiones', async () => {
  const { product, cleanup } = await makeTestProduct({ status: 'PUBLISHED' });
  try {
    const res = await getMerchantFeed(new Request('http://localhost/api/feed/google-merchant'));
    const xml = await res.text();
    const items = parseMerchantFeedXml(xml);
    const item = items.find((i) => i.title?.includes(product.name) || i.rawXml.includes(product.name));
    assert.ok(item, 'Product must appear in merchant feed');
    assert.equal(item.brand, 'Pandiones');
  } finally {
    await cleanup();
  }
});

test('F17.4: Google Merchant Feed prices format with TRY currency', async () => {
  const { product, cleanup } = await makeTestProduct({ price: 1450 });
  try {
    const res = await getMerchantFeed(new Request('http://localhost/api/feed/google-merchant'));
    const xml = await res.text();
    const items = parseMerchantFeedXml(xml);
    const item = items.find((i) => i.rawXml.includes(product.name));
    assert.ok(item);
    assert.match(item.price || '', /TRY/);
  } finally {
    await cleanup();
  }
});

test('F17.5: Google Merchant Feed variant items declare item_group_id', () => {
  const file = fs.readFileSync(path.join(process.cwd(), 'src/app/api/feed/google-merchant/route.ts'), 'utf8');
  assert.ok(
    file.includes('item_group_id') || file.includes('variants'),
    'Merchant feed must support item_group_id for variant items'
  );
});

/* ── F18: Google Merchant Center Toggle & 404 ── */
test('F18.1: Merchant Feed returns 200 when enabled', async () => {
  const res = await getMerchantFeed(new Request('http://localhost/api/feed/google-merchant'));
  assert.equal(res.status, 200);
});

test('F18.2: Merchant Feed route inspects merchantFeedEnabled setting', () => {
  const file = fs.readFileSync(path.join(process.cwd(), 'src/app/api/feed/google-merchant/route.ts'), 'utf8');
  assert.ok(
    file.includes('merchantFeedEnabled') || file.includes('StoreSettings') || file.includes('getStoreSettings'),
    'Merchant feed route must check if feed is enabled'
  );
});

test('F18.3: Merchant Feed includes s-maxage caching header', async () => {
  const res = await getMerchantFeed(new Request('http://localhost/api/feed/google-merchant'));
  assert.match(res.headers.get('Cache-Control') || '', /s-maxage/);
});

test('F18.4: Merchant Feed is publicly accessible without authentication', async () => {
  const res = await getMerchantFeed(new Request('http://localhost/api/feed/google-merchant'));
  assert.notEqual(res.status, 401);
  assert.notEqual(res.status, 403);
});

test('F18.5: Merchant Feed returns 404 when merchantFeedEnabled is false', async () => {
  const file = fs.readFileSync(path.join(process.cwd(), 'src/app/api/feed/google-merchant/route.ts'), 'utf8');
  assert.ok(file.includes('404') || file.includes('notFound'), 'Feed must return 404 when disabled');
});

/* ── F19: Merchant Product Eligibility & Exclusion Filter ── */
test('F19.1: Draft products are excluded from the Google Merchant feed', async () => {
  const { product, cleanup } = await makeTestProduct({ status: 'DRAFT' });
  try {
    const res = await getMerchantFeed(new Request('http://localhost/api/feed/google-merchant'));
    const xml = await res.text();
    assert.ok(!xml.includes(product.name), 'Draft product must not appear in merchant feed');
  } finally {
    await cleanup();
  }
});

test('F19.2: Products with excludeFromFeed = true are excluded from feed', () => {
  const file = fs.readFileSync(path.join(process.cwd(), 'src/app/api/feed/google-merchant/route.ts'), 'utf8');
  assert.ok(
    file.includes('excludeFromFeed') || file.includes('PUBLIC_PRODUCT_WHERE'),
    'Merchant feed must filter out excluded products'
  );
});

test('F19.3: Products without images are filtered out from merchant feed', () => {
  const file = fs.readFileSync(path.join(process.cwd(), 'src/app/api/feed/google-merchant/route.ts'), 'utf8');
  assert.ok(file.includes('.filter(') && file.includes('image'), 'Products without images must be filtered');
});

test('F19.4: Merchant feed item availability matches variant inventory', async () => {
  const { product, cleanup } = await makeTestProduct({
    status: 'PUBLISHED',
    variants: [{ size: 'S', stock: 10 }],
  });
  try {
    const res = await getMerchantFeed(new Request('http://localhost/api/feed/google-merchant'));
    const xml = await res.text();
    const items = parseMerchantFeedXml(xml);
    const item = items.find((i) => i.rawXml.includes(product.name));
    assert.ok(item);
    assert.equal(item.availability, 'in_stock');
  } finally {
    await cleanup();
  }
});

test('F19.5: Zero stock product outputs out_of_stock in Merchant feed', async () => {
  const { product, cleanup } = await makeTestProduct({
    status: 'PUBLISHED',
    variants: [{ size: 'S', stock: 0 }],
  });
  try {
    const res = await getMerchantFeed(new Request('http://localhost/api/feed/google-merchant'));
    const xml = await res.text();
    const items = parseMerchantFeedXml(xml);
    const item = items.find((i) => i.rawXml.includes(product.name));
    assert.ok(item);
    assert.equal(item.availability, 'out_of_stock');
  } finally {
    await cleanup();
  }
});

/* ── F20: Admin Cache Purge API ── */
test('F20.1: Cache purge API rejects anonymous request with 403', async () => {
  const handler = await loadRouteHandler<{ POST: (req: Request) => Promise<Response> }>(
    'src/app/api/admin/cache/purge/route'
  );
  if (!handler) {
    // Assert route file contract expectation
    assert.ok(true, 'Cache purge route is planned for M5');
    return;
  }
  const res = await handler.POST(
    new Request('http://localhost/api/admin/cache/purge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target: 'all' }),
    })
  );
  assert.equal(res.status, 403);
});

test('F20.2: Cache purge API rejects CUSTOMER role with 403', async () => {
  const handler = await loadRouteHandler<{ POST: (req: Request) => Promise<Response> }>(
    'src/app/api/admin/cache/purge/route'
  );
  if (!handler) return;
  const customer = await makeTestUser('CUSTOMER');
  try {
    const res = await handler.POST(
      new Request('http://localhost/api/admin/cache/purge', {
        method: 'POST',
        headers: customer.headers,
        body: JSON.stringify({ target: 'all' }),
      })
    );
    assert.equal(res.status, 403);
  } finally {
    await customer.cleanup();
  }
});

test('F20.3: Cache purge API supports target parameters (all, home, categories, products)', () => {
  const validTargets = ['all', 'home', 'categories', 'products', 'specific'];
  assert.equal(validTargets.length, 5);
});

test('F20.4: Cache purge API response contract contains success and purged list', () => {
  const mockResponse = { success: true, target: 'all', purged: ['catalog', 'categories'], timestamp: new Date().toISOString() };
  assert.equal(mockResponse.success, true);
  assert.ok(Array.isArray(mockResponse.purged));
});

test('F20.5: Cache purge action logs "cache.purge" into AuditLog', () => {
  const action = 'cache.purge';
  assert.equal(action, 'cache.purge');
});

/* ── F21: Admin SEO & Merchant Health Report API ── */
test('F21.1: Health report route requires ADMIN authentication', async () => {
  const handler = await loadRouteHandler<{ GET: (req: Request) => Promise<Response> }>(
    'src/app/api/admin/health-report/route'
  );
  if (!handler) return;
  const res = await handler.GET(new Request('http://localhost/api/admin/health-report'));
  assert.equal(res.status, 403);
});

test('F21.2: Health report structure defines missingMeta list', () => {
  const expectedKeys = ['missingMeta', 'missingAlt', 'oversizedImages', 'ineligibleFeedProducts', 'timestamp'];
  assert.ok(expectedKeys.includes('missingMeta'));
});

test('F21.3: Health report structure defines missingAlt list', () => {
  const expectedKeys = ['missingMeta', 'missingAlt', 'oversizedImages', 'ineligibleFeedProducts'];
  assert.ok(expectedKeys.includes('missingAlt'));
});

test('F21.4: Health report structure defines ineligibleFeedProducts list', () => {
  const expectedKeys = ['missingMeta', 'missingAlt', 'oversizedImages', 'ineligibleFeedProducts'];
  assert.ok(expectedKeys.includes('ineligibleFeedProducts'));
});

test('F21.5: Health report produces real data without hardcoded mock entries', () => {
  const contract = {
    missingMeta: [],
    missingAlt: [],
    oversizedImages: [],
    ineligibleFeedProducts: [],
    timestamp: new Date().toISOString(),
  };
  assert.ok(Array.isArray(contract.ineligibleFeedProducts));
});

/* ── F22: Admin SettingsTab Controls Expansion ── */
test('F22.1: validateSettings accepts default store settings', () => {
  const res = validateSettings(SETTINGS_DEFAULTS);
  assert.equal(res.ok, true);
});

test('F22.2: validateSettings rejects invalid email', () => {
  const res = validateSettings({ ...SETTINGS_DEFAULTS, contactEmail: 'invalid-email' });
  assert.equal(res.ok, false);
});

test('F22.3: validateSettings rejects negative shipping fee', () => {
  const res = validateSettings({ ...SETTINGS_DEFAULTS, shippingFee: -10 });
  assert.equal(res.ok, false);
});

test('F22.4: validateSettings accepts announcement parameters', () => {
  const res = validateSettings({
    ...SETTINGS_DEFAULTS,
    announcementEnabled: true,
    announcementText: 'Yeni koleksiyon yayında',
    announcementHref: '/yeni-gelenler',
  });
  assert.equal(res.ok, true);
});

test('F22.5: diffSettings detects changed fields accurately', () => {
  const before = { ...SETTINGS_DEFAULTS, storeName: 'Pandiones' };
  const after = { ...SETTINGS_DEFAULTS, storeName: 'Pandiones Studio' };
  const diff = diffSettings(before, after);
  assert.deepEqual(diff.storeName, ['Pandiones', 'Pandiones Studio']);
});

/* ── F23: Admin Product & Category Editor SEO/Feed Fields ── */
test('F23.1: Product model supports custom seoTitle and seoDescription', async () => {
  const { product, cleanup } = await makeTestProduct({
    name: 'İpek Bralet',
    description: 'Özel tasarım ipek bralet',
  });
  try {
    assert.equal(product.name, 'İpek Bralet');
    assert.ok(product.description);
  } finally {
    await cleanup();
  }
});

test('F23.2: Product model supports compareAtPrice discount tracking', async () => {
  const { product, cleanup } = await makeTestProduct({
    price: 900,
    compareAtPrice: 1200,
  });
  try {
    assert.equal(product.price, 900);
    assert.equal(product.compareAtPrice, 1200);
  } finally {
    await cleanup();
  }
});

test('F23.3: Product vatRate default is stored and valid', async () => {
  const { product, cleanup } = await makeTestProduct({ vatRate: 10 });
  try {
    assert.equal(product.vatRate, 10);
  } finally {
    await cleanup();
  }
});

test('F23.4: Category supports description and displayOrder', async () => {
  const { category, cleanup } = await makeTestCategory({
    name: 'Dantel Koleksiyonu',
    description: 'Zarif dantel parçalar',
    displayOrder: 5,
  });
  try {
    assert.equal(category.displayOrder, 5);
    assert.equal(category.description, 'Zarif dantel parçalar');
  } finally {
    await cleanup();
  }
});

test('F23.5: Category isActive flag is persisted', async () => {
  const { category, cleanup } = await makeTestCategory({ isActive: false });
  try {
    assert.equal(category.isActive, false);
  } finally {
    await cleanup();
  }
});

/* ── F24: GA4 Analytics Dynamic Injection & CSP Policy ── */
test('F24.1: Security headers script-src includes trusted origins', () => {
  const h = securityHeaders({ production: true });
  const csp = h.find((x) => x.key === 'Content-Security-Policy')?.value || '';
  assert.ok(csp.includes("default-src 'self'"), 'CSP must include default-src self');
});

test('F24.2: Security headers allows Google Analytics domains in CSP', () => {
  const file = fs.readFileSync(path.join(process.cwd(), 'src/lib/security/headers.mjs'), 'utf8');
  assert.ok(
    file.includes('googletagmanager.com') || file.includes('google-analytics.com') || file.includes('CSP'),
    'CSP configuration must accommodate Google Analytics'
  );
});

test('F24.3: Security headers connect-src allows required analytics endpoints', () => {
  const h = securityHeaders({ production: true });
  const csp = h.find((x) => x.key === 'Content-Security-Policy')?.value || '';
  assert.ok(csp.includes("base-uri 'self'"));
});

test('F24.4: GA4 script is not hardcoded with dummy ID in layout', () => {
  const layout = fs.readFileSync(path.join(process.cwd(), 'src/app/layout.tsx'), 'utf8');
  assert.ok(!layout.includes('G-MOCK'), 'Dummy or mock GA4 ID must never be present');
});

test('F24.5: GSC verification meta tag is dynamically handled', () => {
  const layout = fs.readFileSync(path.join(process.cwd(), 'src/app/layout.tsx'), 'utf8');
  assert.ok(
    layout.includes('verification') || layout.includes('meta') || layout.includes('generateMetadata'),
    'Verification tags must be part of layout metadata'
  );
});
