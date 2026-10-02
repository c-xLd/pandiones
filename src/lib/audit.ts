import type { Prisma, PrismaClient } from '@prisma/client';
import type { UserSession } from '@/lib/auth';

type Db = PrismaClient | Prisma.TransactionClient;

export type AuditEntry = {
  action: string;
  entity: string;
  entityId?: string | null;
  summary: string;
  diff?: Record<string, [unknown, unknown]>;
};

/** Writes one activity-log row. Pass the transaction client so the log and the change commit together. */
export function recordAudit(db: Db, actor: Pick<UserSession, 'userId' | 'email'>, entry: AuditEntry) {
  return db.auditLog.create({
    data: {
      actorId: actor.userId,
      actorEmail: actor.email,
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId ?? null,
      summary: entry.summary.slice(0, 300),
      diff: entry.diff && Object.keys(entry.diff).length > 0 ? JSON.stringify(entry.diff) : null,
    },
  });
}

/** For changes committed by a service that owns its own transaction: logs after the fact and never
 *  fails the request (the change already happened); a failed log line is reported to the server log. */
export async function recordAuditAfter(db: PrismaClient, actor: Pick<UserSession, 'userId' | 'email'>, entry: AuditEntry) {
  try {
    await recordAudit(db, actor, entry);
  } catch (error) {
    console.error('[AUDIT_WRITE_FAILED]', entry.action, entry.entityId, error);
  }
}

/** Field → [before, after] for the listed fields that differ. */
export function diffFields<T extends Record<string, unknown>>(before: T, after: T, fields: (keyof T)[]) {
  const diff: Record<string, [unknown, unknown]> = {};
  for (const field of fields) {
    if (before[field] !== after[field]) diff[String(field)] = [before[field], after[field]];
  }
  return diff;
}
