import assert from 'node:assert/strict';
import test from 'node:test';
import { createProductTestDb } from './helpers/product-test-db';
import { createDraft, saveProduct, saveVariantStock } from '../src/lib/admin/product-editor-service';
import { addColorVariant } from '../src/lib/admin/product-catalog';
import { compareAtPriceProblem, isValidEan13, vatIncluded } from '../src/lib/products/commerce-fields';
import { toPublicProduct, type PublicProductRecord } from '../src/lib/products/public-catalog';
import { applySizes, groupFromProduct, regenerateSkus, skusToChange, groupPayload, newColorGroup, sizesOf, suggestSku, validateGroups, type ColorGroup } from '../src/app/yonetim/_lib/variant-model';

const actor = { userId: 'admin-test', email: 'admin@pandiones.test' };
// Real EAN-13 numbers (check digit valid).
const EAN_A = '8690000000012';
const EAN_B = '4006381333931';

const draft = (overrides: Record<string, unknown> = {}) => ({
  name: 'Saten Takım',
  color: 'Siyah',
  category: 'ic-giyim',
  price: 1000,
  description: '',
  variants: [
    { size: 'S', stock: 2 },
    { size: 'M', stock: 3 },
  ],
  ...overrides,
});

test('EAN-13 check digit, list price rule and VAT inside a price', () => {
  assert.equal(isValidEan13(EAN_A), true);
  assert.equal(isValidEan13(EAN_B), true);
  assert.equal(isValidEan13('8690000000018'), false, 'kontrol hanesi tutmuyor');
  assert.equal(isValidEan13('869000000001'), false, '12 hane');
  assert.equal(isValidEan13('86900000000AB'), false);
  assert.equal(compareAtPriceProblem(1000, null), null);
  assert.equal(compareAtPriceProblem(1000, 1200), null);
  assert.ok(compareAtPriceProblem(1000, 1000), 'eşit fiyat sahte indirimdir');
  assert.ok(compareAtPriceProblem(1000, 900));
  assert.equal(vatIncluded(110, 10), 10);
  assert.equal(vatIncluded(120, 20), 20);
});

test('server: SKU and barcode are validated, stored per size, and unique across the catalog', async (t) => {
  const { db, cleanup } = await createProductTestDb();
  t.after(cleanup);
  const product = await createDraft(draft({ compareAtPrice: 1300, vatRate: 10, variants: [{ size: 'S', stock: 1, sku: 'pan-sat-s', barcode: EAN_A }, { size: 'M', stock: 1 }] }), db);
  assert.equal(product.compareAtPriceKurus, 130000);
  assert.equal(product.vatRate, 10);
  const small = product.variants.find((variant) => variant.size === 'S');
  assert.equal(small?.sku, 'PAN-SAT-S', 'stok kodu büyük harfle saklanır');
  assert.equal(small?.barcode, EAN_A);

  await assert.rejects(() => createDraft(draft({ variants: [{ size: 'S', stock: 1, barcode: '8690000000018' }] }), db), { code: 'INVALID_BARCODE' });
  await assert.rejects(() => createDraft(draft({ variants: [{ size: 'S', stock: 1, sku: 'x' }] }), db), { code: 'INVALID_SKU' });
  await assert.rejects(() => createDraft(draft({ compareAtPrice: 900 }), db), { code: 'INVALID_COMPARE_PRICE' });
  await assert.rejects(() => createDraft(draft({ vatRate: 18 }), db), { code: 'INVALID_VAT' });
  await assert.rejects(() => createDraft(draft({ name: 'Başka', variants: [{ size: 'S', stock: 1, barcode: EAN_A }] }), db), { code: 'DUPLICATE_CODE' }, 'başka üründe aynı barkod');
  await assert.rejects(() => createDraft(draft({ variants: [{ size: 'S', stock: 1, sku: 'AA-1' }, { size: 'M', stock: 1, sku: 'aa-1' }] }), db), { code: 'DUPLICATE_CODE' });
  assert.equal(await db.product.count(), 1, 'reddedilen kayıt ürün açmaz');

  // Codes can swap between the product's own sizes in one save.
  const swapped = await saveProduct({ id: product.id, variants: [{ size: 'S', stock: 1, sku: null, barcode: null }, { size: 'M', stock: 1, sku: 'PAN-SAT-S', barcode: EAN_A }] }, db);
  assert.equal(swapped.variants.find((variant) => variant.size === 'M')?.barcode, EAN_A);
  // A client that sends only size and stock keeps the codes.
  const kept = await saveProduct({ id: product.id, variants: [{ size: 'S', stock: 4 }, { size: 'M', stock: 4 }] }, db);
  assert.equal(kept.variants.find((variant) => variant.size === 'M')?.sku, 'PAN-SAT-S');
  // Raising the price to the list price would make a fake discount.
  await assert.rejects(() => saveProduct({ id: product.id, price: 1300 }, db), { code: 'INVALID_COMPARE_PRICE' });
  await assert.rejects(() => saveVariantStock(kept.variants[0].id, 1, db, 1500), { code: 'INVALID_COMPARE_PRICE' });
  const cleared = await saveProduct({ id: product.id, compareAtPrice: null, price: 1500 }, db);
  assert.equal(cleared.compareAtPriceKurus, null);
  assert.equal(cleared.priceKurus, 150000);
});

