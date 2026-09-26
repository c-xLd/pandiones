import assert from 'node:assert/strict';
import test from 'node:test';
import { GET as getReturnsHandler, PATCH as patchReturnsHandler } from '../src/app/api/admin/returns/route';

test('admin returns endpoints block anonymous visitors with 403', async () => {
  const resGet = await getReturnsHandler();
  assert.equal(resGet.status, 403, 'Anonymous GET /api/admin/returns must return 403');
  const dataGet = await resGet.json();
  assert.match(dataGet.error, /yetkisiz erişim/i);

  const reqPatch = new Request('http://localhost:3000/api/admin/returns', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: 'any-id', status: 'ONAYLANDI' }),
  });
  const resPatch = await patchReturnsHandler(reqPatch);
  assert.equal(resPatch.status, 403, 'Anonymous PATCH /api/admin/returns must return 403');
  const dataPatch = await resPatch.json();
  assert.match(dataPatch.error, /yetkisiz erişim/i);
});
