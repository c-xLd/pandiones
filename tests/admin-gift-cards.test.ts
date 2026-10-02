import test from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../src/lib/prisma';
import { signSession } from './helpers/session';
import { GET as getGiftCards, POST as createGiftCardAdmin, PATCH as updateGiftCardAdmin } from '../src/app/api/admin/gift-cards/route';

test('admin gift cards route enforces ADMIN authentication and CRUD operations', async (t) => {
  // 1. Anonymous GET/POST/PATCH rejected with 403
  const anonGet = await getGiftCards(new Request('http://localhost/api/admin/gift-cards'));
  assert.equal(anonGet.status, 403);

  const anonPost = await createGiftCardAdmin(new Request('http://localhost/api/admin/gift-cards', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ initialBalance: 1000, recipientName: 'Test', recipientEmail: 'test@example.com' }),
  }));
  assert.equal(anonPost.status, 403);

  const anonPatch = await updateGiftCardAdmin(new Request('http://localhost/api/admin/gift-cards', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: 'any-id', isActive: false }),
  }));
  assert.equal(anonPatch.status, 403);

  // 2. Create admin user and session
  const adminUser = await prisma.user.create({
    data: {
      email: `admin-gc-${Date.now()}@pandiones.com`,
      name: 'Yönetici Kart Test',
      passwordHash: 'hashed',
      role: 'ADMIN',
    },
  });
  // Remove the test admin even if an assertion below fails.
  t.after(() => prisma.user.delete({ where: { id: adminUser.id } }).catch(() => {}));
  const adminToken = await signSession({
    userId: adminUser.id,
    email: adminUser.email,
    name: adminUser.name,
    role: 'ADMIN',
  });
  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${adminToken}`,
  };

  // 3. Validation failure on invalid balance
  const invalidRes = await createGiftCardAdmin(new Request('http://localhost/api/admin/gift-cards', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ initialBalance: -50, recipientName: 'Test', recipientEmail: 'test@example.com' }),
  }));
  assert.equal(invalidRes.status, 400);

  // 4. Successful gift card creation
  const validRes = await createGiftCardAdmin(new Request('http://localhost/api/admin/gift-cards', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      initialBalance: 2500,
      theme: 'noir',
      recipientName: 'Selin Yılmaz',
      recipientEmail: 'selin.test@example.com',
      senderName: 'VIP Pandiones',
      giftNote: 'Özel hediye notunuz',
    }),
  }));
  assert.equal(validRes.status, 201);
  const createdBody = await validRes.json();
  assert.ok(createdBody.success);
  assert.match(createdBody.giftCard.code, /^PND-GC-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
  assert.equal(createdBody.giftCard.currentBalance, 2500);

  // 5. GET returns list containing created card
  const listRes = await getGiftCards(new Request('http://localhost/api/admin/gift-cards', {
    headers: authHeaders,
  }));
  assert.equal(listRes.status, 200);
  const list = await listRes.json();
  assert.ok(Array.isArray(list));
  const found = list.find((c: any) => c.code === createdBody.giftCard.code);
  assert.ok(found);
  assert.equal(found.recipientEmail, 'selin.test@example.com');

  // 6. PATCH toggles active status
  const patchRes = await updateGiftCardAdmin(new Request('http://localhost/api/admin/gift-cards', {
    method: 'PATCH',
    headers: authHeaders,
    body: JSON.stringify({ id: createdBody.giftCard.id, isActive: false }),
  }));
  assert.equal(patchRes.status, 200);
  const patchBody = await patchRes.json();
  assert.equal(patchBody.giftCard.isActive, false);
});
