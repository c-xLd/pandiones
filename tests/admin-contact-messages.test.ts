import test from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../src/lib/prisma';
import { signSession } from './helpers/session';
import { GET as getMessages, PATCH as updateMessage, DELETE as deleteMessage } from '../src/app/api/admin/contact-messages/route';

test('admin contact messages route enforces ADMIN auth and supports status updates', async (t) => {
  // 1. Anonymous rejected with 403
  const anonGet = await getMessages(new Request('http://localhost/api/admin/contact-messages'));
  assert.equal(anonGet.status, 403);

  // 2. Create message in DB
  const msg = await prisma.contactMessage.create({
    data: {
      name: 'Buse Demir',
      email: 'buse@example.com',
      subject: 'Beden Değişimi',
      message: 'S beden aldığım parça için değişim talebim var.',
      status: 'YENI',
    },
  });

  // 3. Admin session
  const adminUser = await prisma.user.create({
    data: {
      email: `admin-msg-${Date.now()}@pandiones.com`,
      name: 'Yönetici Mesaj Test',
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

  // 4. GET lists messages
  const listRes = await getMessages(new Request('http://localhost/api/admin/contact-messages', {
    headers: authHeaders,
  }));
  assert.equal(listRes.status, 200);
  const list = await listRes.json();
  const found = list.find((m: any) => m.id === msg.id);
  assert.ok(found);
  assert.equal(found.status, 'YENI');

  // 5. PATCH marks as YANITLANDI
  const patchRes = await updateMessage(new Request('http://localhost/api/admin/contact-messages', {
    method: 'PATCH',
    headers: authHeaders,
    body: JSON.stringify({ id: msg.id, status: 'YANITLANDI' }),
  }));
  assert.equal(patchRes.status, 200);
  const patchData = await patchRes.json();
  assert.equal(patchData.message.status, 'YANITLANDI');

  // 6. DELETE removes message
  const delRes = await deleteMessage(new Request('http://localhost/api/admin/contact-messages', {
    method: 'DELETE',
    headers: authHeaders,
    body: JSON.stringify({ id: msg.id }),
  }));
  assert.equal(delRes.status, 200);
});