test('"Renk ekle" creates a draft in the same colour family, with the price, its own stock codes, no stock or barcodes', async (t) => {
  const { db, cleanup } = await createProductTestDb();
  t.after(cleanup);
  const source = await createDraft(draft({ compareAtPrice: 1200, vatRate: 20, variants: [{ size: 'S', stock: 5, sku: 'SAT-S', barcode: EAN_B }] }), db);
  const bordo = await addColorVariant(db, actor, source.id, ' Bordo ');
  assert.equal(bordo.color, 'Bordo');
  assert.equal(bordo.status, 'DRAFT');
  assert.equal(bordo.name, source.name);
  assert.equal(bordo.priceKurus, 100000);
  assert.equal(bordo.compareAtPriceKurus, 120000);
  assert.equal(bordo.vatRate, 20);
  const linkedSource = await db.product.findUniqueOrThrow({ where: { id: source.id } });
  assert.ok(linkedSource.familyId && linkedSource.familyId === bordo.familyId, 'ikisi aynı ailede');
  const variants = await db.variant.findMany({ where: { productId: bordo.id } });
  assert.deepEqual(variants.map((variant) => [variant.size, variant.stock, variant.sku, variant.barcode]), [['S', 0, 'PAN-SATENTAK-BORD-S', null]]);

  await assert.rejects(() => addColorVariant(db, actor, source.id, 'bordo'), { code: 'COLOR_CONFLICT' });
  await assert.rejects(() => addColorVariant(db, actor, bordo.id, 'SİYAH'.toLocaleLowerCase('tr-TR')), { code: 'COLOR_CONFLICT' }, 'aile üyesinin rengi de sayılır');
  await assert.rejects(() => addColorVariant(db, actor, source.id, ''), { code: 'INVALID_PRODUCT' });
  const third = await addColorVariant(db, actor, bordo.id, 'Pudra');
  assert.equal(third.familyId, linkedSource.familyId, 'yeni aile açılmaz');
  assert.equal(await db.productFamily.count(), 1);
});

test('the storefront never receives stock codes or barcodes, nor a list price that is not above the price', () => {
  const record = {
    id: 'p1', slug: 's', name: 'N', priceKurus: 100000, compareAtPriceKurus: 90000, vatRate: 10, color: 'Siyah', category: 'ic-giyim', image: '/a.jpg', description: '', status: 'PUBLISHED',
    variants: [{ id: 'v1', size: 'S', stock: 2, sku: 'SECRET', barcode: EAN_A }],
    media: [], family: null,
  } as unknown as PublicProductRecord;
  const product = toPublicProduct(record);
  assert.deepEqual(product.variants, [{ id: 'v1', size: 'S', stock: 2 }]);
  assert.equal(product.compareAtPrice, null);
  assert.equal(toPublicProduct({ ...record, compareAtPriceKurus: 125000 } as PublicProductRecord).compareAtPrice, 1250);
});

