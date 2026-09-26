import assert from 'node:assert/strict';
import test from 'node:test';
import bcrypt from 'bcryptjs';
import { prisma } from '../src/lib/prisma';
import { signSession } from '../src/lib/auth';
import { PATCH as updateProfile } from '../src/app/api/auth/profile/route';
import { PATCH as updatePassword } from '../src/app/api/auth/password/route';
import { GET as getNewsletterStatus, POST as toggleNewsletter } from '../src/app/api/newsletter/account/route';

test('account APIs security and functional validation', async (t) => {
  const testEmail = `hesap_test_${Date.now()}@pandiones.test`;
  const initialPassword = 'InitialPassword123!';
  const initialPasswordHash = await bcrypt.hash(initialPassword, 10);

  const testUser = await prisma.user.create({
    data: {
      name: 'Test Kullanıcı',
      email: testEmail,
      phone: '05551112233',
      passwordHash: initialPasswordHash,
      role: 'CUSTOMER',
    },
  });

  const sessionToken = signSession({
    userId: testUser.id,
    email: testUser.email,
    name: testUser.name,
    role: testUser.role as any,
  });

  const makeAuthReq = (url: string, method: string, body?: Record<string, unknown>, useToken = true) => {
    return new Request(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(useToken ? { Cookie: `pandiones_auth=${sessionToken}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  };

  await t.test('profile update requires authentication', async () => {
    const unauthReq = makeAuthReq('http://localhost:3000/api/auth/profile', 'PATCH', { name: 'Yeni İsim' }, false);
    const res = await updateProfile(unauthReq);
    assert.equal(res.status, 401);
  });

  await t.test('profile update rejects invalid names', async () => {
    const emptyReq = makeAuthReq('http://localhost:3000/api/auth/profile', 'PATCH', { name: '  ' });
    const res = await updateProfile(emptyReq);
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.match(data.error, /en az 2 karakter/i);
  });

  await t.test('profile update successfully updates name and phone', async () => {
    const validReq = makeAuthReq('http://localhost:3000/api/auth/profile', 'PATCH', {
      name: 'Ahmet Pandiones',
      phone: '05329998877',
    });
    const res = await updateProfile(validReq);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.user.name, 'Ahmet Pandiones');
    assert.equal(data.user.phone, '05329998877');

    const dbUser = await prisma.user.findUnique({ where: { id: testUser.id } });
    assert.equal(dbUser?.name, 'Ahmet Pandiones');
    assert.equal(dbUser?.phone, '05329998877');
  });

  await t.test('password update rejects unauthenticated request', async () => {
    const unauthReq = makeAuthReq('http://localhost:3000/api/auth/password', 'PATCH', {
      currentPassword: initialPassword,
      newPassword: 'NewPassword123!',
      confirmPassword: 'NewPassword123!',
    }, false);
    const res = await updatePassword(unauthReq);
    assert.equal(res.status, 401);
  });

  await t.test('password update rejects mismatched passwords', async () => {
    const req = makeAuthReq('http://localhost:3000/api/auth/password', 'PATCH', {
      currentPassword: initialPassword,
      newPassword: 'NewPassword123!',
      confirmPassword: 'DifferentPassword!',
    });
    const res = await updatePassword(req);
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.match(data.error, /eşleşmiyor/i);
  });

  await t.test('password update rejects wrong current password', async () => {
    const req = makeAuthReq('http://localhost:3000/api/auth/password', 'PATCH', {
      currentPassword: 'WrongPassword!',
      newPassword: 'NewPassword123!',
      confirmPassword: 'NewPassword123!',
    });
    const res = await updatePassword(req);
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.match(data.error, /mevcut şifrenizi hatalı/i);
  });

  await t.test('password update rejects identical new password', async () => {
    const req = makeAuthReq('http://localhost:3000/api/auth/password', 'PATCH', {
      currentPassword: initialPassword,
      newPassword: initialPassword,
      confirmPassword: initialPassword,
    });
    const res = await updatePassword(req);
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.match(data.error, /aynı olamaz/i);
  });

  await t.test('password update successfully updates password', async () => {
    const newPassword = 'BrandNewSecurePassword2026!';
    const req = makeAuthReq('http://localhost:3000/api/auth/password', 'PATCH', {
      currentPassword: initialPassword,
      newPassword,
      confirmPassword: newPassword,
    });
    const res = await updatePassword(req);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);

    const dbUser = await prisma.user.findUnique({ where: { id: testUser.id } });
    assert.ok(dbUser);
    const isValid = await bcrypt.compare(newPassword, dbUser.passwordHash);
    assert.equal(isValid, true);
  });

  await t.test('newsletter account preference get and toggle works', async () => {
    // 1. Initial check - not subscribed
    const statusReq = makeAuthReq('http://localhost:3000/api/newsletter/account', 'GET');
    const resStatus1 = await getNewsletterStatus(statusReq);
    assert.equal(resStatus1.status, 200);
    const dataStatus1 = await resStatus1.json();
    assert.equal(dataStatus1.subscribed, false);

    // 2. Toggle to subscribe
    const subReq = makeAuthReq('http://localhost:3000/api/newsletter/account', 'POST', { subscribe: true });
    const resSub = await toggleNewsletter(subReq);
    assert.equal(resSub.status, 200);
    const dataSub = await resSub.json();
    assert.equal(dataSub.subscribed, true);

    const dbSub = await prisma.newsletter.findUnique({ where: { email: testEmail } });
    assert.ok(dbSub);

    // 3. Toggle to unsubscribe
    const unsubReq = makeAuthReq('http://localhost:3000/api/newsletter/account', 'POST', { subscribe: false });
    const resUnsub = await toggleNewsletter(unsubReq);
    assert.equal(resUnsub.status, 200);
    const dataUnsub = await resUnsub.json();
    assert.equal(dataUnsub.subscribed, false);

    const dbUnsub = await prisma.newsletter.findUnique({ where: { email: testEmail } });
    assert.equal(dbUnsub, null);
  });

  // Cleanup test user
  await prisma.user.delete({ where: { id: testUser.id } }).catch(() => {});
});
