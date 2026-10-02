/** Türkiye beden tablosu: the one chart behind /beden-rehberi and the product-page size guide.
 *  Sold sizes are S, M, L and XL; ranges are body measurements in centimetres. */

export type Measure = 'bust' | 'waist' | 'hip';
export type Range = readonly [min: number, max: number];

export type SizeRow = {
  size: 'S' | 'M' | 'L' | 'XL';
  tr: number;
  bust: Range;
  waist: Range;
  hip: Range;
};

export const SIZE_CHART: readonly SizeRow[] = [
  { size: 'S', tr: 36, bust: [82, 86], waist: [62, 66], hip: [88, 92] },
  { size: 'M', tr: 38, bust: [86, 90], waist: [66, 70], hip: [92, 96] },
  { size: 'L', tr: 40, bust: [90, 95], waist: [70, 75], hip: [96, 102] },
  { size: 'XL', tr: 42, bust: [95, 102], waist: [75, 82], hip: [102, 110] },
];

export const MEASURE_LABELS: Record<Measure, string> = { bust: 'Göğüs', waist: 'Bel', hip: 'Kalça' };

export const formatRange = ([min, max]: Range) => `${min}–${max}`;

export type SizeMatch =
  | { kind: 'fit'; row: SizeRow }
  | { kind: 'below'; row: SizeRow }
  | { kind: 'above'; row: SizeRow };

/** Size for one measurement. A value on a shared boundary goes to the larger size, which is the usual advice. */
export function sizeForMeasure(measure: Measure, value: number): SizeMatch {
  const first = SIZE_CHART[0];
  const last = SIZE_CHART[SIZE_CHART.length - 1];
  if (value < first[measure][0]) return { kind: 'below', row: first };
  if (value > last[measure][1]) return { kind: 'above', row: last };
  for (let index = SIZE_CHART.length - 1; index >= 0; index -= 1) {
    const row = SIZE_CHART[index];
    if (value >= row[measure][0] && value <= row[measure][1]) return { kind: 'fit', row };
  }
  return { kind: 'fit', row: last };
}

export type Recommendation = {
  /** Largest size any given measurement needs; null when no measurement was entered. */
  row: SizeRow | null;
  perMeasure: Partial<Record<Measure, SizeMatch>>;
  /** Measurements point at different sizes. */
  mixed: boolean;
  /** At least one measurement is outside the chart. */
  outOfRange: boolean;
};

export function recommendSize(values: Partial<Record<Measure, number | null>>): Recommendation {
  const perMeasure: Partial<Record<Measure, SizeMatch>> = {};
  for (const measure of Object.keys(MEASURE_LABELS) as Measure[]) {
    const value = values[measure];
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
      perMeasure[measure] = sizeForMeasure(measure, value);
    }
  }
  const matches = Object.values(perMeasure) as SizeMatch[];
  if (matches.length === 0) return { row: null, perMeasure, mixed: false, outOfRange: false };
  const rank = (row: SizeRow) => SIZE_CHART.indexOf(row);
  const row = matches.reduce((largest, match) => (rank(match.row) > rank(largest) ? match.row : largest), matches[0].row);
  return {
    row,
    perMeasure,
    mixed: new Set(matches.map((match) => match.row.size)).size > 1,
    outOfRange: matches.some((match) => match.kind !== 'fit'),
  };
}

/* ── Sütyen ölçüsü (TR/EU): band from the underbust, cup from bust − underbust ── */

export type BraBand = { band: number; underbust: Range };
export type BraCup = { cup: 'A' | 'B' | 'C' | 'D' | 'E'; difference: Range };

export const BRA_BANDS: readonly BraBand[] = [
  { band: 70, underbust: [68, 72] },
  { band: 75, underbust: [73, 77] },
  { band: 80, underbust: [78, 82] },
  { band: 85, underbust: [83, 87] },
  { band: 90, underbust: [88, 92] },
  { band: 95, underbust: [93, 97] },
];

/** Bust minus underbust, in centimetres. */
export const BRA_CUPS: readonly BraCup[] = [
  { cup: 'A', difference: [11, 13] },
  { cup: 'B', difference: [13, 15] },
  { cup: 'C', difference: [15, 17] },
  { cup: 'D', difference: [17, 19] },
  { cup: 'E', difference: [19, 21] },
];

export type BraResult =
  | { kind: 'size'; band: number; cup: BraCup['cup']; difference: number }
  | { kind: 'out-of-range'; reason: 'band' | 'cup'; difference: number };

/** Band where the underbust falls (a boundary goes to the larger band); cup by the difference, same rule. */
export function braSize(underbust: number, bust: number): BraResult {
  const difference = Math.round((bust - underbust) * 10) / 10;
  const band = [...BRA_BANDS].reverse().find((row) => underbust >= row.underbust[0] && underbust <= row.underbust[1] + 0.99);
  if (!band) return { kind: 'out-of-range', reason: 'band', difference };
  const cup = [...BRA_CUPS].reverse().find((row) => difference >= row.difference[0] && difference <= row.difference[1]);
  if (!cup) return { kind: 'out-of-range', reason: 'cup', difference };
  return { kind: 'size', band: band.band, cup: cup.cup, difference };
}

/** Typical bust for a band + cup cell in the bra table: the band plus the middle of the cup's difference. */
export const braTypicalBust = (band: BraBand, cup: BraCup) => band.band + (cup.difference[0] + cup.difference[1]) / 2;
