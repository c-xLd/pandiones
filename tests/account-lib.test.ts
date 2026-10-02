import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canRequestReturn,
  carrierTrackingUrl,
  filterOrders,
  isTabKey,
  monogram,
  orderProgressStep,
  orderStatusMeta,
  passwordStrength,
  productHref,
  type Order,
} from '../src/app/hesabim/_components/lib';

const order = (overrides: Partial<Order>): Order => ({
  id: 'o1',
  orderNumber: 'PAN-100200',
  status: 'ODENDI',
  createdAt: '2026-09-01T10:00:00.000Z',
  totalAmount: 1200,
  customerName: 'Deniz Kaya',
  shippingAddress: 'Moda Cd. 12',
  shippingDistrict: 'Kadıköy',
  shippingCity: 'Ankara',
  items: [{ id: 'i1', productName: 'Saten Gecelik', size: 'M', quantity: 1, price: 1200 }],
  returns: [],
  ...overrides,
});

test('filters orders by status group and by number or product name', () => {
  const orders = [
    order({ id: 'a', orderNumber: 'PAN-1', status: 'KARGODA' }),
    order({ id: 'b', orderNumber: 'PAN-2', status: 'TESLIM_EDILDI' }),
    order({ id: 'c', orderNumber: 'PAN-3', status: 'TESLIM_EDILDI', returns: [{ id: 'r', reason: 'x', status: 'BEKLIYOR', createdAt: '' }] }),
  ];
  assert.deepEqual(filterOrders(orders, 'ACTIVE', '').map((o) => o.id), ['a']);
  assert.deepEqual(filterOrders(orders, 'DELIVERED', '').map((o) => o.id), ['b', 'c']);
  assert.deepEqual(filterOrders(orders, 'RETURNS', '').map((o) => o.id), ['c']);
  assert.deepEqual(filterOrders(orders, 'ALL', 'pan-2').map((o) => o.id), ['b']);
  assert.equal(filterOrders(orders, 'ALL', 'saten').length, 3);
  assert.equal(filterOrders(orders, 'ACTIVE', 'pan-2').length, 0);
});

test('returns are offered only for paid orders without a request', () => {
  assert.equal(canRequestReturn(order({ status: 'TESLIM_EDILDI' })), true);
  assert.equal(canRequestReturn(order({ status: 'ODEME_BEKLENIYOR' })), false);
  assert.equal(canRequestReturn(order({ returns: [{ id: 'r', reason: 'x', status: 'REDDEDILDI', createdAt: '' }] })), false);
});

test('status labels and progress steps', () => {
  assert.equal(orderStatusMeta('KARGODA').label, 'Kargoda');
  assert.equal(orderStatusMeta('BILINMEYEN').label, 'BILINMEYEN');
  assert.equal(orderProgressStep('ODENDI'), 1);
  assert.equal(orderProgressStep('TESLIM_EDILDI'), 4);
  assert.equal(orderProgressStep('ODEME_BASARISIZ'), 0);
});

test('tracking links only for known carriers', () => {
  assert.match(carrierTrackingUrl('Yurtiçi Kargo', ' AB 12 ')!, /yurticikargo\.com.*code=AB%2012$/);
  assert.match(carrierTrackingUrl('Sürat Kargo', 'SK123')!, /suratkargo\.com\.tr.*kargotakipno=SK123$/);
  assert.match(carrierTrackingUrl('PTT Kargo', 'KP999')!, /gonderitakip\.ptt\.gov\.tr.*q=KP999$/);
  assert.equal(carrierTrackingUrl('Bilinmeyen Kargo', 'X1'), null);
  assert.equal(carrierTrackingUrl('MNG Kargo', ''), null);
});

test('small helpers', () => {
  assert.equal(isTabKey('adresler'), true);
  assert.equal(isTabKey('admin'), false);
  assert.equal(productHref('saten-gecelik'), '/urun/saten-gecelik');
  assert.equal(productHref(null), null);
  assert.equal(monogram('ilayda su yıldız'), 'İY');
  assert.equal(monogram(''), 'P');
  assert.equal(passwordStrength('').level, 0);
  assert.equal(passwordStrength('abcdef').level, 1);
  assert.equal(passwordStrength('Abcdefgh1!xy').level, 3);
});
