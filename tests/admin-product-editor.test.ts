import assert from 'node:assert/strict';
import test from 'node:test';
import { createProductTestDb } from './helpers/product-test-db';
import {
  attachMedia, createDraft, createFamily, deleteMedia, publishProduct,
  saveMediaOrder, saveProduct, saveVariantStock, setCover, setFamily,
} from '../src/lib/admin/product-editor-service';

const draftInput = (name: string, color: string) => ({
  name, color, category: 'ic-giyim', price: 590, description: '',
  variants: [{ size: 'S', stock: 2 }],
});
const jpeg = () => new File([new Uint8Array([0xff, 0xd8, 0xff, 0xd9])], 'flat.jpg', { type: 'image/jpeg' });
const storage = {
  async put() { return { key: 'products/00000000-0000-4000-8000-000000000001.jpg', url: '/uploads/products/flat.jpg' }; },
  async delete() {},
};

test('invalid draft values do not create a product', async (t) => {
  const { db, cleanup } = createProductTestDb();
  t.after(cleanup);
  await assert.rejects(() => createDraft({ ...draftInput('X', 'Siyah'), price: -1 }, db), { code: 'INVALID_PRODUCT' });
  assert.equal(await db.product.count(), 0);
});

test('new product remains draft without an invented image', async (t) => {
  const { db, cleanup } = createProductTestDb();
  t.after(cleanup);
  const product = await createDraft(draftInput('Siyah Crop', 'Siyah'), db);
  assert.equal(product.status, 'DRAFT');
  assert.equal(product.image, '');
  assert.deepEqual(product.variants.map((item) => item.size), ['S']);
});

test('duplicate normalized color and mismatched category leave family unchanged', async (t) => {
  const { db, cleanup } = createProductTestDb();
  t.after(cleanup);
  const family = await createFamily('Crop', db);
  const first = await createDraft(draftInput('Siyah Crop', 'Siyah'), db);
  const duplicate = await createDraft(draftInput('Başka Siyah Crop', ' siyah '), db);
  const wrongCategory = await createDraft({ ...draftInput('Beyaz Pijama', 'Beyaz'), category: 'ev-giyim' }, db);
  await setFamily({ productId: first.id, familyId: family.id }, db);
  await assert.rejects(() => setFamily({ productId: duplicate.id, familyId: family.id }, db), { code: 'COLOR_CONFLICT' });
  await assert.rejects(() => setFamily({ productId: wrongCategory.id, familyId: family.id }, db), { code: 'CATEGORY_CONFLICT' });
  assert.equal((await db.product.findUniqueOrThrow({ where: { id: duplicate.id } })).familyId, null);
  assert.equal((await db.product.findUniqueOrThrow({ where: { id: wrongCategory.id } })).familyId, null);
});

test('draft with video lacking poster cannot publish', async (t) => {
  const { db, cleanup } = createProductTestDb();
  t.after(cleanup);
  const product = await createDraft(draftInput('Video Crop', 'Siyah'), db);
  await db.productMedia.create({ data: {
    productId: product.id, kind: 'VIDEO', role: 'MODEL', storageKey: 'video',
    url: '/video.mp4', alt: 'Video', position: 0, isCover: true,
  } });
  await assert.rejects(() => publishProduct(product.id, db), { code: 'INVALID_PUBLISH' });
  assert.equal((await db.product.findUniqueOrThrow({ where: { id: product.id } })).status, 'DRAFT');
});

test('foreign media cannot be reordered/deleted, sole published cover stays', async (t) => {
  const { db, cleanup } = createProductTestDb();
  t.after(cleanup);
  const first = await createDraft(draftInput('First', 'Siyah'), db);
  const second = await createDraft(draftInput('Second', 'Beyaz'), db);
  const cover = await attachMedia({ productId: first.id, file: jpeg(), role: 'FLATLAY', alt: 'First', isCover: true }, db, storage);
  const foreign = await attachMedia({ productId: second.id, file: jpeg(), role: 'FLATLAY', alt: 'Second', isCover: true }, db, storage);
  await publishProduct(first.id, db);
  await assert.rejects(() => saveMediaOrder({ productId: first.id, mediaId: foreign.id, position: 1 }, db), { code: 'NOT_FOUND' });
  await assert.rejects(() => deleteMedia({ productId: first.id, mediaId: foreign.id }, db, storage), { code: 'NOT_FOUND' });
  await assert.rejects(() => deleteMedia({ productId: first.id, mediaId: cover.id }, db, storage), { code: 'COVER_REQUIRED' });
  assert.equal((await db.productMedia.findUniqueOrThrow({ where: { id: cover.id } })).isCover, true);
});

