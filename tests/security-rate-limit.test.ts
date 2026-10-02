import assert from 'node:assert/strict';
import test from 'node:test';
import crypto from 'node:crypto';
import { prisma } from '../src/lib/prisma';
import { enforce, hit, pruneRateLimits } from '../src/lib/security/rate-limit';

test('fixed window: the limit+1st hit is refused with Retry-After, then the window resets', async () => {
  const key = `test:${crypto.randomUUID()}`;
  const rule = { limit: 3, windowMs: 60_000 };
  const t0 = new Date();
  for (let i = 0; i < 3; i += 1) assert.equal((await hit(key, rule, prisma, t0)).ok, true);
  const blocked = await hit(key, rule, prisma, t0);
  assert.equal(blocked.ok, false);
  if (!blocked.ok) assert.ok(blocked.retryAfterSeconds > 0 && blocked.retryAfterSeconds <= 60);
  assert.equal((await hit(key, rule, prisma, new Date(t0.getTime() + 61_000))).ok, true, 'pencere dolunca yeniden açılır');
  await prisma.rateLimitBucket.deleteMany({ where: { key } });
});

test('parallel hits are all counted (no lost updates)', async () => {
  const key = `test:${crypto.randomUUID()}`;
  const rule = { limit: 5, windowMs: 60_000 };
  const results = await Promise.all(Array.from({ length: 8 }, () => hit(key, rule)));
  assert.equal(results.filter((r) => r.ok).length, 5);
  await prisma.rateLimitBucket.deleteMany({ where: { key } });
});

test('enforce answers 429 per IP and per subject when limits are on', async () => {
  const original = process.env.RATE_LIMIT;
  process.env.RATE_LIMIT = 'on';
  try {
    const ip = `10.250.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`;
    const req = () => new Request('http://localhost/api/orders/track', { method: 'POST', headers: { 'x-forwarded-for': ip } });
    let last: Response | null = null;
    for (let i = 0; i < 11; i += 1) last = await enforce(req(), 'orderTrack');
    assert.ok(last);
    assert.equal(last!.status, 429);
    assert.ok(Number(last!.headers.get('Retry-After')) > 0);
  } finally {
    process.env.RATE_LIMIT = original;
    await pruneRateLimits(prisma, new Date(Date.now() + 24 * 60 * 60 * 1000));
  }
});
