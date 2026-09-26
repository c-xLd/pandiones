import assert from 'node:assert/strict';
import test from 'node:test';
import { POST as contactHandler } from '../src/app/api/contact/route';
import { POST as orderTrackHandler } from '../src/app/api/orders/track/route';
import { getCategoriesTree } from '../src/lib/categories';

test('contact API rejects invalid submissions with clear Turkish errors', async () => {
  // Test 1: Empty name
  const req1 = new Request('http://localhost:3000/api/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: '',
      email: 'test@example.com',
      message: 'Bu bir test mesajıdır.',
    }),
  });
  const res1 = await contactHandler(req1);
  const data1 = await res1.json();
  assert.equal(res1.status, 400);
  assert.match(data1.error, /adınızı ve soyadınızı/);

  // Test 2: Invalid email
  const req2 = new Request('http://localhost:3000/api/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Ayşe Yılmaz',
      email: 'gecersiz-eposta',
      message: 'Bu bir test mesajıdır.',
    }),
  });
  const res2 = await contactHandler(req2);
  const data2 = await res2.json();
  assert.equal(res2.status, 400);
  assert.match(data2.error, /geçerli bir e-posta/);

  // Test 3: Message too short
  const req3 = new Request('http://localhost:3000/api/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Ayşe Yılmaz',
      email: 'ayse@example.com',
      message: 'Kısa',
    }),
  });
  const res3 = await contactHandler(req3);
  const data3 = await res3.json();
  assert.equal(res3.status, 400);
  assert.match(data3.error, /en az 10 karakterlik/);
});

test('contact API accepts valid submission and responds with success', async () => {
  const req = new Request('http://localhost:3000/api/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Selin Doğan',
      email: 'selin@example.com',
      phone: '05551234567',
      subject: 'Beden & Kalıp Danışmanlığı',
      message: 'İtalyan danteli bralet bedenleri hakkında bilgi almak istiyorum.',
    }),
  });
  const res = await contactHandler(req);
  const data = await res.json();
  assert.equal(res.status, 200);
  assert.equal(data.success, true);
  assert.ok(data.message.includes('başarıyla iletildi'));
});

test('order tracking API validates credentials and returns 400 on empty input', async () => {
  const req = new Request('http://localhost:3000/api/orders/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      orderNumber: '',
      email: '',
    }),
  });
  const res = await orderTrackHandler(req);
  const data = await res.json();
  assert.equal(res.status, 400);
  assert.match(data.error, /sipariş numarası ve e-posta/);
});

test('order tracking API returns 404 for unknown order credentials', async () => {
  const req = new Request('http://localhost:3000/api/orders/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      orderNumber: 'PAN-NONEXISTENT',
      email: 'nonexistent@example.com',
    }),
  });
  const res = await orderTrackHandler(req);
  const data = await res.json();
  assert.equal(res.status, 404);
  assert.match(data.error, /eşleşen bir sipariş bulunamadı/);
});

test('categories tree has all 8 luxury root categories seeded', async () => {
  const tree = await getCategoriesTree(false);
  const rootSlugs = tree.map((c) => c.slug);

  const expectedCategories = [
    'sutyen',
    'kulot',
    'ic-giyim',
    'fantezi-giyim',
    'top-ve-body',
    'ev-giyim',
    'aksesuarlar',
    'toparlayici-ic-camasiri',
  ];

  for (const slug of expectedCategories) {
    assert.ok(
      rootSlugs.includes(slug),
      `Expected category '${slug}' to be present in category tree`
    );
  }
});
