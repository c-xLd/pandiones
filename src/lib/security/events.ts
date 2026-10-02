import { prisma } from '@/lib/prisma';
import { clientIp } from './request';
import { hashIp } from './crypto';

export type SecurityEventType =
  | 'login.locked'
  | 'rate.limited'
  | 'payment.mismatch'
  | 'payment.after_release'
  | 'mfa.failed'
  | 'admin.login'
  | 'reauth.failed';

const SEVERITY: Record<SecurityEventType, 'info' | 'warning' | 'critical'> = {
  'login.locked': 'warning',
  'rate.limited': 'warning',
  'payment.mismatch': 'critical',
  'payment.after_release': 'critical',
  'mfa.failed': 'warning',
  'admin.login': 'info',
  'reauth.failed': 'warning',
};

/**
 * Writes one security event (never throws: monitoring must not break the request). Critical events also
 * e-mail the store's contact address, at most once per type per hour.
 */
export async function recordSecurityEvent(type: SecurityEventType, options: { request?: Request; subject?: string; detail?: string } = {}) {
  const severity = SEVERITY[type];
  try {
    await prisma.securityEvent.create({
      data: {
        type,
        severity,
        subject: options.subject?.slice(0, 120) ?? null,
        ipHash: options.request ? hashIp(clientIp(options.request)) : null,
        detail: options.detail?.slice(0, 500) ?? null,
      },
    });
    if (severity === 'critical') await alertOnce(type, options.detail ?? '');
  } catch (error) {
    console.error('[SECURITY_EVENT_WRITE_FAILED]', type, error instanceof Error ? error.message : error);
  }
}

async function alertOnce(type: SecurityEventType, detail: string) {
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const earlier = await prisma.securityEvent.count({ where: { type, createdAt: { gt: hourAgo } } });
  if (earlier > 1) return; // the event just written is the first in this hour → alert; otherwise already sent
  const [{ readStoreSettings }, { sendContactNotificationEmail }] = await Promise.all([import('@/lib/settings/server'), import('@/lib/email/provider')]);
  const settings = await readStoreSettings();
  await sendContactNotificationEmail({
    inboxEmail: process.env.SECURITY_ALERT_EMAIL || settings.contactEmail,
    name: 'Pandiones güvenlik',
    email: 'guvenlik@pandiones.invalid',
    subject: `Güvenlik uyarısı: ${type}`,
    message: `Kritik bir güvenlik olayı kaydedildi (${type}). ${detail}\n\nAyrıntılar: Yönetim → Güvenlik.`,
    receivedAt: new Date(),
  }).catch(() => {});
}
