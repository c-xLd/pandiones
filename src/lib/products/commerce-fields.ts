/**
 * Rules for the commerce fields of a product (shared by the admin editor and the server):
 * EAN-13 barcode, SKU, VAT rate and the struck-through list price. Pure functions, no I/O.
 */

export const VAT_RATES = [1, 10, 20] as const;
export type VatRate = (typeof VAT_RATES)[number];
export const DEFAULT_VAT_RATE: VatRate = 10;

export const isVatRate = (value: unknown): value is VatRate => VAT_RATES.includes(value as VatRate);

/** EAN-13: 13 digits, the last one the GS1 check digit (weights 1,3,1,3… over the first 12). */
export function isValidEan13(value: string): boolean {
  if (!/^\d{13}$/.test(value)) return false;
  const digits = [...value].map(Number);
  const sum = digits.slice(0, 12).reduce((total, digit, index) => total + digit * (index % 2 === 0 ? 1 : 3), 0);
  return (10 - (sum % 10)) % 10 === digits[12];
}

/** SKU: letters, digits, dot, dash, underscore and slash; 2–40 characters. Stored upper-case. */
export const SKU_PATTERN = /^[A-Za-z0-9._/-]{2,40}$/;
export const normalizeSku = (value: string | null | undefined) => (value ?? '').trim().toUpperCase() || null;
export const normalizeBarcode = (value: string | null | undefined) => (value ?? '').replace(/\s+/g, '') || null;

/**
 * A list price is only meaningful above the selling price; anything else would be a fake discount.
 * Returns the problem in Turkish, or null when the pair is fine (an empty list price is fine).
 */
export function compareAtPriceProblem(price: number, compareAtPrice: number | null | undefined): string | null {
  if (compareAtPrice === null || compareAtPrice === undefined) return null;
  if (!Number.isFinite(compareAtPrice) || compareAtPrice <= 0) return 'Piyasa fiyatı sıfırdan büyük olmalı.';
  if (compareAtPrice <= price) return 'Piyasa fiyatı satış fiyatından yüksek olmalı; değilse boş bırakın.';
  return null;
}

/** VAT included in a VAT-inclusive amount, rounded to kuruş. */
export function vatIncluded(grossAmount: number, rate: number): number {
  return Math.round((grossAmount - grossAmount / (1 + rate / 100)) * 100) / 100;
}