test('moving a media frame reindexes the full product sequence without ties', async (t) => {
  const { db, cleanup } = createProductTestDb();
  t.after(cleanup);
  const draft = await createDraft(draftInput('Frames', 'Siyah'), db);
  const first = await attachMedia({ productId: draft.id, file: jpeg(), role: 'FLATLAY', alt: 'First' }, db, storage);
  const second = await attachMedia({ productId: draft.id, file: jpeg(), role: 'MODEL', alt: 'Second' }, db, storage);
  const third = await attachMedia({ productId: draft.id, file: jpeg(), role: 'DETAIL', alt: 'Third' }, db, storage);
  await saveMediaOrder({ productId: draft.id, mediaId: third.id, position: 0 }, db);
  const frames = await db.productMedia.findMany({ where: { productId: draft.id }, orderBy: { position: 'asc' } });
  assert.deepEqual(frames.map(({ id, position }) => [id, position]), [[third.id, 0], [first.id, 1], [second.id, 2]]);
});

test('valid uploaded cover can publish and sync canonical image', async (t) => {
  const { db, cleanup } = createProductTestDb();
  t.after(cleanup);
  const product = await createDraft(draftInput('Siyah Crop', 'Siyah'), db);
  const media = await attachMedia({ productId: product.id, file: jpeg(), role: 'FLATLAY', alt: 'Düz çekim' }, db, storage);
  await setCover(product.id, media.id, db);
  const published = await publishProduct(product.id, db);
  assert.equal(published.status, 'PUBLISHED');
  assert.equal(published.image, '/uploads/products/flat.jpg');
});

test('editing price and stock persists while invalid update leaves old values', async (t) => {
  const { db, cleanup } = createProductTestDb();
  t.after(cleanup);
  const draft = await createDraft(draftInput('Siyah Crop', 'Siyah'), db);
  const updated = await saveProduct({ id: draft.id, price: 690, variants: [{ size: 'S', stock: 5 }] }, db);
  assert.equal(updated.price, 690);
  assert.equal(updated.variants[0].stock, 5);
  await assert.rejects(() => saveProduct({ id: draft.id, price: 700, variants: [{ size: 'S', stock: -1 }] }, db), { code: 'INVALID_PRODUCT' });
  const persisted = await db.product.findUniqueOrThrow({ where: { id: draft.id }, include: { variants: true } });
  assert.equal(persisted.price, 690);
  assert.equal(persisted.variants[0].stock, 5);
});

test('legacy single-size stock edit retains other sizes and rejects negative stock', async (t) => {
  const { db, cleanup } = createProductTestDb();
  t.after(cleanup);
  const draft = await createDraft({ ...draftInput('Siyah Crop', 'Siyah'), variants: [{ size: 'S', stock: 2 }, { size: 'M', stock: 3 }] }, db);
  const small = draft.variants.find((item) => item.size === 'S')!;
  await saveVariantStock(small.id, 6, db);
  await assert.rejects(() => saveVariantStock(small.id, -1, db), { code: 'INVALID_PRODUCT' });
  const variants = await db.variant.findMany({ where: { productId: draft.id }, orderBy: { size: 'desc' } });
  assert.deepEqual(variants.map(({ size, stock }) => [size, stock]), [['S', 6], ['M', 3]]);
});

test('a video with another product poster is rejected before storage write', async (t) => {
  const { db, cleanup } = createProductTestDb();
  t.after(cleanup);
  const first = await createDraft(draftInput('First', 'Siyah'), db);
  const second = await createDraft(draftInput('Second', 'Beyaz'), db);
  const poster = await attachMedia({ productId: second.id, file: jpeg(), role: 'MODEL', alt: 'Poster' }, db, storage);
  let writes = 0;
  const spyStorage = { ...storage, async put() { writes++; return storage.put(); } };
  const mp4 = new File([new Uint8Array([0, 0, 0, 12, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d])], 'clip.mp4', { type: 'video/mp4' });
  await assert.rejects(() => attachMedia({ productId: first.id, file: mp4, role: 'MODEL', alt: 'Video', posterMediaId: poster.id }, db, spyStorage), { code: 'INVALID_MEDIA' });
  assert.equal(writes, 0);
});

test('database failure after object write cleans the new object', async (t) => {
  const { db, cleanup } = createProductTestDb();
  t.after(cleanup);
  const draft = await createDraft(draftInput('Transient', 'Siyah'), db);
  let cleaned = '';
  const deletingStorage = {
    async put() {
      await db.product.delete({ where: { id: draft.id } });
      return { key: 'new-object', url: '/new-object' };
    },
    async delete(key: string) { cleaned = key; },
  };
  await assert.rejects(() => attachMedia({ productId: draft.id, file: jpeg(), role: 'MODEL', alt: 'Manken' }, db, deletingStorage));
  assert.equal(cleaned, 'new-object');
});