test('editor model: sizes go to every colour, errors point at the cell, payload is what the API expects', () => {
  const current = groupFromProduct(
    { id: 'p1', color: 'Siyah', status: 'DRAFT', price: 1000, compareAtPrice: null, vatRate: 10, variants: [{ size: 'S', stock: 2, sku: null, barcode: null }] },
    true,
  );
  let groups: ColorGroup[] = [current, newColorGroup('Bordo', [current], false)];
  assert.equal(groups[1].price, '1000', 'yeni renk fiyatı devralır');
  assert.deepEqual(groups[1].sizes.map((row) => [row.size, row.stock]), [['S', '0']]);

  groups = applySizes(groups, ['S', 'M']);
  assert.deepEqual(groups.map((group) => group.sizes.map((row) => row.size)), [['S', 'M'], ['S', 'M']]);
  assert.deepEqual(sizesOf(groups), ['S', 'M']);
  groups = applySizes(groups, ['M']);
  assert.deepEqual(groups[0].sizes.map((row) => row.size), ['M']);

  groups[0].sizes[0].sku = 'ELLE-YAZILAN';
  assert.equal(skusToChange(groups, 'Saten Takım'), 2);
  groups = regenerateSkus(groups, 'Saten Takım');
  assert.equal(skusToChange(groups, 'Saten Takım'), 0);
  assert.equal(groups[0].sizes[0].sku, suggestSku('Saten Takım', 'Siyah', 'M'), 'elle yazılan da yenilenir');
  assert.equal(groups[1].sizes[0].sku, suggestSku('Saten Takım', 'Bordo', 'M'));
  assert.match(groups[1].sizes[0].sku, /^PAN-SATENTAK-BORD-M$/);

  const bad = structuredClone(groups);
  bad[0].sizes[0].barcode = '8690000000018';
  bad[1].sizes[0].sku = bad[0].sizes[0].sku;
  bad[1].compareAtPrice = '999';
  const errors = validateGroups(bad);
  assert.ok(errors.general);
  assert.ok(errors.cells[`${bad[0].key}|M|barcode`]);
  assert.ok(errors.cells[`${bad[1].key}|M|sku`]);
  assert.ok(errors.cells[`${bad[1].key}|compareAtPrice`]);
  assert.deepEqual(validateGroups(groups).cells, {});
  assert.ok(validateGroups([]).general);

  const sameColour = [current, newColorGroup('siyah', [current], false)];
  assert.match(validateGroups(sameColour).general ?? '', /iki kez/);

  groups[0].compareAtPrice = '1250';
  groups[0].sizes[0].barcode = EAN_A;
  assert.deepEqual(groupPayload(groups[0]), {
    color: 'Siyah',
    price: 1000,
    compareAtPrice: 1250,
    vatRate: 10,
    variants: [{ size: 'M', stock: 0, sku: groups[0].sizes[0].sku, barcode: EAN_A }],
  });
});

test('checkout copies the product VAT rate onto the order line', async () => {
  const { prisma } = await import('../src/lib/prisma');
  const { POST: checkout } = await import('../src/app/api/checkout/route');
  const { releaseOrder } = await import('../src/lib/orders/checkout-service');
  const product = await prisma.product.findFirstOrThrow({ where: { status: 'PUBLISHED', category: { not: 'hediye-karti' } }, include: { variants: true } });
  const variant = product.variants[0];
  const before = { stock: variant.stock, vatRate: product.vatRate };
  await prisma.product.update({ where: { id: product.id }, data: { vatRate: 20 } });
  await prisma.variant.update({ where: { id: variant.id }, data: { stock: 5 } });
  try {
    const res = await checkout(
      new Request('http://localhost:3000/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: 'KDV Deneme',
          customerEmail: 'kdv@example.com',
          customerPhone: '05550000000',
          shippingAddress: 'Deneme Sokak No: 1',
          shippingCity: 'Ankara',
          shippingDistrict: 'Çankaya',
          cart: [{ id: product.id, size: variant.size, quantity: 1 }],
        }),
      }),
    );
    assert.equal(res.status, 200);
    const { orderId } = await res.json();
    const items = await prisma.orderItem.findMany({ where: { orderId } });
    assert.deepEqual(items.map((item) => item.vatRate), [20]);
    await releaseOrder(prisma, orderId, 'FAILURE');
    await prisma.order.delete({ where: { id: orderId } });
  } finally {
    await prisma.product.update({ where: { id: product.id }, data: { vatRate: before.vatRate } });
    await prisma.variant.update({ where: { id: variant.id }, data: { stock: before.stock } });
  }
});

