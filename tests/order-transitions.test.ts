import assert from 'node:assert/strict';
import test from 'node:test';
import { allowedNext, checkTracking, checkTransition, primaryNext } from '../src/lib/orders/transitions';

test('forward steps and one step back are allowed', () => {
  assert.deepEqual(allowedNext('ODENDI'), ['HAZIRLANIYOR', 'KARGODA']);
  assert.equal(checkTransition({ status: 'ODENDI' }, 'HAZIRLANIYOR', null).ok, true);
  assert.equal(checkTransition({ status: 'HAZIRLANIYOR' }, 'ODENDI', null).ok, true);
  assert.equal(checkTransition({ status: 'KARGODA' }, 'TESLIM_EDILDI', 'YK123456').ok, true);
  assert.equal(checkTransition({ status: 'KARGODA' }, 'HAZIRLANIYOR', 'YK123456').ok, true);
  assert.equal(primaryNext('HAZIRLANIYOR'), 'KARGODA');
  assert.equal(primaryNext('TESLIM_EDILDI'), null);
});

test('delivered is final and payment states are not set from the panel', () => {
  assert.equal(checkTransition({ status: 'TESLIM_EDILDI' }, 'KARGODA', 'YK123456').ok, false);
  assert.equal(checkTransition({ status: 'ODEME_BEKLENIYOR' }, 'ODENDI', null).ok, false);
  assert.equal(checkTransition({ status: 'ODEME_BASARISIZ' }, 'HAZIRLANIYOR', null).ok, false);
  assert.equal(checkTransition({ status: 'ODENDI' }, 'ODEME_BEKLENIYOR', null).ok, false);
  assert.equal(checkTransition({ status: 'ODENDI' }, 'TESLIM_EDILDI', 'YK123456').ok, false);
  assert.equal(checkTransition({ status: 'ODENDI' }, 'BILINMEYEN', null).ok, false);
  assert.equal(checkTransition({ status: 'IADE_EDILDI' }, 'HAZIRLANIYOR', null).ok, false);
  assert.equal(checkTransition({ status: 'ODENDI' }, 'IADE_EDILDI', null).ok, false);
});

test('shipping needs a tracking code', () => {
  const missing = checkTransition({ status: 'HAZIRLANIYOR' }, 'KARGODA', '  ');
  assert.equal(missing.ok, false);
  assert.equal(checkTransition({ status: 'HAZIRLANIYOR' }, 'KARGODA', 'YK-1234567').ok, true);
});

test('same status is a no-op, not an error', () => {
  assert.equal(checkTransition({ status: 'KARGODA' }, 'KARGODA', 'YK123456').ok, true);
});

test('carrier must be known and the code well formed', () => {
  assert.equal(checkTracking('Yurtiçi Kargo', 'YK-11223344').ok, true);
  assert.equal(checkTracking('Bilinmeyen Kargo', 'YK-11223344').ok, false);
  assert.equal(checkTracking('MNG Kargo', '123').ok, false);
  assert.equal(checkTracking('MNG Kargo', 'abc def 123').ok, false);
  const ok = checkTracking('PTT Kargo', '  KP0123456789 ');
  assert.ok(ok.ok && ok.code === 'KP0123456789');
});
