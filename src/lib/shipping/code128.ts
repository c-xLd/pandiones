/**
 * Code 128 (code set B) for shipping labels: printable ASCII 32–126, start B, modulo-103 check symbol,
 * stop. No dependency. Each pattern lists bar/space widths in modules, starting with a bar; every symbol is
 * 11 modules (stop 13). Pure; tested in tests/shipping.test.ts (module sums, bar parity, check symbol).
 */

export const CODE128_PATTERNS = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
  '114131', '311141', '411131', '211412', '211214', '211232', '2331112',
] as const;

const START_B = 104;
const STOP = 106;

/** Symbol values for `text`: start B, data, check symbol, stop. Throws on characters outside ASCII 32–126. */
export function code128Values(text: string): number[] {
  if (!text) throw new Error('Barkod metni boş.');
  const data = Array.from(text, (char) => {
    const code = char.charCodeAt(0);
    if (code < 32 || code > 126) throw new Error(`Barkodda kullanılamayan karakter: ${char}`);
    return code - 32;
  });
  const check = (START_B + data.reduce((sum, value, index) => sum + value * (index + 1), 0)) % 103;
  return [START_B, ...data, check, STOP];
}

/** Bars as [x, width] in modules, plus the total width (with a 10-module quiet zone each side). */
export function code128Bars(text: string): { bars: [number, number][]; width: number } {
  const quiet = 10;
  let x = quiet;
  const bars: [number, number][] = [];
  for (const value of code128Values(text)) {
    const widths = CODE128_PATTERNS[value];
    for (let i = 0; i < widths.length; i += 1) {
      const w = Number(widths[i]);
      if (i % 2 === 0) bars.push([x, w]);
      x += w;
    }
  }
  return { bars, width: x + quiet };
}
