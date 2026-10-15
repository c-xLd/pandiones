import assert from 'node:assert/strict';
import test from 'node:test';
import { addRootCategories, createProductTestDb } from './helpers/product-test-db';
import {
  attachMedia,
  createDraft,
  publishProduct,
  saveMediaOrder,
  setCover,
  updateMediaMeta,
  MEDIA_ROLES,
} from '../src/lib/admin/product-editor-service';
import { autoAlt, SHOT_LABEL } from '../src/app/yonetim/_lib/variant-model';
import { PUBLIC_PRODUCT_INCLUDE, publicFindBySlug, type PublicProductRecord } from '../src/lib/products/public-catalog';
import { toGalleryFrames, type MediaRole } from '../src/lib/products/media-domain';

const jpeg = () => new File([new Uint8Array([0xff, 0xd8, 0xff, 0xd9])], 'photo.jpg', { type: 'image/jpeg' });
const draftInput = (name: string, color: string) => ({
  name,
  color,
  category: 'ic-giyim',
  price: 750,
  description: 'Detaylı ürün açıklaması',
  variants: [{ size: 'S', stock: 5 }],
});

test('MEDIA_ROLES contains all luxury catalog roles and autoAlt produces clean accessible text', () => {
  const expectedRoles: MediaRole[] = [
    'MODEL_FRONT',
    'MODEL_BACK',
    'MODEL_SIDE',
    'MODEL_WALK',
    'MODEL',
    'FLATLAY',
    'PACKSHOT',
    'HANGER',
    'FABRIC_DETAIL',
    'STITCH_DETAIL',
    'CLOSEUP',
    'STYLING',
    'DETAIL',
  ];

  for (const role of expectedRoles) {
    assert.ok(MEDIA_ROLES.includes(role), `Missing role: ${role}`);
    assert.ok(SHOT_LABEL[role], `Missing SHOT_LABEL for role: ${role}`);
    const generatedAlt = autoAlt('İpek Bluz', 'Ekru', 'IMAGE', role, 1);
    assert.ok(generatedAlt.startsWith('İpek Bluz – Ekru, '), `Bad alt format for ${role}: ${generatedAlt}`);
    // Check forbidden words
    assert.doesNotMatch(generatedAlt, /\b(atölye|atolye|atelier|maison|istanbul)\b/i);
  }
});

test('attachMedia accepts all 13 MediaRole types and assigns sequential positions', async (t) => {
  const { db, cleanup } = await createProductTestDb();
  t.after(cleanup);

  const product = await createDraft(draftInput('Saten Elbise', 'Zümrüt'), db);
  let counter = 0;
  const storage = {
    async put() {
      counter++;
      return { key: `media/photo-${counter}.jpg`, url: `/uploads/media/photo-${counter}.jpg` };
    },
    async delete() {},
  };

  const attached = [];
  for (let i = 0; i < MEDIA_ROLES.length; i++) {
    const role = MEDIA_ROLES[i];
    const item = await attachMedia(
      {
        productId: product.id,
        file: jpeg(),
        role,
        alt: autoAlt('Saten Elbise', 'Zümrüt', 'IMAGE', role, i + 1),
        isCover: attached.length === 0,
      },
      db,
      storage,
    );
    attached.push(item);
  }

  assert.equal(attached.length, 13);
  const dbItems = await db.productMedia.findMany({
    where: { productId: product.id },
    orderBy: { position: 'asc' },
  });

  assert.equal(dbItems.length, 13);
  for (let i = 0; i < dbItems.length; i++) {
    assert.equal(dbItems[i].role, MEDIA_ROLES[i]);
    assert.equal(dbItems[i].position, i);
  }
});

