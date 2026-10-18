import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { prisma } from '../src/lib/prisma';
import { SESSION_COOKIE, createSession, getCurrentUser } from '../src/lib/auth';
import { can, isPanelRole, toRole } from '../src/lib/security/roles';
import { canOpenTab, defaultTab, tabsFor } from '../src/app/yonetim/_lib/tabs';
import { RoleChangeError, setStaffRole } from '../src/lib/admin/staff-role';
import { GET as ordersGet } from '../src/app/api/admin/orders/route';
import { GET as stockAlertsGet } from '../src/app/api/admin/stock-alerts/route';
import { GET as statsGet } from '../src/app/api/admin/stats/route';
import { GET as settingsGet } from '../src/app/api/admin/settings/route';
import { GET as customersGet, PATCH as customersPatch } from '../src/app/api/admin/customers/route';
import { GET as searchGet } from '../src/app/api/admin/search/route';
import { GET as auditGet } from '../src/app/api/admin/audit/route';

async function makeUser(role: 'ADMIN' | 'STAFF' | 'CUSTOMER') {
  return prisma.user.create({
    data: { email: `staff-${role.toLowerCase()}-${crypto.randomUUID()}@pandiones.test`, name: `Rol Testi ${role}`, passwordHash: 'x', role, emailVerifiedAt: new Date() },
  });
}

async function cookieFor(user: { id: string; role: string }, options: { reauth?: boolean } = {}) {
  const session = await createSession(user, { mfa: true });
  if (options.reauth === false) await prisma.session.update({ where: { id: session.sessionId }, data: { reauthAt: new Date(Date.now() - 60 * 60 * 1000) } });
  return `${SESSION_COOKIE}=${session.token}`;
}

