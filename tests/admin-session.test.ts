import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '../src/lib/prisma';
import { ADMIN_IDLE_MS, ADMIN_SESSION_MS, MFA_COOKIE, SESSION_COOKIE, getCurrentUser } from '../src/lib/auth';
import { signToken } from '../src/lib/security/crypto';
import { totpAt } from '../src/lib/security/totp';
import { POST as login } from '../src/app/api/auth/login/route';
import { POST as logout } from '../src/app/api/auth/logout/route';
import { POST as register } from '../src/app/api/auth/register/route';
import { POST as verifyEmail } from '../src/app/api/auth/verify-email/route';
import { GET as setupGet, POST as setupPost } from '../src/app/api/auth/2fa/setup/route';
import { POST as mfaVerify } from '../src/app/api/auth/2fa/verify/route';
import { GET as getSession, POST as renewSession } from '../src/app/api/auth/session/route';
import { DELETE as closeSessions } from '../src/app/api/auth/sessions/route';
import { PATCH as changePassword } from '../src/app/api/auth/password/route';
import { GET as getSettings } from '../src/app/api/admin/settings/route';
import { getInMemoryEmailSender } from '../src/lib/email/provider';

const PASSWORD = 'Doğru-Atlar-Pil-Zımba-42';

const json = (url: string, body: unknown, cookie?: string, method = 'POST') =>
  new Request(`http://localhost${url}`, {
    method,
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': `10.9.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`, ...(cookie ? { Cookie: cookie } : {}) },
    body: JSON.stringify(body),
  });
const get = (url: string, cookie?: string) => new Request(`http://localhost${url}`, { headers: cookie ? { Cookie: cookie } : {} });
const cookieFrom = (res: Response, name: string) => {
  const raw = res.headers.getSetCookie?.() ?? [res.headers.get('set-cookie') ?? ''];
  for (const line of raw) {
    const match = new RegExp(`${name}=([^;]*)`).exec(line);
    if (match && match[1]) return `${name}=${match[1]}`;
  }
  return null;
};

async function makeUser(role: 'ADMIN' | 'CUSTOMER', extra: Record<string, unknown> = {}) {
  return prisma.user.create({
    data: { email: `auth-${role.toLowerCase()}-${crypto.randomUUID()}@pandiones.test`, name: 'Oturum Testi', passwordHash: await bcrypt.hash(PASSWORD, 4), role, emailVerifiedAt: new Date(), ...extra },
  });
}

test('an admin never gets a session from the password alone; 2FA setup then verify opens one', async (t) => {
  const admin = await makeUser('ADMIN');
  t.after(() => prisma.user.delete({ where: { id: admin.id } }).catch(() => {}));

  const first = await login(json('/api/auth/login', { email: admin.email, password: PASSWORD }));
  assert.equal(first.status, 200);
  assert.deepEqual(await first.json(), { success: true, mfaRequired: true, setup: true });
  assert.equal(cookieFrom(first, SESSION_COOKIE), null, 'şifreyle yönetici oturumu açılmaz');
  const pending = cookieFrom(first, MFA_COOKIE);
  assert.ok(pending);

  // Admin APIs refuse the pending cookie.
  assert.equal((await getSettings(get('/api/admin/settings', pending as string))).status, 403);

  // Parallel and repeated setup requests (React effects, reloads) must all show the same secret.
  const [setupA, setupB] = await Promise.all([setupGet(get('/api/auth/2fa/setup', pending as string)), setupGet(get('/api/auth/2fa/setup', pending as string))]);
  const setup = await setupA.json();
  assert.equal((await setupB.json()).secret, setup.secret);
  assert.equal((await (await setupGet(get('/api/auth/2fa/setup', pending as string))).json()).secret, setup.secret);
  assert.match(setup.qrSvg, /^<svg/);
  const secret = String(setup.secret).replace(/\s+/g, '');
  assert.equal((await setupPost(json('/api/auth/2fa/setup', { code: '000000' }, pending as string))).status, 400);
  const done = await setupPost(json('/api/auth/2fa/setup', { code: totpAt(secret, Date.now()) }, pending as string));
  assert.equal(done.status, 200);
  const { backupCodes } = await done.json();
  assert.equal(backupCodes.length, 10);
  const session = cookieFrom(done, SESSION_COOKIE);
  assert.ok(session);
  assert.equal((await getSettings(get('/api/admin/settings', session as string))).status, 200);

  const stored = await prisma.user.findUniqueOrThrow({ where: { id: admin.id } });
  assert.ok(stored.totpSecret && !stored.totpSecret.includes(secret), 'sır şifreli saklanır');

  // Next sign-in: verify step; a backup code works once.
  const again = await login(json('/api/auth/login', { email: admin.email, password: PASSWORD }));
  assert.equal((await again.json()).setup, false);
  const pending2 = cookieFrom(again, MFA_COOKIE) as string;
  const viaBackup = await mfaVerify(json('/api/auth/2fa/verify', { code: backupCodes[0] }, pending2));
  assert.equal(viaBackup.status, 200);
  assert.equal((await viaBackup.json()).backupCodesLeft, 9);
  const third = await login(json('/api/auth/login', { email: admin.email, password: PASSWORD }));
  const reused = await mfaVerify(json('/api/auth/2fa/verify', { code: backupCodes[0] }, cookieFrom(third, MFA_COOKIE) as string));
  assert.equal(reused.status, 401, 'yedek kod ikinci kez geçmez');
});

