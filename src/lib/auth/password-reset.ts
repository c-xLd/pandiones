import crypto from 'node:crypto';
import { checkNewPassword, hashPassword } from './password-policy';
import type { PrismaClient } from '@prisma/client';
import { normalizeResetEmail, validateNewPassword } from './password-reset-client';

export { normalizeResetEmail, validateNewPassword };

/** A reset link is valid this long and can be used once. */
export const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;
/** A new link is not sent more often than this per account (repeat requests get the same answer). */
export const RESET_REQUEST_COOLDOWN_MS = 60 * 1000;

export const hashResetToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex');

/**
 * Creates a reset token for the account, or returns null when there is no such account or a link was
 * sent within the cooldown. Callers answer the visitor the same way in every case.
 */
export async function createPasswordReset(db: PrismaClient, email: string, now = new Date()) {
  const user = await db.user.findUnique({ where: { email }, select: { id: true, name: true, email: true } });
  if (!user) return null;

  const recent = await db.passwordResetToken.findFirst({
    where: { userId: user.id, purpose: 'reset', usedAt: null, createdAt: { gt: new Date(now.getTime() - RESET_REQUEST_COOLDOWN_MS) } },
    select: { id: true },
  });
  if (recent) return null;

  const token = crypto.randomBytes(32).toString('base64url');
  await db.$transaction([
    // Only the newest link works.
    db.passwordResetToken.deleteMany({ where: { userId: user.id, purpose: 'reset', usedAt: null } }),
    db.passwordResetToken.create({
      data: { userId: user.id, purpose: 'reset', tokenHash: hashResetToken(token), expiresAt: new Date(now.getTime() + RESET_TOKEN_TTL_MS) },
    }),
  ]);
  return { user, token };
}

/** Whether a link can still be used (for showing the form or an "expired" message up front). */
export async function checkPasswordReset(db: PrismaClient, token: string, now = new Date()) {
  if (!token || token.length > 100) return false;
  const row = await db.passwordResetToken.findUnique({ where: { tokenHash: hashResetToken(token) }, select: { usedAt: true, expiresAt: true, purpose: true } });
  return Boolean(row && row.purpose === 'reset' && !row.usedAt && row.expiresAt > now);
}

export type ResetResult = { ok: true; email: string } | { ok: false; reason: 'invalid' | 'weak'; message: string };

/**
 * Sets the new password and spends the token in one transaction. Every session of the account is
 * revoked (and passwordChangedAt stamped as a second guard); the account's other open links are removed.
 * The e-mail link proves the address, so an unverified account becomes verified.
 */
export async function completePasswordReset(db: PrismaClient, token: string, password: unknown, confirm: unknown, now = new Date()): Promise<ResetResult> {
  const problem = validateNewPassword(password, confirm);
  if (problem) return { ok: false, reason: 'weak', message: problem };
  if (!token || token.length > 100) return { ok: false, reason: 'invalid', message: INVALID_LINK };
  const owner = await db.passwordResetToken.findUnique({ where: { tokenHash: hashResetToken(token) }, select: { purpose: true, user: { select: { email: true, name: true } } } });
  if (!owner || owner.purpose !== 'reset') return { ok: false, reason: 'invalid', message: INVALID_LINK };
  const policy = await checkNewPassword(password, { email: owner.user.email, name: owner.user.name });
  if (policy) return { ok: false, reason: 'weak', message: policy };

  const passwordHash = await hashPassword(password as string);
  return db.$transaction(async (tx) => {
    // Claim the token first; a second concurrent use updates 0 rows and fails.
    const claimed = await tx.passwordResetToken.updateMany({
      where: { tokenHash: hashResetToken(token), purpose: 'reset', usedAt: null, expiresAt: { gt: now } },
      data: { usedAt: now },
    });
    if (claimed.count !== 1) return { ok: false as const, reason: 'invalid' as const, message: INVALID_LINK };

    const row = await tx.passwordResetToken.findUniqueOrThrow({ where: { tokenHash: hashResetToken(token) }, select: { userId: true } });
    const user = await tx.user.update({
      where: { id: row.userId },
      data: { passwordHash, passwordChangedAt: now, failedLoginCount: 0, lockedUntil: null },
      select: { email: true, emailVerifiedAt: true },
    });
    if (!user.emailVerifiedAt) await tx.user.update({ where: { id: row.userId }, data: { emailVerifiedAt: now } });
    await tx.session.updateMany({ where: { userId: row.userId, revokedAt: null }, data: { revokedAt: now } });
    await tx.passwordResetToken.deleteMany({ where: { userId: row.userId, purpose: 'reset', usedAt: null } });
    return { ok: true as const, email: user.email };
  });
}

export const INVALID_LINK = 'Bu bağlantı geçersiz ya da süresi dolmuş. Yeni bir bağlantı isteyin.';

/* ---------- E-mail verification (same table, purpose "verify-email") ---------- */

export const VERIFY_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

/** New single-use verification link for the account; replaces older unused ones. */
export async function createEmailVerification(db: PrismaClient, userId: string, now = new Date()) {
  const token = crypto.randomBytes(32).toString('base64url');
  await db.$transaction([
    db.passwordResetToken.deleteMany({ where: { userId, purpose: 'verify-email', usedAt: null } }),
    db.passwordResetToken.create({ data: { userId, purpose: 'verify-email', tokenHash: hashResetToken(token), expiresAt: new Date(now.getTime() + VERIFY_TOKEN_TTL_MS) } }),
  ]);
  return token;
}

/** Spends a verification link and marks the account verified. Returns the user, or null for a bad link. */
export async function consumeEmailVerification(db: PrismaClient, token: string, now = new Date()) {
  if (!token || token.length > 100) return null;
  return db.$transaction(async (tx) => {
    const claimed = await tx.passwordResetToken.updateMany({
      where: { tokenHash: hashResetToken(token), purpose: 'verify-email', usedAt: null, expiresAt: { gt: now } },
      data: { usedAt: now },
    });
    if (claimed.count !== 1) return null;
    const row = await tx.passwordResetToken.findUniqueOrThrow({ where: { tokenHash: hashResetToken(token) }, select: { userId: true } });
    return tx.user.update({ where: { id: row.userId }, data: { emailVerifiedAt: now }, select: { id: true, role: true, email: true, name: true, totpEnabledAt: true } });
  });
}
