import assert from 'node:assert/strict';
import test from 'node:test';
import { createProductTestDb } from './helpers/product-test-db';
import { attachMedia, createDraft, deleteMedia, setCover, setVideoPoster, updateMediaMeta } from '../src/lib/admin/product-editor-service';

const draftInput = (name: string, color: string) => ({ name, color, category: 'ic-giyim', price: 590, description: '', variants: [{ size: 'S', stock: 2 }] });
const jpeg = () => new File([new Uint8Array([0xff, 0xd8, 0xff, 0xd9])], 'look.jpg', { type: 'image/jpeg' });
const mp4 = () => new File([new Uint8Array([0, 0, 0, 12, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d])], 'clip.mp4', { type: 'video/mp4' });

function memoryStorage() {
  let n = 0;
  const deleted: string[] = [];
  return {
    deleted,
    async put(_bytes: Uint8Array, type: string) { n++; return { key: `k-${n}`, url: `/media/${n}.${type.endsWith('mp4') ? 'mp4' : 'jpg'}` }; },
    async delete(key: string) { deleted.push(key); },
  };
}

test('each photo keeps its own shot type and description, editable after upload', async (t) => {
  const { db, cleanup } = await createProductTestDb();
  t.after(cleanup);
  const storage = memoryStorage();
  const product = await createDraft(draftInput('Saten', 'Siyah'), db);
  const flat = await attachMedia({ productId: product.id, file: jpeg(), role: 'FLATLAY', alt: 'Düz' }, db, storage);
  const model = await attachMedia({ productId: product.id, file: jpeg(), role: 'MODEL', alt: 'Manken' }, db, storage);
  assert.deepEqual([flat.role, model.role], ['FLATLAY', 'MODEL']);

  const updated = await updateMediaMeta({ productId: product.id, mediaId: flat.id, role: 'DETAIL', alt: '  Dantel detayı ' }, db);
  assert.equal(updated.role, 'DETAIL');
  assert.equal(updated.alt, 'Dantel detayı');
  await assert.rejects(() => updateMediaMeta({ productId: product.id, mediaId: flat.id, role: 'POSTER' as never }, db), { code: 'INVALID_MEDIA' });
  await assert.rejects(() => updateMediaMeta({ productId: product.id, mediaId: flat.id, alt: '  ' }, db), { code: 'INVALID_MEDIA' });

  const other = await createDraft(draftInput('Başka', 'Beyaz'), db);
  await assert.rejects(() => updateMediaMeta({ productId: other.id, mediaId: flat.id, role: 'MODEL' }, db), { code: 'NOT_FOUND' }, 'başka ürünün medyası değiştirilemez');
});

test('one video per colour, its poster is one of that colour\'s photos and cannot be deleted while in use', async (t) => {
  const { db, cleanup } = await createProductTestDb();
  t.after(cleanup);
  const storage = memoryStorage();
  const product = await createDraft(draftInput('Saten', 'Siyah'), db);
  const first = await attachMedia({ productId: product.id, file: jpeg(), role: 'MODEL', alt: 'Ön' }, db, storage);
  const second = await attachMedia({ productId: product.id, file: jpeg(), role: 'MODEL', alt: 'Arka' }, db, storage);
  const video = await attachMedia({ productId: product.id, file: mp4(), role: 'MODEL', alt: 'Video', posterMediaId: first.id }, db, storage);
  assert.equal(video.posterUrl, first.url);

  const writesBefore = storage.deleted.length;
  await assert.rejects(() => attachMedia({ productId: product.id, file: mp4(), role: 'MODEL', alt: 'İkinci video', posterMediaId: first.id }, db, storage), { code: 'VIDEO_LIMIT' });
  assert.equal(await db.productMedia.count({ where: { productId: product.id, kind: 'VIDEO' } }), 1);
  assert.equal(storage.deleted.length, writesBefore);

  await assert.rejects(() => deleteMedia({ productId: product.id, mediaId: first.id }, db, storage), { code: 'POSTER_IN_USE' });

  // The cover video's poster is the product image: changing the poster updates it.
  await setCover(product.id, video.id, db);
  const moved = await setVideoPoster({ productId: product.id, videoId: video.id, posterMediaId: second.id }, db);
  assert.equal(moved.posterUrl, second.url);
  assert.equal((await db.product.findUniqueOrThrow({ where: { id: product.id } })).image, second.url);
  await deleteMedia({ productId: product.id, mediaId: first.id }, db, storage);

  const other = await createDraft(draftInput('Başka', 'Beyaz'), db);
  const foreign = await attachMedia({ productId: other.id, file: jpeg(), role: 'MODEL', alt: 'Başka' }, db, storage);
  await assert.rejects(() => setVideoPoster({ productId: product.id, videoId: video.id, posterMediaId: foreign.id }, db), { code: 'INVALID_MEDIA' });
  await assert.rejects(() => setVideoPoster({ productId: product.id, videoId: second.id, posterMediaId: second.id }, db), { code: 'INVALID_MEDIA' }, 'görsel video değildir');
});
