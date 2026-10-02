/** Log-safe forms of personal data and secrets: enough to correlate, not enough to use. */
export function maskEmail(email: string): string {
  const [user, domain] = email.split('@');
  if (!domain) return '***';
  return `${user.slice(0, 1)}***@${domain}`;
}

/** Gift-card codes and tokens are bearer credentials: keep only the last 4 characters. */
export const maskSecret = (value: string) => (value.length <= 4 ? '****' : `****${value.slice(-4)}`);
