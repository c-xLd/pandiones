import assert from 'node:assert/strict';
import test from 'node:test';
import {
  slugifyCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoriesTree,
  getCategoryBySlug,
  reorderCategories,
} from '../src/lib/categories';

test('slugifyCategory handles Turkish characters and special symbols accurately', () => {
  assert.equal(slugifyCategory('Sütyen & Bralet'), 'sutyen-bralet');
  assert.equal(slugifyCategory('İç Giyim - Özel Seçki!'), 'ic-giyim-ozel-secki');
  assert.equal(slugifyCategory('Şık ve Çarpıcı Külotlar'), 'sik-ve-carpici-kulotlar');
  assert.equal(slugifyCategory('Gecelik / Sabahlık'), 'gecelik-sabahlik');
});

test('categories tree returns roots and their subcategories with product counts', async () => {
  const tree = await getCategoriesTree(true);
  assert.ok(tree.length >= 8, 'Expected at least 8 luxury root categories');

  const sutyen = tree.find((c) => c.slug === 'sutyen');
  assert.ok(sutyen, 'Sütyen root category must exist');
  assert.ok(sutyen.children && sutyen.children.length > 0, 'Sütyen must have subcategories');

  const bralet = sutyen.children.find((c) => c.slug === 'bralet');
  assert.ok(bralet, 'Bralet subcategory must exist under Sütyen');
  assert.equal(bralet.parentId, sutyen.id);
});

test('createCategory, updateCategory and safe delete lifecycle works properly', async () => {
  // 1. Create a root category
  const newRoot = await createCategory({
    name: 'Özel Seri Koleksiyon',
    description: 'Sınırlı edisyon parçalar',
  });
  assert.ok(newRoot.id);
  assert.equal(newRoot.slug, 'ozel-seri-koleksiyon');
  assert.equal(newRoot.isActive, true);

  // 2. Create a child subcategory
  const newSub = await createCategory({
    name: 'İpek Şal',
    parentId: newRoot.id,
  });
  assert.ok(newSub.id);
  assert.equal(newSub.parentId, newRoot.id);
  assert.equal(newSub.slug, 'ipek-sal');

  // 3. Trying to delete parent when child exists must fail
  const parentDeleteAttempt = await deleteCategory(newRoot.id);
  assert.equal(parentDeleteAttempt.success, false);
  assert.match(parentDeleteAttempt.error || '', /alt kategori bulunmaktadır/);

  // 4. Update subcategory
  const updatedSub = await updateCategory(newSub.id, {
    name: 'Lüks İpek Şal',
    isActive: false,
  });
  assert.equal(updatedSub.name, 'Lüks İpek Şal');
  assert.equal(updatedSub.isActive, false);

  // 5. Delete child first
  const childDelete = await deleteCategory(newSub.id);
  assert.equal(childDelete.success, true);

  // 6. Delete parent now succeeds
  const parentDelete = await deleteCategory(newRoot.id);
  assert.equal(parentDelete.success, true);
});

test('getCategoryBySlug returns category with active children', async () => {
  const cat = await getCategoryBySlug('kulot');
  assert.ok(cat, 'Külot category must be found by slug');
  assert.equal(cat.name, 'Külot');
  assert.ok(cat.children && cat.children.length >= 6, 'Külot must have its subcategories');
});
