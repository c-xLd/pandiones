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
