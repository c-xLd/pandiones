import assert from 'node:assert/strict';
import test from 'node:test';
import {
  signSession,
  verifySession,
  getSecret,
  generateOrderGuestToken,
  verifyOrderGuestToken,
} from '../src/lib/auth';

test('auth session expires when past expiration date', () => {
  const expiredSession = signSession({
    userId: 'usr_test_123',
    email: 'test@example.com',
    name: 'Süresi Dolmuş',
    role: 'CUSTOMER',
    exp: Date.now() - 1000, // Expired 1 second ago
  });

  const verified = verifySession(expiredSession);
  assert.equal(verified, null, 'Expired session must return null');
});

test('auth session signature tampering invalidates session', () => {
  const validSession = signSession({
    userId: 'usr_valid_456',
    email: 'valid@example.com',
    name: 'Geçerli Kullanıcı',
    role: 'CUSTOMER',
  });

  const [payload, signature] = validSession.split('.');
  const tampered = `${payload}.${signature.slice(0, -2)}xx`;

  const verified = verifySession(tampered);
  assert.equal(verified, null, 'Tampered signature must return null');
});

test('production without AUTH_SECRET environment variable throws error', () => {
  const originalEnv = process.env.NODE_ENV;
  const originalSecret = process.env.AUTH_SECRET;

  try {
    (process.env as any).NODE_ENV = 'production';
    delete process.env.AUTH_SECRET;

    assert.throws(
      () => getSecret(),
      /AUTH_SECRET environment variable is mandatory in production/i
    );
  } finally {
    (process.env as any).NODE_ENV = originalEnv;
    if (originalSecret) {
      process.env.AUTH_SECRET = originalSecret;
    }
  }
});

test('order guest token verification handles matching, mismatched, and expired tokens', () => {
  const orderNumber = 'PAN-TOKEN-123456';
  const token = generateOrderGuestToken(orderNumber);

  assert.equal(verifyOrderGuestToken(orderNumber, token), true);
  assert.equal(verifyOrderGuestToken('PAN-ANOTHER-999', token), false);
  assert.equal(verifyOrderGuestToken(orderNumber, `${token}tampered`), false);
});
