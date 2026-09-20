import assert from 'node:assert/strict';
import test from 'node:test';
import { POST as createProduct } from '../src/app/api/admin/products/route';
import { PATCH as editProduct } from '../src/app/api/admin/products/[id]/route';
import { POST as uploadMedia } from '../src/app/api/admin/products/[id]/media/route';
import { POST as publish } from '../src/app/api/admin/products/[id]/publish/route';
import { POST as createFamily } from '../src/app/api/admin/product-families/route';
import { POST as legacyUpload } from '../src/app/api/admin/upload/route';

const params = { params: Promise.resolve({ id: 'unknown' }) };

test('anonymous caller cannot create, edit, upload, publish or create family', async () => {
  const json = (url: string) => new Request(url, { method: 'POST', body: '{}', headers: { 'Content-Type': 'application/json' } });
  const responses = await Promise.all([
    createProduct(json('http://localhost/api/admin/products')),
    editProduct(new Request('http://localhost/api/admin/products/unknown', { method: 'PATCH', body: '{}' }), params),
    uploadMedia(new Request('http://localhost/api/admin/products/unknown/media', { method: 'POST' }), params),
    publish(json('http://localhost/api/admin/products/unknown/publish'), params),
    createFamily(json('http://localhost/api/admin/product-families')),
    legacyUpload(new Request('http://localhost/api/admin/upload', { method: 'POST' })),
  ]);
  assert.deepEqual(responses.map((response) => response.status), [403, 403, 403, 403, 403, 403]);
});
