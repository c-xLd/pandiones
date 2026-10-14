import assert from 'node:assert/strict';
import test from 'node:test';
import { createProductTestDb } from './helpers/product-test-db';
import { deleteProduct } from '../src/lib/admin/product-delete';
import { isManagedMediaKey, type MediaStorage } from '../src/lib/media/storage';
import { DELETE as deleteRoute } from '../src/app/api/admin/products/[id]/route';

const actor = { userId: 'admin-test', email: 'admin@test.local' };
const UPLOADED = 'products/0f8fad5b-d9cb-469f-a165-70867728950e.webp';

function recordingStorage(failing = false) {
  const deleted: string[] = [];
  const storage: MediaStorage = {
    async put() {
      throw new Error('not used');
    },
    async delete(key) {
      if (failing) throw new Error('storage down');
      deleted.push(key);
    },
  };
  return { storage, deleted };
}

async function makeProduct(db: Awaited<ReturnType<typeof createProductTestDb>>['db'], color = 'Siyah', familyId?: string) {
  return db.product.create({
    data: {
      slug: `silinecek-${color.toLowerCase()}-${Math.random().toString(36).slice(2, 8)}`,
      name: 'Silinecek Takım',
      price: 900,
      color,
      category: 'ic-giyim',
      image: '/uploads/x.webp',
      status: 'PUBLISHED',
      description: 'Açıklama',
      ...(familyId ? { familyId } : {}),
      variants: { create: [{ size: 'S', stock: 1 }, { size: 'M', stock: 2 }] },
      media: {
        create: [
          { kind: 'IMAGE', role: 'FLATLAY', storageKey: UPLOADED, url: '/uploads/x.webp', alt: 'Kapak', position: 0, isCover: true },
          { kind: 'IMAGE', role: 'DETAIL', storageKey: 'assets/lace.webp', url: '/assets/lace.webp', alt: 'Dantel', position: 1, isCover: false },
        ],
      },
    },
  });
}

test('only uploaded keys are storage-managed; catalogue assets are repository files', () => {
  assert.equal(isManagedMediaKey(UPLOADED), true);
  assert.equal(isManagedMediaKey('assets/lace.webp'), false);
  assert.equal(isManagedMediaKey('products/../../etc/passwd'), false);
});

test('a never-ordered product is deleted with its sizes, media, wishlist and stock requests; uploads removed, assets kept', async (t) => {
  const { db, cleanup } = await createProductTestDb();
  t.after(cleanup);
  const family = await db.productFamily.create({ data: { name: 'Silinecek Takım' } });
  const product = await makeProduct(db, 'Siyah', family.id);
  const sibling = await makeProduct(db, 'Pudra', family.id);
  const user = await db.user.create({ data: { email: 'fav@x.co', name: 'F', passwordHash: 'x' } });
  await db.wishlistItem.create({ data: { userId: user.id, productId: product.id } });
  await db.stockAlert.create({ data: { productId: product.id, size: 'S', email: 'w@x.co' } });
  const { storage, deleted } = recordingStorage();

  const result = await deleteProduct(db, storage, actor, product.id);

  assert.deepEqual(result, { name: 'Silinecek Takım', color: 'Siyah', cleanupFailed: 0 });
  assert.equal(await db.product.findUnique({ where: { id: product.id } }), null);
  assert.equal(await db.variant.count({ where: { productId: product.id } }), 0);
  assert.equal(await db.productMedia.count({ where: { productId: product.id } }), 0);
  assert.equal(await db.wishlistItem.count({ where: { productId: product.id } }), 0);
  assert.equal(await db.stockAlert.count({ where: { productId: product.id } }), 0);
  assert.deepEqual(deleted, [UPLOADED], 'catalogue asset is not deleted from storage');
  assert.ok(await db.productFamily.findUnique({ where: { id: family.id } }), 'family with a remaining colour stays');
  assert.ok(await db.product.findUnique({ where: { id: sibling.id } }));
  const log = await db.auditLog.findFirst({ where: { action: 'product.delete', entityId: product.id } });
  assert.match(log?.summary ?? '', /Silinecek Takım \(Siyah\) kalıcı olarak silindi; 2 beden, 2 medya/);

  await deleteProduct(db, storage, actor, sibling.id);
  assert.equal(await db.productFamily.findUnique({ where: { id: family.id } }), null, 'emptied family is removed');
});

test('a product on any order is refused and left untouched', async (t) => {
  const { db, cleanup } = await createProductTestDb();
  t.after(cleanup);
  const product = await makeProduct(db);
  await db.order.create({
    data: {
      orderNumber: 'PAN-DEL1', customerName: 'A', customerEmail: 'a@x.co', customerPhone: '0555', shippingAddress: 'x', shippingCity: 'x', shippingDistrict: 'x',
      totalAmount: 900, status: 'IPTAL',
      items: { create: [{ productId: product.id, productName: product.name, size: 'S', quantity: 1, price: 900 }] },
    },
  });
  const { storage, deleted } = recordingStorage();
  await assert.rejects(deleteProduct(db, storage, actor, product.id), { code: 'HAS_ORDERS' });
  assert.ok(await db.product.findUnique({ where: { id: product.id } }));
  assert.equal(await db.productMedia.count({ where: { productId: product.id } }), 2);
  assert.deepEqual(deleted, []);
  assert.equal(await db.auditLog.count({ where: { action: 'product.delete' } }), 0);
});

test('unknown product is NOT_FOUND; a failed file cleanup is reported, not hidden', async (t) => {
  const { db, cleanup } = await createProductTestDb();
  t.after(cleanup);
  await assert.rejects(deleteProduct(db, null, actor, 'missing'), { code: 'NOT_FOUND' });
  const product = await makeProduct(db);
  const { storage } = recordingStorage(true);
  const result = await deleteProduct(db, storage, actor, product.id);
  assert.equal(result.cleanupFailed, 1);
  assert.equal(await db.product.findUnique({ where: { id: product.id } }), null);
});

test('DELETE route: guests and customers get 403', async () => {
  const response = await deleteRoute(new Request('http://localhost/api/admin/products/x', { method: 'DELETE' }), { params: Promise.resolve({ id: 'x' }) });
  assert.equal(response.status, 403);
});
