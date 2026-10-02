import { clientIp } from './request';

/**
 * Pure request rules used by the middleware (kept separate so they are unit-tested without a server).
 */

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
/** Cross-site POSTs that are legitimate: iyzico returns the buyer to the payment callback with a form post. */
const CROSS_SITE_ALLOWED = ['/api/payment/callback'];

function allowedOrigins(request: Request): Set<string> {
  const origins = new Set<string>([new URL(request.url).origin]);
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  if (site) {
    try {
      origins.add(new URL(site).origin);
    } catch {
      /* ignore a malformed setting */
    }
  }
  return origins;
}

/**
 * CSRF guard for the JSON APIs. Browsers attach `Origin` to every cross-origin POST/PUT/PATCH/DELETE and
 * `Sec-Fetch-Site` to modern requests; a request from another site is refused before any handler runs.
 * Requests without either header are not from a browser page (curl, server-to-server) and carry no
 * victim's cookies, so they are left to the normal authentication.
 */
export function isCrossSiteMutation(request: Request): boolean {
  if (!MUTATING.has(request.method.toUpperCase())) return false;
  const { pathname } = new URL(request.url);
  if (!pathname.startsWith('/api/')) return false;
  if (CROSS_SITE_ALLOWED.some((path) => pathname === path)) return false;

  const origin = request.headers.get('origin');
  if (origin) return origin === 'null' || !allowedOrigins(request).has(origin);
  const fetchSite = request.headers.get('sec-fetch-site');
  return fetchSite === 'cross-site';
}

/**
 * Optional allow-list for the admin panel and APIs: ADMIN_ALLOWED_IPS="1.2.3.4, 5.6.7.8". Empty or unset
 * means no IP restriction (sign-in + 2FA still apply). Behind Cloudflare the client IP is CF-Connecting-IP.
 */
export function isAdminIpAllowed(request: Request): boolean {
  const list = (process.env.ADMIN_ALLOWED_IPS ?? '')
    .split(',')
    .map((ip) => ip.trim())
    .filter(Boolean);
  if (list.length === 0) return true;
  return list.includes(clientIp(request));
}

/** JSON API bodies are small; media upload (multipart, validated by size itself) is the only exception. */
export const API_BODY_LIMIT = 64 * 1024;
const LARGE_BODY_ROUTES = [/^\/api\/admin\/products\/[^/]+\/media$/];

/** True when a request declares a body larger than the API accepts (cheap first line; routes re-check). */
export function isOversizedBody(request: Request): boolean {
  const { pathname } = new URL(request.url);
  if (!pathname.startsWith('/api/') || LARGE_BODY_ROUTES.some((r) => r.test(pathname))) return false;
  const length = Number(request.headers.get('content-length') || 0);
  return Number.isFinite(length) && length > API_BODY_LIMIT;
}
