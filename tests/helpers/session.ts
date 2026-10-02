import { createSession } from '../../src/lib/auth';
import { prisma } from '../../src/lib/prisma';

/**
 * Real database session for a test user (sessions are server-side now). Admin sessions are created as
 * having passed 2FA, like a real admin after the second step. Returns the cookie/bearer token.
 */
export async function signSession(data: { userId: string; email?: string; name?: string; role: 'CUSTOMER' | 'ADMIN' | string }) {
  const session = await createSession({ id: data.userId, role: data.role }, { mfa: data.role === 'ADMIN', db: prisma });
  return session.token;
}
