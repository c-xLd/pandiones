/**
 * Shared SEO utilities for storefront pages and layouts.
 */

/** Canonical site URL with fallback to pandiones.com. */
export function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || 'https://pandiones.com';
}

/**
 * Escapes characters that have syntactic meaning in HTML script tags (<, >, &)
 * so untrusted user/admin data cannot prematurely close a <script type="application/ld+json"> tag (stored XSS).
 */
export function safeJsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}
