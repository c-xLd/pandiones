import test from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../src/lib/prisma';
import { signSession } from './helpers/session';
import { GET as getSettings, PUT as putSettings } from '../src/app/api/admin/settings/route';
import { GET as getAudit } from '../src/app/api/admin/audit/route';
import { GET as getSearch } from '../src/app/api/admin/search/route';
import { SETTINGS_DEFAULTS, diffSettings, validateSettings, whatsappHref } from '../src/lib/settings/shared';
import { isMaintenanceExempt } from '../src/lib/settings/maintenance';

const valid = { ...SETTINGS_DEFAULTS };

test('validateSettings accepts the defaults and normalises input', () => {
  const result = validateSettings({
    ...valid,
    contactEmail: '  Destek@Pandiones.com ',
    whatsappNumber: '+90 (555) 123 45 67',
    shippingFee: '49,90',
    freeShippingThreshold: '',
    lowStockThreshold: '4',
    announcementEnabled: 'true',
    announcementText: 'Yeni sezon',
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.values.contactEmail, 'destek@pandiones.com');
  assert.equal(result.values.whatsappNumber, '905551234567');
  assert.equal(result.values.shippingFee, 49.9);
  assert.equal(result.values.freeShippingThreshold, null);
  assert.equal(result.values.lowStockThreshold, 4);
  assert.equal(result.values.announcementEnabled, true);
});

test('validateSettings rejects bad values with field messages', () => {
  const result = validateSettings({
    ...valid,
    storeName: '',
    contactEmail: 'yok',
    whatsappNumber: '123',
    instagramUrl: 'http://evil.example.com',
    shippingFee: -5,
    freeShippingThreshold: 0,
    announcementEnabled: true,
    announcementText: '',
    announcementHref: 'javascript:alert(1)',
    seoTitle: 'x'.repeat(71),
    lowStockThreshold: 2.5,
  });
  assert.equal(result.ok, false);
  if (result.ok) return;
  for (const field of ['storeName', 'contactEmail', 'whatsappNumber', 'instagramUrl', 'shippingFee', 'freeShippingThreshold', 'announcementText', 'announcementHref', 'seoTitle', 'lowStockThreshold']) {
    assert.ok(result.errors[field as keyof typeof result.errors], `${field} hata vermeli`);
  }
});

test('announcement link accepts site paths and https only', () => {
  for (const href of ['/yeni-gelenler', 'https://pandiones.com/x']) {
    assert.equal(validateSettings({ ...valid, announcementHref: href }).ok, true, href);
  }
  for (const href of ['//evil.com', 'http://pandiones.com', 'javascript:alert(1)']) {
    assert.equal(validateSettings({ ...valid, announcementHref: href }).ok, false, href);
  }
});

test('diffSettings lists only changed fields', () => {
  assert.deepEqual(diffSettings(valid, { ...valid, shippingFee: 50, lowStockThreshold: 3 }), { shippingFee: [0, 50] });
});

test('whatsappHref builds a wa.me link only for a plausible number', () => {
  assert.equal(whatsappHref(null), null);
  assert.equal(whatsappHref('123'), null);
  assert.equal(whatsappHref('+90 555 123 45 67'), 'https://wa.me/905551234567');
});

test('maintenance keeps the admin panel, sign-in, payment callback and files reachable', () => {
  for (const path of ['/yonetim', '/yonetim?tab=settings'.split('?')[0], '/giris-yap', '/bakim', '/api/admin/settings', '/api/auth/login', '/api/payment/callback', '/robots.txt', '/assets/x.png']) {
    assert.equal(isMaintenanceExempt(path), true, path);
  }
  for (const path of ['/', '/sutyen', '/urun/pembe-balen', '/api/checkout', '/api/products', '/yonetimx', '/odeme']) {
    assert.equal(isMaintenanceExempt(path), false, path);
  }
});

async function makeUser(role: 'ADMIN' | 'CUSTOMER') {
  const user = await prisma.user.create({
    data: { email: `settings-${role.toLowerCase()}-${Date.now()}-${Math.random().toString(36).slice(2)}@pandiones.test`, name: `Ayar ${role}`, passwordHash: 'x', role },
  });
  const token = await signSession({ userId: user.id, email: user.email, name: user.name, role });
  return { user, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } };
}

