import assert from 'node:assert/strict';
import test from 'node:test';
import { validateCouponInput } from '../src/lib/orders/coupon-rules';

test('admin coupon input: valid percentage and fixed coupons', () => {
  const pct = validateCouponInput({ code: ' yaz20 ', discountType: 'PERCENTAGE', discountValue: '20', maxUses: '', perEmailLimit: '1' });
  assert.equal(pct.ok, true);
  if (pct.ok) {
    assert.equal(pct.value.code, 'YAZ20');
    assert.equal(pct.value.maxUses, null);
    assert.equal(pct.value.perEmailLimit, 1);
  }
  assert.equal(validateCouponInput({ code: 'HOSGELDIN', discountType: 'FIXED', discountValue: 250, minSpend: 1000 }).ok, true);
});

test('admin coupon input: refuses free-order and malformed coupons', () => {
  const bad: Record<string, unknown>[] = [
    { code: 'A', discountType: 'PERCENTAGE', discountValue: 10 },
    { code: 'TÜM-İNDİRİM', discountType: 'PERCENTAGE', discountValue: 10 },
    { code: 'BEDAVA', discountType: 'PERCENTAGE', discountValue: 100 },
    { code: 'EKSI', discountType: 'FIXED', discountValue: -50 },
    { code: 'KESIR', discountType: 'PERCENTAGE', discountValue: 12.5 },
    { code: 'KOTA', discountType: 'FIXED', discountValue: 50, maxUses: 0 },
    { code: 'TARIH', discountType: 'FIXED', discountValue: 50, startsAt: '2026-10-10T10:00:00Z', expiresAt: '2026-10-01T10:00:00Z' },
    { code: 'TUR', discountType: 'BEDAVA', discountValue: 50 },
  ];
  for (const input of bad) assert.equal(validateCouponInput(input).ok, false, String(input.code));
});
