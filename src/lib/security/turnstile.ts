import { clientIp } from './request';

/**
 * Cloudflare Turnstile (privacy-friendly bot check; no image puzzles, no tracking cookies).
 * With TURNSTILE_SECRET_KEY set, a valid token is required and any verification error refuses the
 * request (fail closed). Without it the check is skipped — local development, or before the Cloudflare
 * account is set up; production logs a warning so it is not forgotten (docs/OPERATIONS.md).
 */
let warned = false;

export async function verifyHuman(request: Request, token: unknown): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    if (process.env.NODE_ENV === 'production' && !warned) {
      warned = true;
      console.warn('[TURNSTILE_DISABLED] TURNSTILE_SECRET_KEY tanımlı değil; bot doğrulaması kapalı.');
    }
    return true;
  }
  if (typeof token !== 'string' || token.length < 10 || token.length > 2048) return false;
  try {
    const body = new URLSearchParams({ secret, response: token });
    const ip = clientIp(request);
    if (ip !== 'unknown') body.set('remoteip', ip);
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body,
      signal: AbortSignal.timeout(4000),
    });
    const data = (await response.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}

export const HUMAN_CHECK_FAILED = 'Güvenlik doğrulaması tamamlanamadı. Sayfayı yenileyip tekrar deneyin.';
