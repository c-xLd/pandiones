import assert from 'node:assert/strict';
import test from 'node:test';
import { PHASE_DEVELOPMENT_SERVER, PHASE_PRODUCTION_BUILD } from 'next/constants.js';
import nextConfig from '../next.config.mjs';
import { buildCustomRoute } from 'next/dist/server/lib/router-utils/filesystem.js';

/**
 * Resolves the effective HTTP response headers for a given request pathname
 * using Next.js's internal route matcher engine (`buildCustomRoute`).
 */
async function resolveHeaders(pathname, phase = PHASE_PRODUCTION_BUILD) {
  const config = nextConfig(phase);
  assert.equal(typeof config.headers, 'function', 'headers() must be a function in nextConfig');
  const rules = await config.headers();
  const compiled = rules.map((r) => buildCustomRoute('header', r));

  const effective = new Map();
  for (const rule of compiled) {
    if (rule.match(pathname)) {
      for (const h of rule.headers) {
        effective.set(h.key.toLowerCase(), { key: h.key, value: h.value });
      }
    }
  }
  return effective;
}

test('empirical challenge: /fonts/web/manrope-latin-wght-normal.woff2 receives immutable caching and preserves security headers', async () => {
  const path = '/fonts/web/manrope-latin-wght-normal.woff2';
  const headers = await resolveHeaders(path);

  // 1. Immutable Cache-Control check
  const cacheControl = headers.get('cache-control');
  assert.ok(cacheControl, `Cache-Control header missing for ${path}`);
  assert.equal(
    cacheControl.value,
    'public, max-age=31536000, immutable',
    `Expected immutable cache header for ${path}, got: ${cacheControl.value}`,
  );

  // 2. Security headers must be preserved and not overwritten
  assert.equal(headers.get('x-frame-options')?.value, 'DENY', 'X-Frame-Options must remain DENY');
  assert.equal(headers.get('x-content-type-options')?.value, 'nosniff', 'X-Content-Type-Options must remain nosniff');
  assert.equal(headers.get('referrer-policy')?.value, 'strict-origin-when-cross-origin', 'Referrer-Policy must be preserved');
  assert.equal(headers.get('cross-origin-opener-policy')?.value, 'same-origin', 'Cross-Origin-Opener-Policy must be preserved');
  assert.equal(headers.get('x-dns-prefetch-control')?.value, 'off', 'X-DNS-Prefetch-Control must remain off');

  const csp = headers.get('content-security-policy')?.value;
  assert.ok(csp, 'Content-Security-Policy must be present');
  assert.ok(csp.includes("default-src 'self'"), 'CSP must include default-src');
  assert.ok(csp.includes("font-src 'self' data:"), 'CSP must include font-src');
});

test('empirical challenge: /assets/home/hero.webp receives immutable caching and preserves security headers', async () => {
  const path = '/assets/home/hero.webp';
  const headers = await resolveHeaders(path);

  // 1. Immutable Cache-Control check
  const cacheControl = headers.get('cache-control');
  assert.ok(cacheControl, `Cache-Control header missing for ${path}`);
  assert.equal(
    cacheControl.value,
    'public, max-age=31536000, immutable',
    `Expected immutable cache header for ${path}, got: ${cacheControl.value}`,
  );

  // 2. Security headers must be preserved and not overwritten
  assert.equal(headers.get('x-frame-options')?.value, 'DENY', 'X-Frame-Options must remain DENY');
  assert.equal(headers.get('x-content-type-options')?.value, 'nosniff', 'X-Content-Type-Options must remain nosniff');
  assert.equal(headers.get('referrer-policy')?.value, 'strict-origin-when-cross-origin', 'Referrer-Policy must be preserved');
  assert.equal(headers.get('cross-origin-opener-policy')?.value, 'same-origin', 'Cross-Origin-Opener-Policy must be preserved');

  const csp = headers.get('content-security-policy')?.value;
  assert.ok(csp, 'Content-Security-Policy must be present');
  assert.ok(csp.includes("default-src 'self'"), 'CSP must include default-src');
});

test('empirical challenge: edge-case font and asset paths all receive immutable caching', async () => {
  const staticPaths = [
    '/fonts/manrope.woff2',
    '/fonts/vendor/deep/sub/custom-font.woff2',
    '/assets/lace.webp',
    '/assets/satin.webp',
    '/assets/images/products/featured/test.jpg',
  ];

  for (const p of staticPaths) {
    const headers = await resolveHeaders(p);
    assert.equal(
      headers.get('cache-control')?.value,
      'public, max-age=31536000, immutable',
      `Path ${p} must have immutable Cache-Control`,
    );
    assert.equal(headers.get('x-frame-options')?.value, 'DENY', `Path ${p} must have security header X-Frame-Options`);
  }
});

test('empirical challenge: storefront and sensitive endpoints NEVER receive static immutable cache headers', async () => {
  const dynamicPaths = [
    '/',
    '/canta',
    '/odeme',
    '/hesabim',
    '/siparislerim',
    '/urun/pembe-balenli-dantel-takim',
    '/api/auth/session',
    '/api/admin/products',
  ];

  for (const p of dynamicPaths) {
    const headers = await resolveHeaders(p);
    const cc = headers.get('cache-control')?.value;
    assert.notEqual(
      cc,
      'public, max-age=31536000, immutable',
      `CRITICAL: Dynamic route ${p} must NOT receive static immutable Cache-Control header`,
    );
    // Security headers must still be present
    assert.equal(headers.get('x-frame-options')?.value, 'DENY', `Route ${p} must have X-Frame-Options: DENY`);
    assert.ok(headers.has('content-security-policy'), `Route ${p} must have CSP`);
  }
});

test('empirical challenge: production environment preserves HSTS alongside immutable caching', async () => {
  const previousEnv = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = 'production';
    const path = '/assets/home/hero.webp';
    const headers = await resolveHeaders(path, PHASE_PRODUCTION_BUILD);

    assert.equal(
      headers.get('cache-control')?.value,
      'public, max-age=31536000, immutable',
      'Immutable cache header must be present in production',
    );
    assert.equal(
      headers.get('strict-transport-security')?.value,
      'max-age=63072000; includeSubDomains; preload',
      'HSTS header must be preserved in production',
    );
    assert.equal(headers.get('x-frame-options')?.value, 'DENY', 'X-Frame-Options must remain DENY in production');
  } finally {
    process.env.NODE_ENV = previousEnv;
  }
});

