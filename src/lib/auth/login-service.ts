import bcrypt from 'bcryptjs';
import type { PrismaClient } from '@prisma/client';
import { compareWithDummy } from './password-policy';
import { isPanelRole } from '../security/roles';

/** After this many wrong passwords in a row the account is locked for LOCK_MINUTES (and the owner told). */
export const MAX_FAILED_LOGINS = 10;
export const LOCK_MINUTES = 15;

export const GENERIC_LOGIN_ERROR = 'E-posta veya şifre hatalı.';

export type LoginOutcome =
  | { kind: 'invalid' }
  | { kind: 'locked'; justLocked: boolean; user: { email: string; name: string } }
  | { kind: 'unverified'; user: { id: string; email: string; name: string } }
  | { kind: 'mfa'; setup: boolean; user: { id: string } }
  | { kind: 'ok'; user: { id: string; role: string } };

/**
 * Checks e-mail + password. Unknown e-mails take as long as wrong passwords (dummy bcrypt) and get the
 * same answer. A locked account answers like a wrong password too (the owner is e-mailed instead), so
 * the result never says whether an address is registered. Admins and accounts with 2FA continue to the
 * second-factor step; nobody gets an admin session here.
 */
export async function authenticate(db: PrismaClient, emailInput: unknown, passwordInput: unknown, now = new Date()): Promise<LoginOutcome> {
  const email = typeof emailInput === 'string' ? emailInput.trim().toLowerCase() : '';
  const password = typeof passwordInput === 'string' ? passwordInput : '';
  if (!email || !password || email.length > 254 || password.length > 256) {
    await compareWithDummy(password || 'x');
    return { kind: 'invalid' };
  }

  const user = await db.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true, role: true, passwordHash: true, emailVerifiedAt: true, totpEnabledAt: true, failedLoginCount: true, lockedUntil: true },
  });
  if (!user) {
    await compareWithDummy(password);
    return { kind: 'invalid' };
  }
  if (user.lockedUntil && user.lockedUntil > now) {
    await compareWithDummy(password);
    return { kind: 'locked', justLocked: false, user };
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    const failures = user.failedLoginCount + 1;
    if (failures >= MAX_FAILED_LOGINS) {
      await db.user.update({ where: { id: user.id }, data: { failedLoginCount: 0, lockedUntil: new Date(now.getTime() + LOCK_MINUTES * 60 * 1000) } });
      return { kind: 'locked', justLocked: true, user };
    }
    await db.user.update({ where: { id: user.id }, data: { failedLoginCount: failures } });
    return { kind: 'invalid' };
  }

  if (user.failedLoginCount > 0 || user.lockedUntil) {
    await db.user.update({ where: { id: user.id }, data: { failedLoginCount: 0, lockedUntil: null } });
  }
  if (!user.emailVerifiedAt) return { kind: 'unverified', user };
  if (isPanelRole(user.role) || user.totpEnabledAt) return { kind: 'mfa', setup: !user.totpEnabledAt, user };
  return { kind: 'ok', user };
}
