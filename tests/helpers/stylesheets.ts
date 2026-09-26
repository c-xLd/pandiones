import { readFileSync } from 'node:fs';
import path from 'node:path';

const ENTRY = 'src/app/globals.css';
const IMPORT = /^@import\s+['"](.+?)['"];\s*$/gm;

/** Stylesheets reachable from the global entry, in cascade order. */
export function stylesheetFiles(entry = ENTRY): string[] {
  const source = readFileSync(entry, 'utf8');
  const files: string[] = [];
  for (const match of source.matchAll(IMPORT)) {
    files.push(...stylesheetFiles(path.join(path.dirname(entry), match[1])));
  }
  return files.length ? files : [entry];
}

/** Concatenated global CSS, as the browser receives it. */
export function readGlobalCss(): string {
  return stylesheetFiles().map((file) => readFileSync(file, 'utf8')).join('\n');
}
