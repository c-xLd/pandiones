import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import postcss from 'postcss';
import { stylesheetFiles } from './helpers/stylesheets';

// Raw values belong in tokens.css; everything else references tokens (DESIGN.md → "Tokenlar").
const sheets = stylesheetFiles().filter((file) => !file.endsWith(path.join('styles', 'tokens.css')));

function violations(check: (prop: string, value: string) => boolean) {
  const found: string[] = [];
  for (const file of sheets) {
    postcss.parse(readFileSync(file, 'utf8')).walkDecls((decl) => {
      if (check(decl.prop, decl.value)) found.push(`${path.basename(file)}: ${decl.prop}: ${decl.value}`);
    });
  }
  return found;
}

test('global CSS is only an ordered import list', () => {
  const entry = readFileSync('src/app/globals.css', 'utf8');
  const rules = entry.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').map((l) => l.trim()).filter(Boolean);
  assert.ok(rules.length > 0);
  for (const line of rules) assert.match(line, /^@import '\.\.\/styles\/.+\.css';$/);
});

test('colours come from tokens', () => {
  assert.deepEqual(violations((_p, v) => /#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(|\b(white|black)\b/i.test(v)), []);
});

test('only the three brand families are used', () => {
  assert.deepEqual(
    violations((p, v) => /^font(-family)?$/.test(p) && /(Bebas|Instrument|Arial|Helvetica|MontserratAlt1|Cormorant|Manrope)/i.test(v)),
    [],
  );
});

test('type sizes, tracking and weights use the scale', () => {
  assert.deepEqual(violations((p, v) => p === 'font-size' && !/^(var\(--(text-|product-name-size)|inherit$|0$|[\d.]+em$)/.test(v)), []);
  assert.deepEqual(violations((p, v) => p === 'letter-spacing' && !/^(var\(--tracking-|inherit$|normal$|0$)/.test(v)), []);
  assert.deepEqual(violations((p, v) => p === 'font-weight' && !/^(var\(--weight-|inherit$)/.test(v)), []);
});

test('radii and shadows use tokens', () => {
  assert.deepEqual(violations((p, v) => /radius$/.test(p) && /\d+px/.test(v)), []);
  assert.deepEqual(
    violations((p, v) => p === 'box-shadow' && !/^(var\(--shadow-|none$|0 0 0 0 transparent$|0 0 0 1px var\(|0 1px currentColor$|inset )/.test(v)),
    [],
  );
});

test('global stacking layers use z tokens', () => {
  // Values under 20 are local stacking inside a component; the fullscreen gallery's
  // children (30/60) sit inside its own stacking context.
  assert.deepEqual(
    violations((p, v) => p === 'z-index' && /^\d+$/.test(v) && Number(v) >= 20 && !['30', '60'].includes(v)),
    [],
  );
});
