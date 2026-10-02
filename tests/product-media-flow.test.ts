import assert from 'node:assert/strict';
import test from 'node:test';
import { createProductTestDb } from './helpers/product-test-db';
import { attachMedia, createDraft, createFamily, publishProduct, setCover, setFamily } from '../src/lib/admin/product-editor-service';
import { PUBLIC_PRODUCT_INCLUDE, publicFindBySlug, type PublicProductRecord } from '../src/lib/products/public-catalog';
import { toGalleryFrames } from '../src/lib/products/media-domain';

const jpeg = () => new File([new Uint8Array([0xff, 0xd8, 0xff, 0xd9])], 'look.jpg', { type: 'image/jpeg' });

test('draft stays private until real cover/publish, then exposes only real linked color and media', async (t) => {
  const { db, cleanup } = await createProductTestDb();
  t.after(cleanup);
  let stored = 0;
  const storage = {
    async put() { stored++; return { key: `look-${stored}.jpg`, url: `/media/look-${stored}.jpg` }; },
    async delete() {},
  };
  const repo = {
    async findFirst(args: Parameters<typeof publicFindBySlug>[1] extends { findFirst(args: infer A): unknown } ? A : never) {
      return db.product.findFirst({ where: args.where, include: PUBLIC_PRODUCT_INCLUDE }) as Promise<PublicProductRecord | null>;
    },
  };

  const family = await createFamily('Crop 01', db);
  const white = await createDraft({ name: 'Beyaz Crop', color: 'Beyaz', category: 'ic-giyim', price: 590, variants: [{ size: 'S', stock: 2 }] }, db);
  const whiteCover = await attachMedia({ productId: white.id, file: jpeg(), role: 'MODEL', alt: 'Beyaz Crop manken' }, db, storage);
  await setCover(white.id, whiteCover.id, db);
  await setFamily({ productId: white.id, familyId: family.id }, db);
  await publishProduct(white.id, db);

  const black = await createDraft({ name: 'Siyah Crop', color: 'Siyah', category: 'ic-giyim', price: 590, variants: [{ size: 'S', stock: 2 }] }, db);
  assert.equal(await publicFindBySlug(black.slug, repo), null);
  await assert.rejects(() => publishProduct(black.id, db), { code: 'INVALID_PUBLISH' });
  const flat = await attachMedia({ productId: black.id, file: jpeg(), role: 'FLATLAY', alt: 'Siyah Crop düz çekim' }, db, storage);
  await setCover(black.id, flat.id, db);
  await setFamily({ productId: black.id, familyId: family.id }, db);
  assert.equal(await publicFindBySlug(black.slug, repo), null);
  await publishProduct(black.id, db);

  const publicBlack = await publicFindBySlug(black.slug, repo);
  assert.equal(publicBlack?.status, 'PUBLISHED');
  assert.equal(publicBlack?.image, '/media/look-2.jpg');
  assert.deepEqual(publicBlack?.siblingColors?.map((color) => color.slug), [white.slug]);
  assert.deepEqual(toGalleryFrames(publicBlack!).map((frame) => frame.src), ['/media/look-2.jpg']);
});
