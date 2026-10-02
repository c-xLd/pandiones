const tryFormatter = new Intl.NumberFormat('tr-TR', {
  style: 'currency',
  currency: 'TRY',
  maximumFractionDigits: 0,
});

/** Whole-lira display price, e.g. "₺1.250". Display only — totals are recomputed on the server. */
export const formatTRY = (amount: number) => tryFormatter.format(amount);
