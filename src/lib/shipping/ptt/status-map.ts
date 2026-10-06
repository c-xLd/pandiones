import type { ShipmentStatus } from '../statuses';

/**
 * A PTT movement description → our shipment status. PTT's status codes are not public, so the Turkish
 * wording decides; anything not recognised returns null and is kept as an event without changing the
 * status. Order matters: "teslim edilemedi" before "teslim edildi". Pure; tested in tests/shipping.test.ts.
 */
const RULES: [RegExp, ShipmentStatus][] = [
  [/teslim\s+edilemedi|adreste\s+bulunamad|al[ıi]c[ıi]\s+bulunamad|adres\s+(hatal|yetersiz)|kabul\s+etmedi|tebli[gğ]\s+edilemedi/i, 'TESLIM_EDILEMEDI'],
  [/g[öo]ndericiye\s+(iade|teslim)|iade\s+edildi|iade\s+s[üu]recinde|geri\s+d[öo]n/i, 'IADE'],
  [/teslim\s+edildi|al[ıi]c[ıi]ya\s+teslim/i, 'TESLIM_EDILDI'],
  [/da[gğ][ıi]t[ıi]m|da[gğ][ıi]t[ıi]ca|kuryeye\s+verildi/i, 'DAGITIMDA'],
  [/kabul\s+edildi|kabul\s+i[sş]lemi|i[sş]leme\s+al[ıi]nd/i, 'KABUL'],
];

export function mapPttStatus(description: string): ShipmentStatus | null {
  const text = description.toLocaleLowerCase('tr-TR');
  return RULES.find(([pattern]) => pattern.test(text))?.[1] ?? null;
}
