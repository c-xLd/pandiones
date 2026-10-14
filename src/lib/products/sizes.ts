const SIZE_ORDER = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'];
const PAIRED_ORDER = ['XS/S', 'S/M', 'M/L', 'L/XL', 'XL/XXL'];
const CUPS = 'ABCDEFGH';

/**
 * Sizes in wearing order: letter sizes (XS → XL), then paired hosiery sizes (S/M → L/XL), then bra sizes
 * by band and cup (70A, 70B … 75A); unknown labels keep their relative order at the end.
 */
function rank(size: string): number {
  const label = size.trim().toUpperCase();
  const letter = SIZE_ORDER.indexOf(label);
  if (letter !== -1) return letter;
  const paired = PAIRED_ORDER.indexOf(label);
  if (paired !== -1) return 100 + paired;
  const bra = /^(\d{2,3})([A-H]{1,3})$/.exec(label);
  if (bra) return 1000 + Number(bra[1]) * 100 + CUPS.indexOf(bra[2][0]) * 3 + bra[2].length;
  return 100000;
}

export function sortBySize<T extends { size: string }>(variants: T[]): T[] {
  return variants
    .map((variant, position) => ({ variant, position }))
    .sort((a, b) => rank(a.variant.size) - rank(b.variant.size) || a.position - b.position)
    .map(({ variant }) => variant);
}