test('updateMediaMeta updates role and rejects invalid role types', async (t) => {
  const { db, cleanup } = await createProductTestDb();
  t.after(cleanup);

  const product = await createDraft(draftInput('Saten Bluz', 'Ekru'), db);
  const storage = {
    async put() { return { key: 'media/bluz.jpg', url: '/uploads/bluz.jpg' }; },
    async delete() {},
  };

  const media = await attachMedia(
    {
      productId: product.id,
      file: jpeg(),
      role: 'FLATLAY',
      alt: autoAlt('Saten Bluz', 'Ekru', 'IMAGE', 'FLATLAY', 1),
      isCover: true,
    },
    db,
    storage,
  );

  const updated = await updateMediaMeta(
    {
      productId: product.id,
      mediaId: media.id,
      role: 'FABRIC_DETAIL',
      alt: autoAlt('Saten Bluz', 'Ekru', 'IMAGE', 'FABRIC_DETAIL', 1),
    },
    db,
  );

  assert.equal(updated.role, 'FABRIC_DETAIL');
  assert.equal(updated.alt, 'Saten Bluz – Ekru, kumaş ve doku detayı 1');

  // Attempt invalid role
  await assert.rejects(
    () =>
      updateMediaMeta(
        {
          productId: product.id,
          mediaId: media.id,
          role: 'INVALID_ROLE' as unknown as MediaRole,
        },
        db,
      ),
    { code: 'INVALID_MEDIA' },
  );
});

test('setCover makes selected image the sole cover and synchronizes product canonical image', async (t) => {
  const { db, cleanup } = await createProductTestDb();
  t.after(cleanup);

  const product = await createDraft(draftInput('Kaşmir Kazak', 'Bej'), db);
  let idGen = 0;
  const storage = {
    async put() {
      idGen++;
      return { key: `kazak-${idGen}.jpg`, url: `/uploads/kazak-${idGen}.jpg` };
    },
    async delete() {},
  };

  const img1 = await attachMedia({ productId: product.id, file: jpeg(), role: 'MODEL_FRONT', alt: 'Ön', isCover: true }, db, storage);
  const img2 = await attachMedia({ productId: product.id, file: jpeg(), role: 'MODEL_BACK', alt: 'Arka', isCover: false }, db, storage);
  const img3 = await attachMedia({ productId: product.id, file: jpeg(), role: 'FABRIC_DETAIL', alt: 'Kumaş', isCover: false }, db, storage);

  // Initial cover check
  const fresh1 = await db.product.findUniqueOrThrow({ where: { id: product.id } });
  assert.equal(fresh1.image, '/uploads/kazak-1.jpg');

  // Switch cover to img3 (Kumaş Detayı)
  await setCover(product.id, img3.id, db);

  const fresh2 = await db.product.findUniqueOrThrow({
    where: { id: product.id },
    include: { media: { orderBy: { position: 'asc' } } },
  });

  assert.equal(fresh2.image, '/uploads/kazak-3.jpg');
  const covers = fresh2.media.filter((m) => m.isCover);
  assert.equal(covers.length, 1);
  assert.equal(covers[0].id, img3.id);
  assert.equal(fresh2.media[0].id, img3.id);
  assert.equal(fresh2.media[0].position, 0);

  // Switch cover to img2 (Arka)
  await setCover(product.id, img2.id, db);
  const fresh3 = await db.product.findUniqueOrThrow({
    where: { id: product.id },
    include: { media: { orderBy: { position: 'asc' } } },
  });
  assert.equal(fresh3.image, '/uploads/kazak-2.jpg');
  assert.equal(fresh3.media.find((m) => m.id === img2.id)?.isCover, true);
  assert.equal(fresh3.media.find((m) => m.id === img3.id)?.isCover, false);
  assert.equal(fresh3.media[0].id, img2.id);
  assert.equal(fresh3.media[0].position, 0);

  // Verify toGalleryFrames places the cover image at index 0 for storefront
  const frames = toGalleryFrames({
    image: fresh3.image,
    media: fresh3.media.map((m) => ({ kind: m.kind as 'IMAGE' | 'VIDEO', url: m.url, posterUrl: m.posterUrl, isCover: m.isCover, position: m.position })),
  });
  assert.equal(frames[0].src, '/uploads/kazak-2.jpg');
});

