/**
 * Reads a tracking sheet: one order per line as `sipariş no; kargo firması; takip numarası`.
 * Accepts `;`, `,` or tab, an optional header row, a BOM, quoted cells and `#` before the order number.
 * Pure (runs in the browser); tested in tests/admin-tracking-import.test.ts.
 */

export type TrackingRow = { line: number; orderNumber: string; company: string; code: string };
export type TrackingParse = { rows: TrackingRow[]; errors: { line: number; reason: string }[] };

export const TRACKING_IMPORT_LIMIT = 200;

const HEADER = /sipari|order|takip|kargo|firma/i;

function splitLine(line: string, separator: string): string[] {
  const cells: string[] = [];
  let current = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else quoted = !quoted;
    } else if (char === separator && !quoted) {
      cells.push(current);
      current = '';
    } else current += char;
  }
  cells.push(current);
  return cells.map((cell) => cell.trim());
}

function detectSeparator(line: string): string {
  if (line.includes(';')) return ';';
  if (line.includes('\t')) return '\t';
  return ',';
}

export function parseTrackingCsv(text: string): TrackingParse {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/);
  const result: TrackingParse = { rows: [], errors: [] };
  const firstContent = lines.find((line) => line.trim());
  if (!firstContent) return result;
  const separator = detectSeparator(firstContent);
  let headerSkipped = false;

  lines.forEach((raw, index) => {
    const line = index + 1;
    if (!raw.trim()) return;
    const cells = splitLine(raw, separator);
    if (!headerSkipped && result.rows.length === 0 && result.errors.length === 0 && HEADER.test(cells.join(' ')) && !/\d{4,}/.test(cells[0] ?? '')) {
      headerSkipped = true;
      return;
    }
    if (cells.length < 3 || !cells[0] || !cells[1] || !cells[2]) {
      result.errors.push({ line, reason: 'Üç sütun gerekli: sipariş no; kargo firması; takip numarası.' });
      return;
    }
    if (result.rows.length >= TRACKING_IMPORT_LIMIT) {
      result.errors.push({ line, reason: `Tek seferde en çok ${TRACKING_IMPORT_LIMIT} satır yüklenebilir.` });
      return;
    }
    result.rows.push({ line, orderNumber: cells[0].replace(/^#/, ''), company: cells[1], code: cells[2] });
  });
  return result;
}

/** Carrier names as people type them ("yurtici", "MNG") mapped to the stored name; unknown stays as typed. */
export function normalizeCarrier(input: string, carriers: readonly string[]): string {
  const fold = (value: string) =>
    value
      .toLocaleLowerCase('tr-TR')
      .replace(/ı/g, 'i')
      .replace(/ç/g, 'c')
      .replace(/ğ/g, 'g')
      .replace(/ö/g, 'o')
      .replace(/ş/g, 's')
      .replace(/ü/g, 'u')
      .replace(/kargo/g, '')
      .replace(/[^a-z0-9]/g, '');
  const wanted = fold(input);
  return carriers.find((carrier) => fold(carrier) === wanted) ?? input.trim();
}
