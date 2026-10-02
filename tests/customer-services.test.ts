import assert from 'node:assert/strict';
import test from 'node:test';
import { POST as contactHandler } from '../src/app/api/contact/route';
import { POST as orderTrackHandler } from '../src/app/api/orders/track/route';
import { getCategoriesTree } from '../src/lib/categories';
import { prisma } from '../src/lib/prisma';
import { getInMemoryEmailSender } from '../src/lib/email/provider';
import { generateContactNotificationEmail } from '../src/lib/email/templates';

const contactRequest = (body: Record<string, unknown>) =>
  new Request('http://localhost:3000/api/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

const validContact = {
  name: 'Selin Doğan',
  email: 'selin.contact-test@example.com',
  phone: '0555 123 45 67',
  subject: 'Beden danışmanlığı',
  message: 'Bralet bedenleri hakkında bilgi almak istiyorum.',
};

test('contact API rejects invalid submissions with field-level Turkish errors', async () => {
  const res1 = await contactHandler(contactRequest({ ...validContact, name: '' }));
  const data1 = await res1.json();
  assert.equal(res1.status, 400);
  assert.equal(data1.field, 'name');
  assert.match(data1.error, /adınızı ve soyadınızı/i);

  const res2 = await contactHandler(contactRequest({ ...validContact, email: 'gecersiz-eposta' }));
  assert.equal(res2.status, 400);
  assert.match((await res2.json()).error, /geçerli bir e-posta/i);

  const res3 = await contactHandler(contactRequest({ ...validContact, message: 'Kısa' }));
  assert.equal(res3.status, 400);
  assert.match((await res3.json()).error, /en az 10 karakter/);

  const res4 = await contactHandler(contactRequest({ ...validContact, subject: 'Uydurma konu' }));
  assert.equal((await res4.json()).field, 'subject');

  const res5 = await contactHandler(contactRequest({ ...validContact, website: 'http://spam.example' }));
  assert.equal(res5.status, 400);
});

test('contact API stores the message and reports success only after the inbox e-mail went out', async () => {
  const sender = getInMemoryEmailSender();
  sender.clear();
  try {
    const res = await contactHandler(contactRequest(validContact));
    const data = await res.json();
    assert.equal(res.status, 201);
    assert.equal(data.success, true);

    const saved = await prisma.contactMessage.findUnique({ where: { id: data.id } });
    assert.ok(saved?.notifiedAt, 'notifiedAt is set after delivery');
    const sent = sender.getSentEmails();
    assert.equal(sent.length, 1);
    assert.equal(sent[0].replyTo, validContact.email);
    assert.match(sent[0].subject, /Beden danışmanlığı/);
  } finally {
    await prisma.contactMessage.deleteMany({ where: { email: validContact.email } });
  }
});

test('contact API keeps the message but returns an error when the inbox e-mail cannot be sent', async () => {
  const env = process.env as Record<string, string | undefined>;
  const previous = { nodeEnv: env.NODE_ENV, key: env.RESEND_API_KEY };
  env.NODE_ENV = 'production';
  delete env.RESEND_API_KEY;
  try {
    const res = await contactHandler(contactRequest({ ...validContact, message: 'Escape <b>test</b> & teslimat sorusu.' }));
    const data = await res.json();
    assert.equal(res.status, 503);
    assert.equal(data.code, 'NOTIFY_FAILED');
    const saved = await prisma.contactMessage.findFirst({ where: { email: validContact.email } });
    assert.ok(saved, 'message is kept for recovery');
    assert.equal(saved?.notifiedAt, null);
  } finally {
    env.NODE_ENV = previous.nodeEnv;
    if (previous.key) env.RESEND_API_KEY = previous.key;
    await prisma.contactMessage.deleteMany({ where: { email: validContact.email } });
  }
});

test('contact e-mail escapes customer-typed HTML', () => {
  const email = generateContactNotificationEmail({
    inboxEmail: 'destek@pandiones.com',
    name: '<script>x</script>',
    email: 'a@example.com',
    subject: 'Diğer',
    message: '<img src=x onerror=alert(1)>',
    receivedAt: new Date('2026-09-30T10:00:00Z'),
  });
  assert.ok(!email.html.includes('<script>'));
  assert.ok(!email.html.includes('<img src=x'));
  assert.ok(email.html.includes('&lt;script&gt;'));
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
