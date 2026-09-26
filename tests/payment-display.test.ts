import assert from 'node:assert/strict';
import test from 'node:test';
import { describeOrderPayment } from '../src/lib/payment/payment-display';

test('simulator payments are reported as test payments', () => {
  assert.equal(describeOrderPayment(1890, { paymentId: 'MOCK_PAY_1726', token: 'MOCK_IYZICO_1_abc' }), 'test');
  assert.equal(describeOrderPayment(1890, { paymentId: null, token: 'MOCK_IYZICO_1_abc' }), 'test');
});

test('real card payments are reported as card payments', () => {
  assert.equal(describeOrderPayment(1890, { paymentId: '22416035', token: 'b1c2', lastFourDigits: '0006' }), 'card');
});

test('fully discounted orders are not reported as card payments', () => {
  assert.equal(describeOrderPayment(0, null), 'no-charge');
  assert.equal(describeOrderPayment(0, undefined), 'no-charge');
});

test('paid orders without a transaction record stay unknown', () => {
  assert.equal(describeOrderPayment(1890, null), 'unknown');
  assert.equal(describeOrderPayment(null, null), 'unknown');
});