test('admin sessions: 8 h, 30-minute inactivity (renewable), logout revokes server-side', async (t) => {
  const admin = await makeUser('ADMIN');
  t.after(() => prisma.user.delete({ where: { id: admin.id } }).catch(() => {}));
  const { createSession } = await import('../src/lib/auth');
  const s = await createSession(admin, { mfa: true });
  const cookie = `${SESSION_COOKIE}=${s.token}`;
  assert.ok(s.exp - Date.now() <= ADMIN_SESSION_MS);

  const info = await (await getSession(get('/api/auth/session', cookie))).json();
  assert.ok(info.idleExpiresAt <= Date.now() + ADMIN_IDLE_MS);
  assert.equal((await renewSession(get('/api/auth/session', cookie) as unknown as Request)).status, 200);

  // Inactivity passed → refused everywhere.
  await prisma.session.update({ where: { id: s.sessionId }, data: { idleExpiresAt: new Date(Date.now() - 1000) } });
  assert.equal(await getCurrentUser(get('/', cookie)), null);
  await prisma.session.update({ where: { id: s.sessionId }, data: { idleExpiresAt: new Date(Date.now() + 60_000) } });
  assert.ok(await getCurrentUser(get('/', cookie)));

  // Logout revokes: the same cookie (e.g. copied) stops working.
  await logout(get('/api/auth/logout', cookie) as unknown as Request);
  assert.equal(await getCurrentUser(get('/', cookie)), null);
  assert.equal((await getSettings(get('/api/admin/settings', cookie))).status, 403);
});

test('a forged token without a session row, or an admin session without 2FA, opens nothing', async (t) => {
  const admin = await makeUser('ADMIN');
  t.after(() => prisma.user.delete({ where: { id: admin.id } }).catch(() => {}));
  const forged = signToken('session', { sid: 'does-not-exist', uid: admin.id, role: 'ADMIN', mfa: true, exp: Date.now() + 60_000 });
  assert.equal((await getSettings(get('/api/admin/settings', `${SESSION_COOKIE}=${forged}`))).status, 403);

  // A row without mfa (e.g. a customer later promoted) is not an admin session.
  await prisma.session.create({ data: { id: 'no-mfa-session', userId: admin.id, expiresAt: new Date(Date.now() + 60_000), idleExpiresAt: new Date(Date.now() + 60_000), mfa: false } });
  const noMfa = signToken('session', { sid: 'no-mfa-session', uid: admin.id, role: 'ADMIN', mfa: false, exp: Date.now() + 60_000 });
  assert.equal((await getSettings(get('/api/admin/settings', `${SESSION_COOKIE}=${noMfa}`))).status, 403);
});

