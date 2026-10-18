/**
 * Money is whole kuruş (Int, 1 TL = 100 kuruş) in the database and in every server-side calculation, so
 * sums, discounts and balances are exact. TL appears only at the edges: JSON for the screens, admin form
 * input, e-mails, the Google feed and the iyzico request (which wants a "123.45" string).
 * Pure: safe in client and server code.
 */

/** TL → kuruş, rounded to the nearest kuruş (the only place TL is turned into an integer). */
export const tlToKurus = (tl: number) => Math.round(tl * 100);

/** Kuruş → TL for display and JSON. */
export const kurusToTl = (kurus: number) => kurus / 100;

/** Same for nullable columns. */
export const kurusToTlOrNull = (kurus: number | null | undefined) => (kurus == null ? null : kurus / 100);

/** A share of an amount, in kuruş (e.g. a 15 % coupon), rounded to the kuruş. */
export const percentOfKurus = (kurus: number, percent: number) => Math.round((kurus * percent) / 100);

/** iyzico takes prices as decimal strings with a dot: 12345 kuruş → "123.45". */
export const kurusToIyzico = (kurus: number) => (kurus / 100).toFixed(2);

/**
 * A TL amount typed into a form or sent as JSON (number, "1.234,50", "1234.5") → kuruş; null when it is
 * not a finite, non-negative amount.
 */
export function parseTlToKurus(value: unknown): number | null {
  let tl: number;
  if (typeof value === 'number') tl = value;
  else if (typeof value === 'string') {
    const trimmed = value.trim().replace(/\s|₺|TL/gi, '');
    if (!trimmed) return null;
    // "1.234,50" (Turkish) or "1234,5" → dot decimal; "1234.50" stays.
    const normalized = trimmed.includes(',') ? trimmed.replace(/\./g, '').replace(',', '.') : trimmed;
    tl = Number(normalized);
  } else return null;
  if (!Number.isFinite(tl) || tl < 0) return null;
  return tlToKurus(tl);
}

/** "₺1.234,50" from kuruş (no decimals when whole). */
export function formatKurus(kurus: number) {
  const whole = kurus % 100 === 0;
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2 }).format(kurus / 100);
}
