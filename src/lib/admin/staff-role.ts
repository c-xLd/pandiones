import type { PrismaClient } from '@prisma/client';
import type { UserSession } from '@/lib/auth';
import { recordAudit } from '@/lib/audit';
import { roleLabel, toRole } from '@/lib/security/roles';

export type RoleChangeCode = 'INVALID_ROLE' | 'SELF' | 'NOT_FOUND' | 'ADMIN_TARGET';

export class RoleChangeError extends Error {
  constructor(public readonly code: RoleChangeCode) {
    super(code);
  }
}

export const ROLE_CHANGE_TEXT: Record<RoleChangeCode, { status: number; message: string }> = {
  INVALID_ROLE: { status: 400, message: 'Rol yalnız Personel ya da Müşteri olabilir.' },
  SELF: { status: 400, message: 'Kendi rolünüzü değiştiremezsiniz.' },
  NOT_FOUND: { status: 404, message: 'Kullanıcı bulunamadı.' },
  ADMIN_TARGET: { status: 403, message: 'Yönetici hesaplarının rolü panelden değiştirilemez.' },
};

/**
 * Makes a customer staff (or staff a customer again). Admin accounts are never changed here, nor the
 * acting admin's own account. Every open session of the user is ended in the same transaction, so a
 * customer session never carries panel rights and a demoted staff member is out of the panel at once;
 * staff then sign in through /yonetim/giris with 2FA like admins. The activity log row commits with it.
 */
export async function setStaffRole(
  db: PrismaClient,
  actor: Pick<UserSession, 'userId' | 'email'>,
  userId: string,
  nextRole: unknown,
): Promise<{ changed: boolean; role: 'STAFF' | 'CUSTOMER' }> {
  if (nextRole !== 'STAFF' && nextRole !== 'CUSTOMER') throw new RoleChangeError('INVALID_ROLE');
  if (!userId || userId === actor.userId) throw new RoleChangeError('SELF');
  return db.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: userId }, select: { id: true, email: true, role: true } });
    if (!user) throw new RoleChangeError('NOT_FOUND');
    const current = toRole(user.role);
    if (current === 'ADMIN') throw new RoleChangeError('ADMIN_TARGET');
    if (current === nextRole) return { changed: false, role: nextRole };
    await tx.user.update({ where: { id: userId }, data: { role: nextRole } });
    await tx.session.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
    await recordAudit(tx, actor, {
      action: 'user.role',
      entity: 'user',
      entityId: userId,
      summary: `${user.email}: ${roleLabel(current)} → ${roleLabel(nextRole)}`,
      diff: { role: [current, nextRole] },
    });
    return { changed: true, role: nextRole };
  });
}
