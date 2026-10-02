import assert from 'node:assert/strict';
import test from 'node:test';
import { prisma } from '../src/lib/prisma';
import { signSession } from './helpers/session';
import { GET as getAddresses, POST as createAddress, PATCH as updateAddress, DELETE as deleteAddress } from '../src/app/api/auth/addresses/route';

test('account addresses API security and functional validation', async (t) => {
  const testEmail = `address_test_${Date.now()}@pandiones.test`;

  const testUser = await prisma.user.create({
    data: {
      name: 'Adres Test Kullanıcı',
      email: testEmail,
      phone: '05553334455',
      passwordHash: 'dummyhash',
      role: 'CUSTOMER',
    },
  });

  const sessionToken = await signSession({
    userId: testUser.id,
    email: testUser.email,
    name: testUser.name,
    role: testUser.role as any,
  });

  const makeReq = (url: string, method: string, body?: Record<string, unknown>, useToken = true) => {
    return new Request(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(useToken ? { Cookie: `pandiones_auth=${sessionToken}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  };

  let createdAddressId: string | null = null;

  await t.test('addresses GET requires authentication', async () => {
    const unauthReq = makeReq('http://localhost:3000/api/auth/addresses', 'GET', undefined, false);
    const res = await getAddresses(unauthReq);
    // Since getAddresses reads from getCurrentUser which reads cookies via next/headers
    // unauthenticated returns 401
    assert.equal(res.status, 401);
  });

  await t.test('addresses POST requires authentication', async () => {
    const unauthReq = makeReq('http://localhost:3000/api/auth/addresses', 'POST', {
      title: 'Ev',
      recipient: 'Test Kişi',
      phone: '05550001122',
      address: 'Test Sokak No: 1',
      district: 'Kadıköy',
      city: 'İstanbul',
    }, false);
    const res = await createAddress(unauthReq);
    assert.equal(res.status, 401);
  });

  await t.test('addresses POST rejects incomplete mandatory fields', async () => {
    const invalidReq = makeReq('http://localhost:3000/api/auth/addresses', 'POST', {
      title: 'Ev',
      recipient: '',
      phone: '05550001122',
      address: '',
      district: 'Kadıköy',
      city: 'İstanbul',
    }, true);
    // When using Next Request with cookies set in headers, let's verify payload validation
    const res = await createAddress(invalidReq);
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.match(data.error, /giriniz/i);
  });

  await t.test('addresses POST successfully creates address', async () => {
    const validReq = makeReq('http://localhost:3000/api/auth/addresses', 'POST', {
      title: 'İş',
      recipient: 'Adres Test Kullanıcı',
      phone: '05553334455',
      address: 'Büyükdere Cad. No: 123',
      district: 'Levent',
      city: 'İstanbul',
      postalCode: '34394',
      isDefault: true,
    }, true);
    const res = await createAddress(validReq);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.address?.id);
    createdAddressId = data.address.id;
  });

  await t.test('addresses PATCH marks address as default', async () => {
    if (!createdAddressId) return;
    const patchReq = makeReq('http://localhost:3000/api/auth/addresses', 'PATCH', {
      id: createdAddressId,
      isDefault: true,
    }, true);
    const res = await updateAddress(patchReq);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
  });

  await t.test('addresses DELETE removes address', async () => {
    if (!createdAddressId) return;
    const delReq = makeReq(`http://localhost:3000/api/auth/addresses?id=${createdAddressId}`, 'DELETE', undefined, true);
    const res = await deleteAddress(delReq);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    createdAddressId = null;
  });

  // Cleanup helper
  t.after(async () => {
    try {
      if (createdAddressId) {
        await prisma.address.delete({ where: { id: createdAddressId } }).catch(() => {});
      }
      await prisma.user.delete({ where: { id: testUser.id } }).catch(() => {});
    } catch {
      // ignore cleanup errors
    }
  });
});