test('saveMediaOrder reorders media items seamlessly without duplicate positions', async (t) => {
  const { db, cleanup } = await createProductTestDb();
  t.after(cleanup);

  const product = await createDraft(draftInput('Keten Pantolon', 'Kum'), db);
  let idGen = 0;
  const storage = {
    async put() {
      idGen++;
      return { key: `pantolon-${idGen}.jpg`, url: `/uploads/pantolon-${idGen}.jpg` };
    },
    async delete() {},
  };

  const itemA = await attachMedia({ productId: product.id, file: jpeg(), role: 'MODEL_FRONT', alt: 'A' }, db, storage);
  const itemB = await attachMedia({ productId: product.id, file: jpeg(), role: 'MODEL_SIDE', alt: 'B' }, db, storage);
  const itemC = await attachMedia({ productId: product.id, file: jpeg(), role: 'HANGER', alt: 'C' }, db, storage);

  // Current order: A(0), B(1), C(2)
  // Move C to top (arrow up from last to first):
  await saveMediaOrder({ productId: product.id, mediaId: itemC.id, position: 0 }, db);
  let current = await db.productMedia.findMany({ where: { productId: product.id }, orderBy: { position: 'asc' } });
  assert.deepEqual(current.map((m) => m.id), [itemC.id, itemA.id, itemB.id]);

  // Move C down to index 1 (arrow down):
  await saveMediaOrder({ productId: product.id, mediaId: itemC.id, position: 1 }, db);
  current = await db.productMedia.findMany({ where: { productId: product.id }, orderBy: { position: 'asc' } });
  assert.deepEqual(current.map((m) => m.id), [itemA.id, itemC.id, itemB.id]);
});

test('publicFindBySlug includes all new luxury shot types when published', async (t) => {
  const { db, cleanup } = await createProductTestDb();
  t.after(cleanup);
  await addRootCategories(db, 'ic-giyim');

  let idGen = 0;
  const storage = {
    async put() {
      idGen++;
      return { key: `silk-${idGen}.jpg`, url: `/uploads/silk-${idGen}.jpg` };
    },
    async delete() {},
  };

  const product = await createDraft(draftInput('Saf İpek Gömlek', 'Şampanya'), db);

  // Attach multiple media with diverse roles
  const m1 = await attachMedia({ productId: product.id, file: jpeg(), role: 'MODEL_FRONT', alt: 'Ön', isCover: true }, db, storage);
  const m2 = await attachMedia({ productId: product.id, file: jpeg(), role: 'MODEL_BACK', alt: 'Arka' }, db, storage);
  const m3 = await attachMedia({ productId: product.id, file: jpeg(), role: 'FABRIC_DETAIL', alt: 'Kumaş' }, db, storage);
  const m4 = await attachMedia({ productId: product.id, file: jpeg(), role: 'PACKSHOT', alt: 'Dekupe' }, db, storage);

  await setCover(product.id, m1.id, db);
  await publishProduct(product.id, db);

  const repo = {
    async findFirst(args: Parameters<typeof publicFindBySlug>[1] extends { findFirst(args: infer A): unknown } ? A : never) {
      return db.product.findFirst({ where: args.where, include: PUBLIC_PRODUCT_INCLUDE }) as Promise<PublicProductRecord | null>;
    },
  };

  const publicProduct = await publicFindBySlug(product.slug, repo);
  assert.ok(publicProduct);
  assert.ok(publicProduct.media);
  assert.equal(publicProduct.media.length, 4);
  const roles = publicProduct.media.map((m) => m.role);
  assert.ok(roles.includes('MODEL_FRONT'));
  assert.ok(roles.includes('MODEL_BACK'));
  assert.ok(roles.includes('FABRIC_DETAIL'));
  assert.ok(roles.includes('PACKSHOT'));
});
