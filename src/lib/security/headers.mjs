/**
 * HTTP security headers for every response (next.config.mjs → headers()). Plain .mjs so the config can
 * import it and the tests can assert on it.
 *
 * CSP: everything is limited to this site plus the services the shop really uses (iyzico payment form,
 * Cloudflare Turnstile, the S3 media host). Scripts keep 'unsafe-inline' because Next.js inlines its
 * hydration data and a per-request nonce would force every page to render dynamically; XSS is handled at
 * the source (React escaping, escaped e-mails/JSON-LD) and the CSP still blocks foreign script hosts,
 * plugins, <base> hijacking, framing and form posts to other sites.
 */
export function securityHeaders({ production = process.env.NODE_ENV === 'production', mediaOrigin = process.env.MEDIA_PUBLIC_BASE_URL } = {}) {
  let media = '';
  try {
    media = mediaOrigin ? new URL(mediaOrigin).origin : '';
  } catch {
    media = '';
  }
  const iyzico = 'https://*.iyzipay.com';
  const turnstile = 'https://challenges.cloudflare.com';
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline' ${production ? '' : "'unsafe-eval' "}${iyzico} ${turnstile}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: ${media} ${iyzico}`.trim(),
    `media-src 'self' ${media}`.trim(),
    "font-src 'self' data:",
    `connect-src 'self' ${iyzico} ${turnstile}${production ? '' : ' ws: wss:'}`,
    `frame-src ${iyzico} ${turnstile}`,
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    `form-action 'self' ${iyzico}`,
    ...(production ? ['upgrade-insecure-requests'] : []),
  ].join('; ');

  return [
    { key: 'Content-Security-Policy', value: csp },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=(), payment=(self "https://*.iyzipay.com")' },
    { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
    { key: 'X-DNS-Prefetch-Control', value: 'off' },
    ...(production ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }] : []),
  ];
}
