import assert from 'node:assert/strict';
import test from 'node:test';
import { clientIp } from '../src/lib/security/request';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '../src/lib/prisma';
import { SESSION_COOKIE, createSession } from '../src/lib/auth';
import { isAdminIpAllowed, isCrossSiteMutation } from '../src/lib/security/edge-rules';
import { PUT as putSettings, GET as getSettings } from '../src/app/api/admin/settings/route';
import { DELETE as deleteCoupon } from '../src/app/api/admin/coupons/route';
import { POST as reauth } from '../src/app/api/auth/reauth/route';
import { totpAt } from '../src/lib/security/totp';
import { encryptSecret } from '../src/lib/security/crypto';

const req = (method: string, path: string, headers: Record<string, string> = {}) => new Request(`https://pandiones.com${path}`, { method, headers });

test('CSRF: a write from another site is refused; same-origin, non-browser and the iyzico callback pass', () => {
  assert.equal(isCrossSiteMutation(req('POST', '/api/checkout', { origin: 'https://evil.example' })), true);
  assert.equal(isCrossSiteMutation(req('DELETE', '/api/admin/coupons', { origin: 'null' })), true);
  assert.equal(isCrossSiteMutation(req('PATCH', '/api/auth/profile', { 'sec-fetch-site': 'cross-site' })), true);
  assert.equal(isCrossSiteMutation(req('POST', '/api/checkout', { origin: 'https://pandiones.com' })), false);
  assert.equal(isCrossSiteMutation(req('POST', '/api/checkout', { 'sec-fetch-site': 'same-origin' })), false);
  assert.equal(isCrossSiteMutation(req('POST', '/api/checkout')), false, 'tarayıcı dışı istek kimlik doğrulamaya kalır');
  assert.equal(isCrossSiteMutation(req('GET', '/api/products', { origin: 'https://evil.example' })), false, 'okuma isteği engellenmez');
  assert.equal(isCrossSiteMutation(req('POST', '/api/payment/callback', { origin: 'https://sandbox-api.iyzipay.com' })), false);
});

test('admin IP allow-list: off when empty, exact match when set', () => {
  const original = process.env.ADMIN_ALLOWED_IPS;
  try {
    delete process.env.ADMIN_ALLOWED_IPS;
    assert.equal(isAdminIpAllowed(req('GET', '/yonetim', { 'x-real-ip': '9.9.9.9' })), true);
    process.env.ADMIN_ALLOWED_IPS = '1.2.3.4, 5.6.7.8';
    assert.equal(isAdminIpAllowed(req('GET', '/yonetim', { 'x-real-ip': '5.6.7.8' })), true);
    assert.equal(isAdminIpAllowed(req('GET', '/yonetim', { 'x-real-ip': '9.9.9.9' })), false);
  } finally {
    if (original === undefined) delete process.env.ADMIN_ALLOWED_IPS;
    else process.env.ADMIN_ALLOWED_IPS = original;
  }
});

test('client IP comes only from the trusted proxy header; a client-typed one is ignored', () => {
  const env = process.env as Record<string, string | undefined>;
  const saved = { proxy: env.TRUSTED_PROXY, node: env.NODE_ENV };
  try {
    env.NODE_ENV = 'production';
    delete env.TRUSTED_PROXY; // Vercel
    assert.equal(clientIp(req('GET', '/', { 'x-real-ip': '5.6.7.8', 'cf-connecting-ip': '1.2.3.4', 'x-forwarded-for': '1.2.3.4' })), '5.6.7.8');
    assert.equal(clientIp(req('GET', '/', { 'cf-connecting-ip': '1.2.3.4', 'x-forwarded-for': '1.2.3.4' })), 'unknown');
    env.TRUSTED_PROXY = 'cloudflare';
    assert.equal(clientIp(req('GET', '/', { 'x-real-ip': '172.64.0.1', 'cf-connecting-ip': '5.6.7.8' })), '5.6.7.8');
    env.NODE_ENV = 'development';
    delete env.TRUSTED_PROXY;
    assert.equal(clientIp(req('GET', '/', { 'x-forwarded-for': '10.0.0.5, 10.0.0.1' })), '10.0.0.5', 'yerelde x-forwarded-for');
  } finally {
    if (saved.proxy === undefined) delete env.TRUSTED_PROXY;
    else env.TRUSTED_PROXY = saved.proxy;
    env.NODE_ENV = saved.node;
  }
});

