import test from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../src/lib/prisma';
import { generateNewsletterUnsubscribeToken, verifyNewsletterUnsubscribeToken } from '../src/lib/auth';
import { POST as newsletterPost, DELETE as newsletterDelete } from '../src/app/api/newsletter/route';
import { GET as unsubscribeGet } from '../src/app/api/newsletter/unsubscribe/route';
import { getInMemoryEmailSender } from '../src/lib/email/provider';

test('newsletter unsubscribe token generates and verifies cryptographically', () => {
  const email = 'subscriber@example.com';
  const token = generateNewsletterUnsubscribeToken(email);

  assert.ok(token);
  assert.equal(verifyNewsletterUnsubscribeToken(email, token), true);
  assert.equal(verifyNewsletterUnsubscribeToken('other@example.com', token), false);
  assert.equal(verifyNewsletterUnsubscribeToken(email, 'tampered.token'), false);
});

test('subscribing sends welcome email and unsubscribing with valid token removes record', async () => {
  const email = `test-sub-${Date.now()}@example.com`;
  const sender = getInMemoryEmailSender();
  sender.clear();

  // 1. Subscribe
  const postReq = new Request('http://localhost:3000/api/newsletter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });

  const postRes = await newsletterPost(postReq);
  assert.equal(postRes.status, 200);

  // Check email sent
  const sentEmails = sender.getSentEmails();
  assert.equal(sentEmails.length, 1);
  assert.equal(sentEmails[0].to, email);
  assert.match(sentEmails[0].subject, /Hoş Geldiniz/);

  // Check DB
  const inDb = await prisma.newsletter.findUnique({ where: { email } });
  assert.ok(inDb);

  // 2. Reject unsubscribe with tampered token
  const deleteReqInvalid = new Request(`http://localhost:3000/api/newsletter?email=${encodeURIComponent(email)}&token=invalid_token`, {
    method: 'DELETE',
  });
  const deleteResInvalid = await newsletterDelete(deleteReqInvalid);
  assert.equal(deleteResInvalid.status, 403);

  // DB still has record
  assert.ok(await prisma.newsletter.findUnique({ where: { email } }));

  // 3. Unsubscribe via GET endpoint (email one-click link)
  const validToken = generateNewsletterUnsubscribeToken(email);
  const getReq = new Request(`http://localhost:3000/api/newsletter/unsubscribe?email=${encodeURIComponent(email)}&token=${encodeURIComponent(validToken)}`);
  const getRes = await unsubscribeGet(getReq);
  assert.equal(getRes.status, 200);
  const getBodyHtml = await getRes.text();
  assert.match(getBodyHtml, /Aboneliğiniz İptal Edildi/);

  // Check DB: subscriber should now be gone
  const deletedFromDb = await prisma.newsletter.findUnique({ where: { email } });
  assert.equal(deletedFromDb, null);
});
