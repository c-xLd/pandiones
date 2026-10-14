import { SKU_PATTERN } from './commerce-fields';

/**
 * Stock codes derived from the product: PAN-<name>-<colour>-<size>, ASCII, upper case. The editor shows the
 * suggestion as a placeholder; the server fills every empty code with it and keeps it unique across the
 * catalog by adding -2, -3 … Pure; tested in tests/product-sku.test.ts.
 */

const MAX_LENGTH = 40;

function ascii(text: string): string {
  return text
    .toLocaleUpperCase('tr-TR')
    .replace(/Ç/g, 'C').replace(/Ğ/g, 'G').replace(/İ/g, 'I').replace(/Ö/g, 'O').replace(/Ş/g, 'S').replace(/Ü/g, 'U')
    .replace(/[^A-Z0-9]+/g, '');
}

export function suggestSku(productName: string, color: string, size: string): string {
  const name = ascii(productName).slice(0, 8) || 'URUN';
  const colour = ascii(color).slice(0, 4) || 'RNK';
  const sz = ascii(size).slice(0, 6) || 'STD';
  return `PAN-${name}-${colour}-${sz}`;
}

/** `base` itself when free, otherwise base-2, base-3 …, shortening the base so the code stays within 40 characters. */
export function uniqueSku(base: string, taken: ReadonlySet<string>): string {
  if (!taken.has(base)) return base;
  for (let n = 2; ; n++) {
    const suffix = `-${n}`;
    const code = `${base.slice(0, MAX_LENGTH - suffix.length)}${suffix}`;
    if (!taken.has(code) && SKU_PATTERN.test(code)) return code;
  }
}