test('login does not reveal whether an e-mail is registered; 10 wrong passwords lock the account', async (t) => {
  const customer = await makeUser('CUSTOMER');
  t.after(() => prisma.user.delete({ where: { id: customer.id } }).catch(() => {}));

  const unknown = await login(json('/api/auth/login', { email: `nobody-${crypto.randomUUID()}@pandiones.test`, password: PASSWORD }));
  const wrong = await login(json('/api/auth/login', { email: customer.email, password: 'yanlis-sifre-123' }));
  assert.equal(unknown.status, 401);
  assert.equal(wrong.status, 401);
  assert.deepEqual(await unknown.json(), await wrong.json());

  for (let i = 0; i < 9; i += 1) await login(json('/api/auth/login', { email: customer.email, password: `yanlis-${i}-xxxxxxx` }));
  const locked = await prisma.user.findUniqueOrThrow({ where: { id: customer.id } });
  assert.ok(locked.lockedUntil && locked.lockedUntil > new Date(), 'hesap kilitlenir');
  // Even the right password is refused while locked (per-account rate limit or lockout).
  const right = await login(json('/api/auth/login', { email: customer.email, password: PASSWORD }));
  assert.ok([401, 429].includes(right.status), String(right.status));
  // The lock itself holds even when the rate-limit window is over.
  const { authenticate } = await import('../src/lib/auth/login-service');
  assert.equal((await authenticate(prisma, customer.email, PASSWORD)).kind, 'locked');
});

test('registration answers the same for new and existing e-mails, and signs in only after the e-mail link', async (t) => {
  const sender = getInMemoryEmailSender();
  const existing = await makeUser('CUSTOMER');
  const fresh = `new-${crypto.randomUUID()}@pandiones.test`;
  t.after(async () => {
    await prisma.user.deleteMany({ where: { email: { in: [existing.email, fresh] } } });
  });

  const a = await register(json('/api/auth/register', { name: 'Yeni Kişi', email: fresh, password: PASSWORD }));
  const b = await register(json('/api/auth/register', { name: 'Yeni Kişi', email: existing.email, password: PASSWORD }));
  assert.equal(a.status, 200);
  assert.equal(b.status, 200);
  assert.deepEqual(await a.json(), await b.json());
  assert.equal(cookieFrom(a, SESSION_COOKIE), null, 'kayıt oturum açmaz');

  const weak = await register(json('/api/auth/register', { name: 'Kısa', email: `x-${crypto.randomUUID()}@pandiones.test`, password: 'kisa' }));
  assert.equal(weak.status, 400);

  // Not verified yet → cannot sign in (and a fresh link is sent).
  const early = await login(json('/api/auth/login', { email: fresh, password: PASSWORD }));
  assert.equal(early.status, 403);
  assert.equal((await early.json()).code, 'EMAIL_NOT_VERIFIED');

  const mail = sender.getSentEmails().reverse().find((m) => m.to === fresh && /doğrulayın/i.test(m.subject));
  assert.ok(mail, 'doğrulama e-postası gider');
  const token = decodeURIComponent(/token=([^"&\s<]+)/.exec(mail!.html)![1]);
  const verified = await verifyEmail(json('/api/auth/verify-email', { token }));
  assert.equal(verified.status, 200);
  assert.ok(cookieFrom(verified, SESSION_COOKIE));
  assert.equal((await verifyEmail(json('/api/auth/verify-email', { token }))).status, 410, 'bağlantı tek kullanımlık');
});

test('changing the password closes the other sessions but keeps this one', async (t) => {
  const user = await makeUser('CUSTOMER');
  t.after(() => prisma.user.delete({ where: { id: user.id } }).catch(() => {}));
  const { createSession } = await import('../src/lib/auth');
  const here = `${SESSION_COOKIE}=${(await createSession(user, { mfa: false })).token}`;
  const there = `${SESSION_COOKIE}=${(await createSession(user, { mfa: false })).token}`;

  const res = await changePassword(json('/api/auth/password', { currentPassword: PASSWORD, newPassword: 'Yepyeni-Uzun-Sifre-2026', confirmPassword: 'Yepyeni-Uzun-Sifre-2026' }, here, 'PATCH'));
  assert.equal(res.status, 200);
  assert.ok(await getCurrentUser(get('/', here)));
  assert.equal(await getCurrentUser(get('/', there)), null);

  // "Close other sessions" from the account page.
  const another = `${SESSION_COOKIE}=${(await createSession(user, { mfa: false })).token}`;
  const closed = await closeSessions(json('/api/auth/sessions', { others: true }, here, 'DELETE'));
  assert.equal((await closed.json()).revoked, 1);
  assert.equal(await getCurrentUser(get('/', another)), null);
});
