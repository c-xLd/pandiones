/** Whole-lira TRY formatting used across the admin panel. */
export const money = (n: number) =>
  new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(n);