const get = (url: string, cookie: string) => new Request(`http://localhost${url}`, { headers: { Cookie: cookie } });
const patch = (url: string, body: unknown, cookie: string) =>
  new Request(`http://localhost${url}`, { method: 'PATCH', headers: { Cookie: cookie, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

test('roles: staff do catalogue and orders, admins everything, customers nothing in the panel', () => {
  assert.equal(toRole('STAFF'), 'STAFF');
  assert.equal(toRole('ADMIN'), 'ADMIN');
  assert.equal(toRole('root'), 'CUSTOMER');
  assert.equal(isPanelRole('STAFF'), true);
  assert.equal(isPanelRole('CUSTOMER'), false);
  assert.equal(can('STAFF', 'catalog'), true);
  assert.equal(can('STAFF', 'orders'), true);
  assert.equal(can('STAFF', 'admin'), false);
  assert.equal(can('ADMIN', 'admin'), true);
  assert.equal(can('CUSTOMER', 'orders'), false);
  assert.equal(can(undefined, 'catalog'), false);
});

test('panel tabs: staff see only their tabs and land on orders', () => {
  assert.deepEqual(tabsFor('STAFF').map((tab) => tab.id), ['orders', 'returns', 'products', 'categories', 'waitlist']);
  assert.equal(canOpenTab('STAFF', 'settings'), false);
  assert.equal(canOpenTab('STAFF', 'dashboard'), false);
  assert.equal(canOpenTab('ADMIN', 'settings'), true);
  assert.equal(defaultTab('STAFF'), 'orders');
  assert.equal(defaultTab('ADMIN'), 'dashboard');
});

test('a staff session needs the second factor and is a short, strict panel session', async (t) => {
  const staff = await makeUser('STAFF');
  t.after(() => prisma.user.delete({ where: { id: staff.id } }).catch(() => {}));
  await assert.rejects(() => createSession(staff, { mfa: false }), /second factor/);
  const session = await createSession(staff, { mfa: true });
  assert.equal(session.strict, true);
  assert.ok(session.idle, 'işlemsizlik sınırı var');
  const current = await getCurrentUser(new Request('http://localhost/', { headers: { Cookie: `${SESSION_COOKIE}=${session.token}` } }));
  assert.equal(current?.role, 'STAFF');
});

test('staff reach order and catalogue routes, never money, settings, customers or the activity log', async (t) => {
  const staff = await makeUser('STAFF');
  t.after(() => prisma.user.delete({ where: { id: staff.id } }).catch(() => {}));
  const cookie = await cookieFor(staff);

  assert.equal((await ordersGet(get('/api/admin/orders', cookie))).status, 200);
  assert.equal((await stockAlertsGet(get('/api/admin/stock-alerts', cookie))).status, 200);
  assert.equal((await statsGet(get('/api/admin/stats', cookie))).status, 403, 'ciro paneli yöneticide');
  assert.equal((await settingsGet(get('/api/admin/settings', cookie))).status, 403);
  assert.equal((await customersGet(get('/api/admin/customers', cookie))).status, 403);
  assert.equal((await auditGet(get('/api/admin/audit', cookie))).status, 403);

  const search = await searchGet(get('/api/admin/search?q=te', cookie));
  assert.equal(search.status, 200);
  assert.deepEqual((await search.json()).customers, [], 'personel müşteri listesinde arama yapamaz');
});

test('an admin makes a customer staff and back; sessions end, the log records it, limits hold', async (t) => {
  const admin = await makeUser('ADMIN');
  const otherAdmin = await makeUser('ADMIN');
  const customer = await makeUser('CUSTOMER');
  t.after(async () => {
    await prisma.auditLog.deleteMany({ where: { entityId: { in: [customer.id, otherAdmin.id] } } });
    await prisma.user.deleteMany({ where: { id: { in: [admin.id, otherAdmin.id, customer.id] } } });
  });
  const actor = { userId: admin.id, email: admin.email };
  const customerSession = await createSession(customer, { mfa: false });

  assert.deepEqual(await setStaffRole(prisma, actor, customer.id, 'STAFF'), { changed: true, role: 'STAFF' });
  assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: customer.id } })).role, 'STAFF');
  assert.ok((await prisma.session.findUniqueOrThrow({ where: { id: customerSession.sessionId } })).revokedAt, 'eski müşteri oturumu kapandı');
  const log = await prisma.auditLog.findFirst({ where: { action: 'user.role', entityId: customer.id } });
  assert.match(log?.summary ?? '', /Müşteri → Personel/);

  assert.deepEqual(await setStaffRole(prisma, actor, customer.id, 'STAFF'), { changed: false, role: 'STAFF' });
  assert.deepEqual(await setStaffRole(prisma, actor, customer.id, 'CUSTOMER'), { changed: true, role: 'CUSTOMER' });

  const code = async (fn: () => Promise<unknown>) => {
    try { await fn(); return 'ok'; } catch (error) { return error instanceof RoleChangeError ? error.code : String(error); }
  };
  assert.equal(await code(() => setStaffRole(prisma, actor, admin.id, 'STAFF')), 'SELF');
  assert.equal(await code(() => setStaffRole(prisma, actor, otherAdmin.id, 'CUSTOMER')), 'ADMIN_TARGET');
  assert.equal(await code(() => setStaffRole(prisma, actor, customer.id, 'ADMIN')), 'INVALID_ROLE');
  assert.equal(await code(() => setStaffRole(prisma, actor, 'yok', 'STAFF')), 'NOT_FOUND');
});

test('role change route: admin only, and only with a fresh 2FA confirmation', async (t) => {
  const admin = await makeUser('ADMIN');
  const staff = await makeUser('STAFF');
  const customer = await makeUser('CUSTOMER');
  t.after(async () => {
    await prisma.auditLog.deleteMany({ where: { entityId: customer.id } });
    await prisma.user.deleteMany({ where: { id: { in: [admin.id, staff.id, customer.id] } } });
  });

  assert.equal((await customersPatch(patch('/api/admin/customers', { userId: customer.id, role: 'STAFF' }, await cookieFor(staff)))).status, 403);

  const stale = await customersPatch(patch('/api/admin/customers', { userId: customer.id, role: 'STAFF' }, await cookieFor(admin, { reauth: false })));
  assert.equal(stale.status, 401);
  assert.equal((await stale.json()).code, 'REAUTH_REQUIRED');

  const fresh = await customersPatch(patch('/api/admin/customers', { userId: customer.id, role: 'STAFF' }, await cookieFor(admin)));
  assert.equal(fresh.status, 200);
  assert.equal((await fresh.json()).role, 'STAFF');

  const list = await customersGet(get('/api/admin/customers', await cookieFor(admin)));
  const row = (await list.json()).find((c: { id: string }) => c.id === customer.id);
  assert.equal(row?.role, 'STAFF', 'personel müşteri listesinde rolüyle görünür');
});
