import assert from 'node:assert/strict';
import test from 'node:test';
import { addRootCategories, createProductTestDb } from './helpers/product-test-db';
import { bulkUpdateProducts, duplicateProduct, listAdminProducts, unpublishProduct } from '../src/lib/admin/product-catalog';
import { POST as bulkRoute } from '../src/app/api/admin/products/bulk/route';
import { POST as duplicateRoute } from '../src/app/api/admin/products/[id]/duplicate/route';
import { POST as unpublishRoute } from '../src/app/api/admin/products/[id]/unpublish/route';

const actor = { userId: 'admin-test', email: 'admin@test.local' };

async function seed(db: Awaited<ReturnType<typeof createProductTestDb>>['db']) {
  const make = (name: string, status: string, withCover: boolean) =>
    db.product.create({
      data: {
        slug: `${name.toLowerCase().replace(/\s+/g, '-')}-${Math.random().toString(36).slice(2, 8)}`,
        name,
        priceKurus: 90000,
        color: 'Siyah',
        category: 'ic-giyim',
        image: withCover ? '/cover.jpg' : '',
        status,
        description: 'Açıklama',
        variants: { create: [{ size: 'M', stock: 4 }, { size: 'S', stock: 0 }, { size: 'L', stock: 2 }] },
        ...(withCover ? { media: { create: [{ kind: 'IMAGE', role: 'FLATLAY', storageKey: 'k1', url: '/cover.jpg', alt: 'Kapak', position: 0, isCover: true }] } } : {}),
      },
    });
  return { ready: await make('Hazır Taslak', 'DRAFT', true), bare: await make('Kapaksız Taslak', 'DRAFT', false), live: await make('Yayındaki', 'PUBLISHED', true) };
}

test('list carries 30-day sales, waiting requests per size and wearing-order sizes', async (t) => {
  const { db, cleanup } = await createProductTestDb();
  t.after(cleanup);
  const { live } = await seed(db);
  const paidAt = new Date();
  await db.order.create({
    data: {
      orderNumber: 'PAN-S1', customerName: 'A', customerEmail: 'a@x.co', customerPhone: '0555', shippingAddress: 'x', shippingCity: 'x', shippingDistrict: 'x',
      totalKurus: 180000, status: 'ODENDI', paidAt,
      items: { create: [{ productId: live.id, productName: live.name, size: 'M', quantity: 2, priceKurus: 90000 }] },
    },
  });
  await db.order.create({
    data: {
      orderNumber: 'PAN-S2', customerName: 'B', customerEmail: 'b@x.co', customerPhone: '0555', shippingAddress: 'x', shippingCity: 'x', shippingDistrict: 'x',
      totalKurus: 90000, status: 'ODEME_BEKLENIYOR',
      items: { create: [{ productId: live.id, productName: live.name, size: 'M', quantity: 1, priceKurus: 90000 }] },
    },
  });
  await db.stockAlert.createMany({ data: [{ productId: live.id, size: 'S', email: 'w1@x.co' }, { productId: live.id, size: 'S', email: 'w2@x.co' }, { productId: live.id, size: 'S', email: 'w3@x.co', isNotified: true }] });

  const products = await listAdminProducts(db);
  const row = products.find((p) => p.id === live.id)!;
  assert.deepEqual(row.sales30, { quantity: 2, revenue: 1800 });
  assert.deepEqual(row.variants.map((v) => v.size), ['S', 'M', 'L']);
  assert.equal(row.variants[0].pendingAlerts, 2);
  assert.equal(row.mediaCount, 1);
});

test('bulk publish reports why a product cannot go live; draft and feature apply to all', async (t) => {
  const { db, cleanup } = await createProductTestDb();
  t.after(cleanup);
  await addRootCategories(db, 'ic-giyim');
  const { ready, bare, live } = await seed(db);

  const published = await bulkUpdateProducts(db, actor, { ids: [ready.id, bare.id], action: 'publish' });
  assert.deepEqual(published.updated, [ready.id]);
  assert.equal(published.failed[0].id, bare.id);
  assert.ok(published.failed[0].reasons.some((reason) => /kapak/i.test(reason)));

  const drafted = await bulkUpdateProducts(db, actor, { ids: [live.id, ready.id], action: 'draft' });
  assert.equal(drafted.updated.length, 2);
  assert.equal((await db.product.findUnique({ where: { id: live.id } }))?.status, 'DRAFT');

  await bulkUpdateProducts(db, actor, { ids: [live.id], action: 'unfeature' });
  assert.equal((await db.product.findUnique({ where: { id: live.id } }))?.featured, false);

  const logs = await db.auditLog.count({ where: { entity: 'product' } });
  assert.ok(logs >= 4);
});

