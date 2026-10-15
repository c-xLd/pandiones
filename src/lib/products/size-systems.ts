import { BRA_BANDS, BRA_CUPS } from './size-chart';

/**
 * Which sizes a product is sold in follows from its category: bras by band and cup (the same bands and
 * cups as the size guide's bra finder, src/lib/products/size-chart.ts), hosiery in paired sizes, small
 * accessories in one size, everything else in letter sizes. Used by the admin editor to offer the right
 * sizes; the shop itself sells whatever sizes a product has.
 */

export type SizeSystemId = 'letter' | 'bra' | 'hosiery' | 'one-size';

export type SizeSystem = { id: SizeSystemId; label: string; sizes: string[]; hint: string };

const BRA_SIZES = BRA_BANDS.flatMap((band) => BRA_CUPS.map((cup) => `${band.band}${cup.cup}`));

export const SIZE_SYSTEMS: Record<SizeSystemId, SizeSystem> = {
  letter: { id: 'letter', label: 'Harf beden', sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'], hint: 'Giyim ürünleri harf bedenle satılır (beden rehberindeki S–XL tablosu).' },
  bra: { id: 'bra', label: 'Sütyen (bant + kap)', sizes: BRA_SIZES, hint: 'Sütyenler bant ve kap ölçüsüyle satılır (ör. 75B); beden rehberindeki sütyen ölçü tablosuyla aynı.' },
  hosiery: { id: 'hosiery', label: 'Çorap bedeni', sizes: ['S/M', 'M/L', 'L/XL'], hint: 'Çoraplar çift beden aralığıyla satılır.' },
  'one-size': { id: 'one-size', label: 'Tek ebat', sizes: ['Standart'], hint: 'Bu ürünler tek ebattır; yalnız “Standart” bedeni yeterlidir.' },
};

/** Sub-category first (it is more specific), then the top-level category. */
const BY_SLUG: Record<string, SizeSystemId> = {
  sutyen: 'bra',
  'push-up-destekli': 'bra',
  'balensiz-sutyen': 'bra',
  'dikissiz-lazer-sutyen': 'bra',
  'straplez-balkonet': 'bra',
  'ucgen-sutyen': 'bra',
  'gogus-toparlayici': 'bra',
  bralet: 'letter',
  aksesuarlar: 'one-size',
  'ipek-uyku-bandi': 'one-size',
  'yikama-filesi': 'one-size',
  'gogus-ucu-kapatici': 'one-size',
  'kulotlu-corap': 'hosiery',
  'jartiyer-corabi': 'hosiery',
};

export function sizeSystemFor(category: string, subcategory?: string | null): SizeSystem {
  const id = (subcategory && BY_SLUG[subcategory]) || BY_SLUG[category] || 'letter';
  return SIZE_SYSTEMS[id];
}

/** Sizes of `current` that the category's system does not use (shown as a warning, never removed). */
export function sizesOutsideSystem(system: SizeSystem, current: string[]): string[] {
  const known = new Set(system.sizes.map((size) => size.toUpperCase()));
  return current.filter((size) => !known.has(size.toUpperCase()));
}
