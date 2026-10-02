import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const ENTRY = 'src/app/globals.css';
const STYLES_DIR = 'src/styles';
const IMPORT = /^@import\s+['"](.+?)['"];\s*$/gm;

function globalFiles(entry: string): string[] {
  const source = readFileSync(entry, 'utf8');
  const files: string[] = [];
  for (const match of source.matchAll(IMPORT)) {
    files.push(...globalFiles(path.join(path.dirname(entry), match[1])));
  }
  return files.length ? files : [entry];
}

function allStyleFiles(dir = STYLES_DIR): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return allStyleFiles(full);
    return entry.name.endsWith('.css') ? [full] : [];
  });
}

/** Every stylesheet the site ships: the global entry in cascade order, then the route-only
 *  sheets that pages import themselves (pages/admin.css, pages/checkout.css, …). */
export function stylesheetFiles(entry = ENTRY): string[] {
  const global = globalFiles(entry);
  const seen = new Set(global.map((file) => path.normalize(file)));
  const routeOnly = allStyleFiles().filter((file) => !seen.has(path.normalize(file))).sort();
  return [...global, ...routeOnly];
}

/** Concatenated CSS of every stylesheet. */
export function readGlobalCss(): string {
  return stylesheetFiles().map((file) => readFileSync(file, 'utf8')).join('\n');
}