test('sensitive admin actions need a 2FA confirmation from the last 10 minutes', async (t) => {
  const secret = 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP';
  const admin = await prisma.user.create({
    data: {
      email: `reauth-${crypto.randomUUID()}@pandiones.test`,
      name: 'Yeniden Doğrulama',
      passwordHash: await bcrypt.hash('x', 4),
      role: 'ADMIN',
      emailVerifiedAt: new Date(),
      totpSecret: encryptSecret(secret),
      totpEnabledAt: new Date(),
    },
  });
  t.after(() => prisma.user.delete({ where: { id: admin.id } }).catch(() => {}));
  const s = await createSession(admin, { mfa: true });
  const cookie = `${SESSION_COOKIE}=${s.token}`;
  await prisma.session.update({ where: { id: s.sessionId }, data: { reauthAt: new Date(Date.now() - 11 * 60 * 1000) } });

  const current = (await (await getSettings(new Request('http://localhost/api/admin/settings', { headers: { Cookie: cookie } }))).json()).settings;
  const put = () =>
    putSettings(new Request('http://localhost/api/admin/settings', { method: 'PUT', headers: { Cookie: cookie, 'Content-Type': 'application/json' }, body: JSON.stringify(current) }));
  const blocked = await put();
  assert.equal(blocked.status, 401);
  assert.equal((await blocked.json()).code, 'REAUTH_REQUIRED');
  const couponBlocked = await deleteCoupon(new Request('http://localhost/api/admin/coupons', { method: 'DELETE', headers: { Cookie: cookie, 'Content-Type': 'application/json' }, body: JSON.stringify({ id: 'x' }) }));
  assert.equal(couponBlocked.status, 401);

  const wrong = await reauth(new Request('http://localhost/api/auth/reauth', { method: 'POST', headers: { Cookie: cookie, 'Content-Type': 'application/json' }, body: JSON.stringify({ code: '000000' }) }));
  assert.equal(wrong.status, 401);
  const ok = await reauth(new Request('http://localhost/api/auth/reauth', { method: 'POST', headers: { Cookie: cookie, 'Content-Type': 'application/json' }, body: JSON.stringify({ code: totpAt(secret, Date.now()) }) }));
  assert.equal(ok.status, 200);

  const original = await prisma.storeSettings.findUnique({ where: { id: 'store' } });
  try {
    assert.equal((await put()).status, 200);
  } finally {
    if (original) await prisma.storeSettings.update({ where: { id: 'store' }, data: original });
    else await prisma.storeSettings.deleteMany({ where: { id: 'store' } });
    await prisma.auditLog.deleteMany({ where: { actorId: admin.id } });
  }
});

test('an admin whose session ended is sent to sign in; strangers still get a 404', async () => {
  const { middleware } = await import('../src/middleware');
  const { signToken } = await import('../src/lib/security/crypto');
  const { NextRequest } = await import('next/server');
  const visit = (cookie?: string) =>
    middleware(new NextRequest('http://localhost/yonetim?tab=products', cookie ? { headers: { Cookie: `${SESSION_COOKIE}=${cookie}` } } : {}));
  const ended = signToken('session', { sid: 'gone', uid: 'u', role: 'ADMIN', mfa: true, exp: Date.now() - 1000 });

  const admin = await visit(ended);
  assert.equal(admin.status, 307);
  assert.equal(new URL(admin.headers.get('location')!).pathname + new URL(admin.headers.get('location')!).search, '/yonetim/giris?neden=oturum');
  assert.equal(admin.headers.get('cache-control'), 'no-store');

  const customer = signToken('session', { sid: 'c', uid: 'u', role: 'CUSTOMER', mfa: false, exp: Date.now() + 60_000 });
  const forged = `${ended.split('.')[0]}.${'A'.repeat(43)}`;
  for (const cookie of [undefined, customer, forged]) {
    const response = await visit(cookie);
    assert.equal(response.status, 404);
    assert.equal(response.headers.get('location'), null);
  }

  // Signed out (no session cookie at all): the 90-day device marker from the last 2FA sign-in still leads to sign-in.
  const { ADMIN_DEVICE_COOKIE, adminDeviceCookie } = await import('../src/lib/auth');
  const device = (value: string) => middleware(new NextRequest('http://localhost/yonetim', { headers: { Cookie: `${ADMIN_DEVICE_COOKIE}=${value}` } }));
  const marker = adminDeviceCookie('u');
  assert.equal(marker.httpOnly, true);
  assert.equal(marker.sameSite, 'strict');
  assert.equal((await device(marker.value)).status, 307);
  const old = adminDeviceCookie('u', Date.now() - 91 * 24 * 3600 * 1000).value;
  const sessionSigned = signToken('session', { uid: 'u', exp: Date.now() + 60_000 });
  for (const value of [old, sessionSigned, 'x.y']) assert.equal((await device(value)).status, 404, 'expired, wrong-purpose or forged marker');
});
