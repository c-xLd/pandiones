import assert from 'node:assert/strict';
import test from 'node:test';
import { AdminProductError } from '../src/lib/admin/product-editor-service';
import { adminProductErrorResponse } from '../src/lib/admin/product-editor-http';

test('domain conflicts and invalid input become safe HTTP errors', async () => {
  const conflict = adminProductErrorResponse({ code: 'COLOR_CONFLICT' });
  assert.equal(conflict.status, 409);
  assert.equal((await conflict.json()).code, 'COLOR_CONFLICT');
  const invalid = adminProductErrorResponse(new AdminProductError('INVALID_PUBLISH'));
  assert.equal(invalid.status, 400);
  assert.equal((await invalid.json()).code, 'INVALID_PUBLISH');
});

test('unexpected errors do not expose stack or internal message', async () => {
  const originalError = console.error;
  let logged = '';
  console.error = (...args: unknown[]) => { logged = args.map(String).join(' '); };
  let response: ReturnType<typeof adminProductErrorResponse>;
  try {
    response = adminProductErrorResponse(new Error('secret storage token'));
  } finally {
    console.error = originalError;
  }
  assert.equal(response.status, 500);
  assert.doesNotMatch(JSON.stringify(await response.json()), /secret storage token/);
  assert.doesNotMatch(logged, /secret storage token/);
});
