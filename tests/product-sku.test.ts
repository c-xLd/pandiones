import assert from 'node:assert/strict';
import test from 'node:test';
import { createProductTestDb } from './helpers/product-test-db';
import { createDraft, saveProduct } from '../src/lib/admin/product-editor-service';
import { addColorVariant, linkColorProduct, listColorCandidates } from '../src/lib/admin/product-catalog';
import { suggestSku, uniqueSku } from '../src/lib/products/sku';

const actor = { userId: 'admin-test', email: 'admin@pandiones.test' };
const draft = (name: string, variants: { size: string; stock: number; sku?: string | null }[]) => ({
  name, color: 'Şampanya', category: 'ic-giyim', price: 900, description: '', variants,
});
const skus = (product: { variants: { size: string; sku: string | null }[] }) =>
  Object.fromEntries(product.variants.map((variant) => [variant.size, variant.sku]));

test('suggested code: Turkish letters to ASCII, parts shortened, fallbacks for empty parts', () => {
  assert.equal(suggestSku('Saten Gecelik Uzun', 'Şampanya', 'M'), 'PAN-SATENGEC-SAMP-M');
  assert.equal(suggestSku('İpek Üst', 'Gül Kurusu', '75B'), 'PAN-IPEKUST-GULK-75B');
  assert.equal(suggestSku('', '', ''), 'PAN-URUN-RNK-STD');
});

test('unique code: base when free, then -2, -3 …, never over 40 characters', () => {
  assert.equal(uniqueSku('PAN-A-B-M', new Set()), 'PAN-A-B-M');
  assert.equal(uniqueSku('PAN-A-B-M', new Set(['PAN-A-B-M', 'PAN-A-B-M-2'])), 'PAN-A-B-M-3');
  const long = 'X'.repeat(40);
  const code = uniqueSku(long, new Set([long]));
  assert.equal(code.length, 40);
  assert.ok(code.endsWith('-2'));
});

test('server fills empty codes from the product, keeps typed ones, and avoids codes of other products', async (t) => {
  const { db, cleanup } = await createProductTestDb();
  t.after(cleanup);
  const first = await createDraft(draft('Saten Gecelik', [{ size: 'S', stock: 1 }, { size: 'M', stock: 1, sku: 'ozel-kod' }]), db);
  assert.deepEqual(skus(first), { S: 'PAN-SATENGEC-SAMP-S', M: 'OZEL-KOD' });

  // Same first 8 letters of the name: the derived base is the same, the server adds a suffix.
  const second = await createDraft(draft('Saten Gecelik Uzun', [{ size: 'S', stock: 1 }]), db);
  assert.deepEqual(skus(second), { S: 'PAN-SATENGEC-SAMP-S-2' });

  // Empty code on save is generated; renaming does not change existing codes; a typed code stays.
  const renamed = await saveProduct({ id: first.id, name: 'Başka Ad', variants: [{ size: 'S', stock: 1 }, { size: 'M', stock: 1, sku: '' }, { size: 'L', stock: 0, sku: null }] }, db);
  assert.deepEqual(skus(renamed), { S: 'PAN-SATENGEC-SAMP-S', M: 'PAN-BASKAAD-SAMP-M', L: 'PAN-BASKAAD-SAMP-L' });

  // A typed code that another product uses is still refused.
  await assert.rejects(() => saveProduct({ id: second.id, variants: [{ size: 'S', stock: 1, sku: 'PAN-SATENGEC-SAMP-S' }] }, db), { code: 'DUPLICATE_CODE' });
});

test('a new colour gets its own codes', async (t) => {
  const { db, cleanup } = await createProductTestDb();
  t.after(cleanup);
  const source = await createDraft(draft('Pijama', [{ size: 'S', stock: 1 }, { size: 'M', stock: 1 }]), db);
  const bordo = await addColorVariant(db, actor, source.id, 'Bordo');
  const variants = await db.variant.findMany({ where: { productId: bordo.id }, orderBy: { size: 'desc' } });
  assert.deepEqual(variants.map((variant) => variant.sku), ['PAN-PIJAMA-BORD-S', 'PAN-PIJAMA-BORD-M']);
});

test('"Mevcut ürünü bağla": only same-category products outside the family are offered; linking opens a family when needed', async (t) => {
  const { db, cleanup } = await createProductTestDb();
  t.after(cleanup);
  const source = await createDraft({ ...draft('Pijama', [{ size: 'S', stock: 1 }]), color: 'Siyah' }, db);
  const ekru = await createDraft({ ...draft('Pijama Ekru', [{ size: 'S', stock: 1 }]), color: 'Ekru' }, db);
  const twin = await createDraft({ ...draft('Pijama İkiz', [{ size: 'S', stock: 1 }]), color: 'siyah' }, db);
  await createDraft({ ...draft('Sabahlık', [{ size: 'S', stock: 1 }]), color: 'Ekru', category: 'ev-giyim' }, db);

  const offered = await listColorCandidates(db, source.id);
  assert.deepEqual(offered.map((item) => item.id).sort(), [ekru.id, twin.id].sort(), 'başka kategori önerilmez');

  const linked = await linkColorProduct(db, actor, source.id, ekru.id);
  const sourceNow = await db.product.findUniqueOrThrow({ where: { id: source.id } });
  assert.ok(sourceNow.familyId && sourceNow.familyId === linked.familyId, 'aile açılır, ikisi bağlanır');
  assert.deepEqual((await listColorCandidates(db, source.id)).map((item) => item.id), [twin.id], 'bağlanan tekrar önerilmez');
  await assert.rejects(() => linkColorProduct(db, actor, source.id, twin.id), { code: 'COLOR_CONFLICT' });
  await assert.rejects(() => linkColorProduct(db, actor, source.id, source.id), { code: 'INVALID_PRODUCT' });
});
