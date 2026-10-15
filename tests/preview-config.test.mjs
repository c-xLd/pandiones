import assert from 'node:assert/strict';
import test from 'node:test';
import { PHASE_DEVELOPMENT_SERVER, PHASE_PRODUCTION_BUILD, PHASE_PRODUCTION_SERVER } from 'next/constants.js';
import nextConfig from '../next.config.mjs';

function withEnv(name, value, fn) {
  const previous = process.env[name];
  try {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
    return fn();
  } finally {
    if (previous === undefined) delete process.env[name];
    else process.env[name] = previous;
  }
}

test('dev server and production build never share a build directory', () => {
  withEnv('PANDIONES_DIST_DIR', undefined, () =>
    withEnv('PANDIONES_LAN_PREVIEW', undefined, () => {
      assert.equal(nextConfig(PHASE_PRODUCTION_BUILD).distDir ?? '.next', '.next');
      assert.equal(nextConfig(PHASE_PRODUCTION_SERVER).distDir ?? '.next', '.next');
      assert.equal(nextConfig(PHASE_DEVELOPMENT_SERVER).distDir, '.next-dev');
    }),
  );
});

test('LAN preview and explicit PANDIONES_DIST_DIR keep their own directories', () => {
  withEnv('PANDIONES_DIST_DIR', undefined, () =>
    withEnv('PANDIONES_LAN_PREVIEW', '1', () => {
      assert.equal(nextConfig(PHASE_DEVELOPMENT_SERVER).distDir, '.next-lan-preview');
      assert.equal(nextConfig(PHASE_PRODUCTION_BUILD).distDir, '.next-lan-preview');
    }),
  );
  withEnv('PANDIONES_DIST_DIR', '.next-perf', () => assert.equal(nextConfig(PHASE_DEVELOPMENT_SERVER).distDir, '.next-perf'));
});

test('headers() configures immutable caching for fonts and static assets', async () => {
  const config = nextConfig(PHASE_PRODUCTION_BUILD);
  assert.equal(typeof config.headers, 'function', 'headers() must be a function');
  const headersList = await config.headers();

  const fontRule = headersList.find((r) => r.source === '/fonts/:path*');
  assert.ok(fontRule, 'Font cache rule for /fonts/:path* must be present');
  assert.equal(
    fontRule.headers.find((h) => h.key === 'Cache-Control')?.value,
    'public, max-age=31536000, immutable',
    'Fonts must have public, max-age=31536000, immutable',
  );

  const assetRule = headersList.find((r) => r.source === '/assets/:path*');
  assert.ok(assetRule, 'Asset cache rule for /assets/:path* must be present');
  assert.equal(
    assetRule.headers.find((h) => h.key === 'Cache-Control')?.value,
    'public, max-age=31536000, immutable',
    'Assets must have public, max-age=31536000, immutable',
  );

  const globalRule = headersList.find((r) => r.source === '/:path*');
  assert.ok(globalRule, 'Global security headers rule must remain on /:path*');
});

test('.vercelignore strictly blocks local build artifacts, dev databases, tests, and secrets from upload', async () => {
  const { readFileSync } = await import('node:fs');
  const content = readFileSync('.vercelignore', 'utf8');
  const lines = content.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));

  const requiredExclusions = [
    '.next',
    '.next-dev',
    '.next-verify',
    'node_modules',
    'tests',
    'coverage',
    '.pg-data',
    '.env',
    'scratch',
  ];

  for (const item of requiredExclusions) {
    assert.ok(
      lines.some((l) => l === item || l.startsWith(`${item}/`) || l.startsWith(`${item}*`)),
      `.vercelignore must explicitly block '${item}' from upload`,
    );
  }
});