test('settings, audit and search routes refuse anonymous and customer requests', async () => {
  const customer = await makeUser('CUSTOMER');
  try {
    const calls: [string, (req: Request) => Promise<Response>, string?][] = [
      ['http://localhost/api/admin/settings', getSettings],
      ['http://localhost/api/admin/settings', putSettings, 'PUT'],
      ['http://localhost/api/admin/audit', getAudit],
      ['http://localhost/api/admin/search?q=pa', getSearch],
    ];
    for (const [url, handler, method] of calls) {
      const body = method === 'PUT' ? JSON.stringify(valid) : undefined;
      assert.equal((await handler(new Request(url, { method, body }))).status, 403, `${url} oturumsuz`);
      assert.equal((await handler(new Request(url, { method, body, headers: customer.headers }))).status, 403, `${url} müşteri`);
    }
  } finally {
    await prisma.user.delete({ where: { id: customer.user.id } });
  }
});

test('admin saves settings with an audit line, gets 422 on bad input and 409 on a stale form', async () => {
  const admin = await makeUser('ADMIN');
  const original = await prisma.storeSettings.findUnique({ where: { id: 'store' } });
  try {
    const current = await (await getSettings(new Request('http://localhost/api/admin/settings', { headers: admin.headers }))).json();
    assert.ok(current.settings);

    const bad = await putSettings(new Request('http://localhost/api/admin/settings', {
      method: 'PUT',
      headers: admin.headers,
      body: JSON.stringify({ ...current.settings, contactEmail: 'yok' }),
    }));
    assert.equal(bad.status, 422);
    assert.ok((await bad.json()).fieldErrors.contactEmail);

    const nextThreshold = current.settings.lowStockThreshold === 7 ? 8 : 7;
    const ok = await putSettings(new Request('http://localhost/api/admin/settings', {
      method: 'PUT',
      headers: admin.headers,
      body: JSON.stringify({ ...current.settings, lowStockThreshold: nextThreshold }),
    }));
    assert.equal(ok.status, 200);
    const saved = (await ok.json()).settings;
    assert.equal(saved.lowStockThreshold, nextThreshold);
    assert.ok(saved.updatedAt);

    const log = await prisma.auditLog.findFirst({ where: { actorId: admin.user.id, action: 'settings.update' }, orderBy: { createdAt: 'desc' } });
    assert.ok(log, 'ayar değişikliği etkinlik kaydına yazılmalı');
    assert.deepEqual(JSON.parse(log.diff ?? '{}').lowStockThreshold, [current.settings.lowStockThreshold, nextThreshold]);

    // The form still carries the old updatedAt: refused, nothing overwritten.
    const stale = await putSettings(new Request('http://localhost/api/admin/settings', {
      method: 'PUT',
      headers: admin.headers,
      body: JSON.stringify({ ...current.settings, lowStockThreshold: 2 }),
    }));
    assert.equal(stale.status, 409);
    assert.equal((await prisma.storeSettings.findUniqueOrThrow({ where: { id: 'store' } })).lowStockThreshold, nextThreshold);

    const audit = await getAudit(new Request('http://localhost/api/admin/audit?entity=settings', { headers: admin.headers }));
    assert.equal(audit.status, 200);
    assert.ok((await audit.json()).entries.some((entry: { id: string }) => entry.id === log.id));
  } finally {
    await prisma.auditLog.deleteMany({ where: { actorId: admin.user.id } });
    if (original) await prisma.storeSettings.update({ where: { id: 'store' }, data: original });
    else await prisma.storeSettings.deleteMany({ where: { id: 'store' } });
    await prisma.user.delete({ where: { id: admin.user.id } });
  }
});

test('admin search finds an order by number and ignores one-letter queries', async () => {
  const admin = await makeUser('ADMIN');
  const orderNumber = `PAN-SRCH-${Date.now()}`;
  const order = await prisma.order.create({
    data: {
      orderNumber,
      customerName: 'Arama Testi',
      customerEmail: 'arama@example.com',
      customerPhone: '05550000000',
      shippingAddress: 'Deneme',
      shippingCity: 'Ankara',
      shippingDistrict: 'Çankaya',
      totalAmount: 100,
    },
  });
  try {
    const short = await (await getSearch(new Request('http://localhost/api/admin/search?q=P', { headers: admin.headers }))).json();
    assert.deepEqual(short, { orders: [], products: [], customers: [] });
    const found = await (await getSearch(new Request(`http://localhost/api/admin/search?q=${orderNumber}`, { headers: admin.headers }))).json();
    assert.equal(found.orders[0]?.orderNumber, orderNumber);
  } finally {
    await prisma.order.delete({ where: { id: order.id } });
    await prisma.user.delete({ where: { id: admin.user.id } });
  }
});
