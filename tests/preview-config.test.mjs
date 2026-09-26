import assert from 'node:assert/strict';
import test from 'node:test';

test('LAN preview uses an isolated build directory without changing normal builds', async () => {
  const previous = process.env.PANDIONES_LAN_PREVIEW;
  try {
    delete process.env.PANDIONES_LAN_PREVIEW;
    const { default: normal } = await import('../next.config.mjs?normal');
    assert.equal(normal.distDir ?? '.next', '.next');

    process.env.PANDIONES_LAN_PREVIEW = '1';
    const { default: preview } = await import('../next.config.mjs?preview');
    assert.equal(preview.distDir, '.next-lan-preview');
  } finally {
    if (previous === undefined) delete process.env.PANDIONES_LAN_PREVIEW;
    else process.env.PANDIONES_LAN_PREVIEW = previous;
  }
});
