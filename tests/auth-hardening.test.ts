import assert from 'node:assert/strict';
import test from 'node:test';
import { generateNewsletterUnsubscribeToken, generateOrderGuestToken, readSessionClaims, verifyOrderGuestToken } from '../src/lib/auth';
import { decryptSecret, encryptSecret, rootSecret, signToken, verifyToken } from '../src/lib/security/crypto';
import { totpAt, verifyTotp, generateTotpSecret, generateBackupCodes, hashBackupCode } from '../src/lib/security/totp';

test('session claims: expired or tampered tokens are refused', () => {
  const expired = signToken('session', { sid: 's1', uid: 'u1', role: 'CUSTOMER', mfa: false, exp: Date.now() - 1000 });
  assert.equal(readSessionClaims(expired), null);

  const valid = signToken('session', { sid: 's1', uid: 'u1', role: 'CUSTOMER', mfa: false, exp: Date.now() + 60_000 });
  assert.ok(readSessionClaims(valid));
  const [body, mac] = valid.split('.');
  assert.equal(readSessionClaims(`${body}.${mac.slice(0, -2)}xx`), null);
  // Changing the payload (e.g. role → ADMIN) breaks the signature.
  const forged = Buffer.from(JSON.stringify({ sid: 's1', uid: 'u1', role: 'ADMIN', mfa: true, exp: Date.now() + 60_000 })).toString('base64url');
  assert.equal(readSessionClaims(`${forged}.${mac}`), null);
});

test('each token purpose has its own key: a guest-order link is not a session', () => {
  const guest = generateOrderGuestToken('PAN-ABC');
  assert.equal(readSessionClaims(guest), null);
  assert.equal(verifyToken('session', generateNewsletterUnsubscribeToken('a@b.co')), null);
});

test('there is no built-in secret: without AUTH_SECRET nothing is signed', () => {
  const original = process.env.AUTH_SECRET;
  try {
    delete process.env.AUTH_SECRET;
    assert.throws(() => rootSecret(), /AUTH_SECRET/);
    process.env.AUTH_SECRET = 'too-short';
    assert.throws(() => rootSecret(), /32/);
  } finally {
    process.env.AUTH_SECRET = original;
  }
});

test('order guest token verification handles matching, mismatched and tampered tokens', () => {
  const token = generateOrderGuestToken('PAN-TOKEN-123456');
  assert.equal(verifyOrderGuestToken('PAN-TOKEN-123456', token), true);
  assert.equal(verifyOrderGuestToken('PAN-ANOTHER-999', token), false);
  assert.equal(verifyOrderGuestToken('PAN-TOKEN-123456', `${token}tampered`), false);
});

test('TOTP secrets are encrypted at rest and decrypt only with the key', () => {
  const sealed = encryptSecret('JBSWY3DPEHPK3PXP');
  assert.notEqual(sealed, 'JBSWY3DPEHPK3PXP');
  assert.equal(decryptSecret(sealed), 'JBSWY3DPEHPK3PXP');
  const parts = sealed.split('.');
  parts[3] = Buffer.from('tampered').toString('base64url');
  assert.equal(decryptSecret(parts.join('.')), null);
});

test('TOTP matches RFC 6238 and refuses replay of the same step', () => {
  // RFC 6238 test vector (SHA-1, secret "12345678901234567890"), T = 59 s → 94287082 (8 digits) → last 6: 287082
  const rfcSecret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';
  assert.equal(totpAt(rfcSecret, 59_000), '287082');
  const secret = generateTotpSecret();
  const now = Date.now();
  const step = verifyTotp(secret, totpAt(secret, now), now);
  assert.notEqual(step, null);
  assert.equal(verifyTotp(secret, totpAt(secret, now), now, step), null, 'aynı kod iki kez geçmez');
  assert.equal(verifyTotp(secret, '000000', now) !== null && totpAt(secret, now) !== '000000', false);
});

test('backup codes are random and stored only as hashes', () => {
  const { codes, hashes } = generateBackupCodes();
  assert.equal(codes.length, 10);
  assert.equal(new Set(codes).size, 10);
  assert.ok(codes.every((c) => /^[2-9A-Z]{4}-[2-9A-Z]{4}$/.test(c)));
  assert.equal(hashes[0], hashBackupCode(codes[0].toLowerCase().replace('-', ' ')));
});
