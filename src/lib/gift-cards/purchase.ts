/** Gift card purchase rules, shared by /hediye-karti and POST /api/checkout. Tested in tests/gift-card-purchase.test.ts. */

export const GIFT_CARD_THEMES = [
  { id: 'couture', name: 'Fildişi' },
  { id: 'noir', name: 'Noir' },
  { id: 'rose', name: 'Pudra' },
] as const;

export type GiftCardThemeId = (typeof GIFT_CARD_THEMES)[number]['id'];

export const GIFT_CARD_PRESETS = [1000, 2500, 5000, 10000] as const;
export const GIFT_CARD_LIMITS = { min: 500, max: 50000, step: 50, name: 80, note: 200 } as const;

export type GiftCardPurchaseInput = {
  amount: number;
  theme: string;
  recipientName: string;
  recipientEmail: string;
  senderName: string;
  giftNote: string;
};

export type GiftCardPurchaseErrors = Partial<Record<keyof GiftCardPurchaseInput, string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const isGiftCardTheme = (value: unknown): value is GiftCardThemeId =>
  GIFT_CARD_THEMES.some((theme) => theme.id === value);

export const giftCardThemeName = (id: string) => GIFT_CARD_THEMES.find((theme) => theme.id === id)?.name ?? 'Noir';

export function validateGiftCardPurchase(input: GiftCardPurchaseInput): GiftCardPurchaseErrors {
  const errors: GiftCardPurchaseErrors = {};
  const { min, max, step } = GIFT_CARD_LIMITS;

  if (!Number.isFinite(input.amount) || !Number.isInteger(input.amount)) errors.amount = 'Tutarı tam sayı olarak girin.';
  else if (input.amount < min || input.amount > max) errors.amount = `Tutar ${min.toLocaleString('tr-TR')} ile ${max.toLocaleString('tr-TR')} ₺ arasında olmalı.`;
  else if (input.amount % step !== 0) errors.amount = `Tutar ${step} ₺ ve katları olmalı.`;

  if (!isGiftCardTheme(input.theme)) errors.theme = 'Bir kart tasarımı seçin.';

  const recipientName = input.recipientName.trim();
  if (recipientName.length < 2) errors.recipientName = 'Alıcının adını yazın.';
  else if (recipientName.length > GIFT_CARD_LIMITS.name) errors.recipientName = `En fazla ${GIFT_CARD_LIMITS.name} karakter.`;

  const email = input.recipientEmail.trim();
  if (!email) errors.recipientEmail = 'Alıcının e-posta adresini yazın.';
  else if (!EMAIL_PATTERN.test(email)) errors.recipientEmail = 'Geçerli bir e-posta adresi yazın.';

  if (input.senderName.trim().length > GIFT_CARD_LIMITS.name) errors.senderName = `En fazla ${GIFT_CARD_LIMITS.name} karakter.`;
  if (input.giftNote.trim().length > GIFT_CARD_LIMITS.note) errors.giftNote = `Not en fazla ${GIFT_CARD_LIMITS.note} karakter olabilir.`;

  return errors;
}