test('sizes follow the category: bras by band and cup, hosiery paired, accessories one size, the rest letters', async () => {
  const { sizeSystemFor, sizesOutsideSystem } = await import('../src/lib/products/size-systems');
  const { sortBySize } = await import('../src/lib/products/sizes');
  assert.equal(sizeSystemFor('sutyen').id, 'bra');
  assert.equal(sizeSystemFor('sutyen', 'push-up-destekli').id, 'bra');
  assert.equal(sizeSystemFor('sutyen', 'bralet').id, 'letter', 'alt kategori daha belirleyici');
  assert.equal(sizeSystemFor('aksesuarlar', 'kulotlu-corap').id, 'hosiery');
  assert.equal(sizeSystemFor('aksesuarlar', 'ipek-uyku-bandi').id, 'one-size');
  assert.equal(sizeSystemFor('ic-giyim', 'dantel-takimlar').id, 'letter');
  assert.equal(sizeSystemFor('').id, 'letter');
  const bra = sizeSystemFor('sutyen');
  assert.ok(bra.sizes.includes('75B') && bra.sizes.includes('95E'));
  assert.deepEqual(sizesOutsideSystem(bra, ['75B', 'M']), ['M']);
  const order = (sizes: string[]) => sortBySize(sizes.map((size) => ({ size }))).map(({ size }) => size);
  assert.deepEqual(order(['XL', 'S', 'M']), ['S', 'M', 'XL']);
  assert.deepEqual(order(['80A', '75C', '75B', '70D']), ['70D', '75B', '75C', '80A']);
  assert.deepEqual(order(['L/XL', 'S/M']), ['S/M', 'L/XL']);
});

test('a category that gathers sub-categories is not a place for a product', async (t) => {
  const { db, cleanup } = await createProductTestDb();
  t.after(cleanup);
  const root = await db.category.create({ data: { slug: 'sutyen', name: 'Sütyen' } });
  await db.category.create({ data: { slug: 'push-up-destekli', name: 'Push-Up', parentId: root.id } });
  await db.category.create({ data: { slug: 'aksesuarlar', name: 'Aksesuarlar' } });
  await assert.rejects(() => createDraft(draft({ category: 'sutyen' }), db), { code: 'SUBCATEGORY_REQUIRED' });
  await assert.rejects(() => createDraft(draft({ category: 'sutyen', subcategory: 'kulot-tanga' }), db), { code: 'SUBCATEGORY_REQUIRED' }, 'başka ağacın alt kategorisi');
  const placed = await createDraft(draft({ category: 'sutyen', subcategory: 'push-up-destekli' }), db);
  assert.equal(placed.subcategory, 'push-up-destekli');
  assert.ok(await createDraft(draft({ name: 'Uyku bandı', category: 'aksesuarlar' }), db), 'alt kategorisi olmayan kategori seçilebilir');
  await assert.rejects(() => saveProduct({ id: placed.id, subcategory: null }, db), { code: 'SUBCATEGORY_REQUIRED' });
  assert.equal((await saveProduct({ id: placed.id, price: 1200 }, db)).priceKurus, 120000, 'kategoriye dokunmayan kayıt engellenmez');
});
