import assert from 'node:assert/strict';
import test from 'node:test';
import { validateGiftCardPurchase, giftCardThemeName } from '../src/lib/gift-cards/purchase';

const valid = {
  amount: 2500,
  theme: 'couture',
  recipientName: 'Aslı Yılmaz',
  recipientEmail: 'asli@example.com',
  senderName: '',
  giftNote: '',
};

test('a complete purchase has no errors', () => {
  assert.deepEqual(validateGiftCardPurchase(valid), {});
});

test('amount must be a whole number inside the limits and on the step', () => {
  assert.ok(validateGiftCardPurchase({ ...valid, amount: 499 }).amount);
  assert.ok(validateGiftCardPurchase({ ...valid, amount: 50001 }).amount);
  assert.ok(validateGiftCardPurchase({ ...valid, amount: 1234 }).amount);
  assert.ok(validateGiftCardPurchase({ ...valid, amount: 1000.5 }).amount);
  assert.equal(validateGiftCardPurchase({ ...valid, amount: 50000 }).amount, undefined);
});

test('recipient, theme and note are checked', () => {
  const errors = validateGiftCardPurchase({ ...valid, theme: 'gold', recipientName: 'A', recipientEmail: 'x@', giftNote: 'n'.repeat(201) });
  assert.deepEqual(Object.keys(errors).sort(), ['giftNote', 'recipientEmail', 'recipientName', 'theme']);
});

test('theme names are plain Turkish labels', () => {
  assert.equal(giftCardThemeName('couture'), 'Fildişi');
  assert.equal(giftCardThemeName('unknown'), 'Noir');
});
