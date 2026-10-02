const SIZE_ORDER = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'];

/** Letter sizes in wearing order (XS → XL); unknown labels keep their relative order at the end. */
export function sortBySize<T extends { size: string }>(variants: T[]): T[] {
  const rank = (size: string) => {
    const index = SIZE_ORDER.indexOf(size.trim().toUpperCase());
    return index === -1 ? SIZE_ORDER.length : index;
  };
  return variants
    .map((variant, position) => ({ variant, position }))
    .sort((a, b) => rank(a.variant.size) - rank(b.variant.size) || a.position - b.position)
    .map(({ variant }) => variant);
}
