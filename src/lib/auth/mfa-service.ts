import type { PrismaClient } from '@prisma/client';
import qrcode from 'qrcode-generator';
import { decryptSecret, encryptSecret } from '@/lib/security/crypto';
import { generateBackupCodes, generateTotpSecret, hashBackupCode, otpauthUri, verifyTotp } from '@/lib/security/totp';

/**
 * Second factor (TOTP). Setup stores an encrypted *pending* secret; it becomes active only after the
 * user proves it with a code (totpEnabledAt). Backup codes are shown once and stored as hashes.
 */

function qrSvg(text: string) {
  const qr = qrcode(0, 'M');
  qr.addData(text);
  qr.make();
  return qr.createSvgTag({ cellSize: 5, margin: 2, scalable: true });
}

/**
 * Starts setup for an account without active 2FA. A pending (unconfirmed) secret is reused, so a second
 * request — a reload, or React running the effect twice — shows the same QR instead of silently
 * replacing the secret the user has already scanned.
 */
export async function beginTotpSetup(db: PrismaClient, userId: string) {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { email: true, totpEnabledAt: true, totpSecret: true } });
  if (user.totpEnabledAt) return { alreadyEnabled: true as const };
  let secret = user.totpSecret ? decryptSecret(user.totpSecret) : null;
  if (!secret) {
    secret = generateTotpSecret();
    const claimed = await db.user.updateMany({
      where: { id: userId, totpEnabledAt: null, totpSecret: user.totpSecret },
      data: { totpSecret: encryptSecret(secret), totpLastStep: null },
    });
    // A parallel request stored its secret first: show that one.
    if (claimed.count === 0) {
      const stored = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { totpSecret: true } });
      secret = stored.totpSecret ? decryptSecret(stored.totpSecret) : null;
      if (!secret) throw new Error('TOTP setup could not be started');
    }
  }
  const uri = otpauthUri(secret, user.email);
  return { alreadyEnabled: false as const, secret: secret.replace(/(.{4})/g, '$1 ').trim(), uri, qrSvg: qrSvg(uri) };
}

/** Confirms setup with a code from the app; returns the one-time backup codes, or null for a wrong code. */
export async function confirmTotpSetup(db: PrismaClient, userId: string, code: string, now = Date.now()) {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { totpSecret: true, totpEnabledAt: true } });
  if (user.totpEnabledAt || !user.totpSecret) return null;
  const secret = decryptSecret(user.totpSecret);
  if (!secret) return null;
  const step = verifyTotp(secret, code, now);
  if (step === null) return null;
  const backup = generateBackupCodes();
  const updated = await db.user.updateMany({
    where: { id: userId, totpEnabledAt: null },
    data: { totpEnabledAt: new Date(now), totpLastStep: step, totpBackupCodes: JSON.stringify(backup.hashes) },
  });
  return updated.count === 1 ? backup.codes : null;
}

/**
 * Checks a sign-in code: a TOTP code (never the same time step twice) or an unused backup code (spent
 * on use). Both updates are conditional, so two parallel requests cannot use the same code.
 */
export async function verifySecondFactor(db: PrismaClient, userId: string, input: string, now = Date.now()): Promise<'totp' | 'backup' | null> {
  const user = await db.user.findUnique({ where: { id: userId }, select: { totpSecret: true, totpEnabledAt: true, totpLastStep: true, totpBackupCodes: true } });
  if (!user?.totpEnabledAt || !user.totpSecret) return null;
  const code = input.trim();

  if (/^\d{6}$/.test(code.replace(/\s+/g, ''))) {
    const secret = decryptSecret(user.totpSecret);
    if (!secret) return null;
    const step = verifyTotp(secret, code, now, user.totpLastStep);
    if (step === null) return null;
    const claimed = await db.user.updateMany({
      where: { id: userId, OR: [{ totpLastStep: null }, { totpLastStep: { lt: step } }] },
      data: { totpLastStep: step },
    });
    return claimed.count === 1 ? 'totp' : null;
  }

  const hashes: string[] = user.totpBackupCodes ? JSON.parse(user.totpBackupCodes) : [];
  const hash = hashBackupCode(code);
  if (!hashes.includes(hash)) return null;
  const remaining = JSON.stringify(hashes.filter((h) => h !== hash));
  const claimed = await db.user.updateMany({ where: { id: userId, totpBackupCodes: user.totpBackupCodes }, data: { totpBackupCodes: remaining } });
  return claimed.count === 1 ? 'backup' : null;
}

export async function remainingBackupCodes(db: PrismaClient, userId: string) {
  const user = await db.user.findUnique({ where: { id: userId }, select: { totpBackupCodes: true } });
  return user?.totpBackupCodes ? (JSON.parse(user.totpBackupCodes) as string[]).length : 0;
}

export async function disableTotp(db: PrismaClient, userId: string) {
  await db.user.update({ where: { id: userId }, data: { totpSecret: null, totpEnabledAt: null, totpLastStep: null, totpBackupCodes: null } });
}
