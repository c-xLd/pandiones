import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

function getAllSourceFiles(dir: string, extensions: string[]): string[] {
  const results: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', '.next', '.git', 'coverage', '.pg-data'].includes(entry.name)) {
        continue;
      }
      results.push(...getAllSourceFiles(fullPath, extensions));
    } else if (entry.isFile()) {
      if (extensions.some((ext) => entry.name.endsWith(ext))) {
        results.push(fullPath);
      }
    }
  }

  return results;
}

test('Brand compliance: src/ contains zero prohibited brand words', () => {
  const srcDir = path.join(process.cwd(), 'src');
  const files = getAllSourceFiles(srcDir, ['.tsx', '.ts', '.css', '.json']);

  // Prohibited words defined in AGENTS.md permanent memory
  // "atölye", "atolye", "atelier", "maison", "istanbul" (case-insensitive)
  const prohibitedPattern = /\b(atölye|atolye|atelier|maison|istanbul)\b/i;

  const violations: { file: string; line: number; match: string }[] = [];

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      const match = line.match(prohibitedPattern);
      if (match) {
        violations.push({
          file: path.relative(process.cwd(), file),
          line: index + 1,
          match: match[0],
        });
      }
    });
  }

  assert.equal(
    violations.length,
    0,
    `Prohibited brand words found in src/:\n${violations
      .map((v) => `  - ${v.file}:${v.line} -> "${v.match}"`)
      .join('\n')}`
  );
});

test('Brand compliance: src/ contains zero artificial marketing / trust badges', () => {
  const srcDir = path.join(process.cwd(), 'src');
  const files = getAllSourceFiles(srcDir, ['.tsx', '.ts']);

  // Prohibited artificial marketing badge phrases from AGENTS.md
  const prohibitedBadgePatterns = [
    /Özel Pandiones Kutusu/i,
    /Sigortalı Gönderim/i,
    /30 Gün Değişim/i,
    /BDDK güvencesi/i,
    /uçtan uca şifreleme/i,
  ];

  const violations: { file: string; line: number; badge: string }[] = [];

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      for (const pattern of prohibitedBadgePatterns) {
        if (pattern.test(line)) {
          violations.push({
            file: path.relative(process.cwd(), file),
            line: index + 1,
            badge: line.trim(),
          });
        }
      }
    });
  }

  assert.equal(
    violations.length,
    0,
    `Prohibited marketing/trust badges found in src/:\n${violations
      .map((v) => `  - ${v.file}:${v.line} -> "${v.badge}"`)
      .join('\n')}`
  );
});

test('UI integrity: src/ contains zero dead placeholder hrefs (href="#")', () => {
  const srcDir = path.join(process.cwd(), 'src');
  const files = getAllSourceFiles(srcDir, ['.tsx', '.ts']);

  const deadHrefPattern = /href=["']#["']|href=\{\s*['"]#['"]\s*\}/;

  const violations: { file: string; line: number }[] = [];

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      if (deadHrefPattern.test(line)) {
        violations.push({
          file: path.relative(process.cwd(), file),
          line: index + 1,
        });
      }
    });
  }

  assert.equal(
    violations.length,
    0,
    `Dead href="#" links found in src/:\n${violations
      .map((v) => `  - ${v.file}:${v.line}`)
      .join('\n')}`
  );
});