test('category change only accepts a real category and its own subcategory', async (t) => {
  const { db, cleanup } = await createProductTestDb();
  t.after(cleanup);
  const { live } = await seed(db);
  const root = await db.category.create({ data: { slug: 'ev-giyim', name: 'Ev giyim', children: { create: [{ slug: 'pijama', name: 'Pijama' }] } } });
  assert.ok(root);
  await assert.rejects(() => bulkUpdateProducts(db, actor, { ids: [live.id], action: 'category', category: 'yok' }));
  await assert.rejects(() => bulkUpdateProducts(db, actor, { ids: [live.id], action: 'category', category: 'ev-giyim', subcategory: 'sutyen' }));
  await bulkUpdateProducts(db, actor, { ids: [live.id], action: 'category', category: 'ev-giyim', subcategory: 'pijama' });
  const saved = await db.product.findUnique({ where: { id: live.id } });
  assert.equal(saved?.category, 'ev-giyim');
  assert.equal(saved?.subcategory, 'pijama');
});

test('a copy is a draft with stock 0 and no media; unpublish takes a product off the store', async (t) => {
  const { db, cleanup } = await createProductTestDb();
  t.after(cleanup);
  const { live } = await seed(db);
  const copy = await duplicateProduct(db, actor, live.id);
  assert.equal(copy.status, 'DRAFT');
  assert.equal(copy.name, 'Yayındaki (kopya)');
  assert.ok(copy.variants.every((v) => v.stock === 0));
  assert.equal(copy.variants.length, 3);
  assert.equal(await db.productMedia.count({ where: { productId: copy.id } }), 0);

  const drafted = await unpublishProduct(db, actor, live.id);
  assert.equal(drafted.status, 'DRAFT');
});

test('anonymous callers cannot use the new product routes', async () => {
  const params = { params: Promise.resolve({ id: 'unknown' }) };
  const json = (url: string) => new Request(url, { method: 'POST', body: '{}', headers: { 'Content-Type': 'application/json' } });
  const responses = await Promise.all([
    bulkRoute(json('http://localhost/api/admin/products/bulk')),
    duplicateRoute(json('http://localhost/api/admin/products/unknown/duplicate'), params),
    unpublishRoute(json('http://localhost/api/admin/products/unknown/unpublish'), params),
  ]);
  assert.deepEqual(responses.map((r) => r.status), [403, 403, 403]);
});

test('bulk delete deletes un-ordered products and rejects products with order history', async (t) => {
  const { db, cleanup } = await createProductTestDb();
  t.after(cleanup);
  const { ready, bare, live } = await seed(db);

  // Add order to `live`
  await db.order.create({
    data: {
      orderNumber: 'PAN-TEST-BULK-DEL',
      customerName: 'Test',
      customerEmail: 'test@del.co',
      customerPhone: '0555',
      shippingAddress: 'x',
      shippingCity: 'x',
      shippingDistrict: 'x',
      totalKurus: 90000,
      status: 'ODENDI',
      paidAt: new Date(),
      items: { create: [{ productId: live.id, productName: live.name, size: 'M', quantity: 1, priceKurus: 90000 }] },
    },
  });

  const result = await bulkUpdateProducts(db, actor, {
    ids: [ready.id, bare.id, live.id],
    action: 'delete',
  });

  assert.equal(result.updated.length, 2);
  assert.ok(result.updated.includes(ready.id));
  assert.ok(result.updated.includes(bare.id));
  assert.equal(result.failed.length, 1);
  assert.equal(result.failed[0].id, live.id);
  assert.ok(result.failed[0].reasons[0].includes('Sipariş kaydı bulunduğu için silinemez'));

  // Verify deleted from db
  assert.equal(await db.product.count({ where: { id: { in: [ready.id, bare.id] } } }), 0);
  assert.equal(await db.product.count({ where: { id: live.id } }), 1);
});

