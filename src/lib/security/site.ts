/**
 * The site's own origin for links in e-mails and payment returns. In production it always comes from
 * NEXT_PUBLIC_SITE_URL — never from the request's Host header, which an attacker can set to put their
 * own domain into a reset or verification e-mail.
 */
export function siteOrigin(request?: Request): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '');
  if (configured) return configured;
  if (process.env.NODE_ENV === 'production') return 'https://pandiones.com';
  return request ? new URL(request.url).origin : 'http://localhost:3000';
}
