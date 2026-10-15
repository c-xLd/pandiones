import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import test from 'node:test';

const modifiedFiles = [
  'next.config.mjs',
  'src/app/(anasayfa)/page.tsx',
  'src/app/_home/HomeProductGrid.tsx',
  'src/app/canta/page.tsx',
  'src/app/odeme/page.tsx',
  'src/components/collection/CollectionProductCard.tsx',
  'tests/preview-config.test.mjs',
  'tests/challenge-static-headers.test.mjs',
];

// Regex for forbidden words: atölye, atolye, atelier, maison, istanbul in any case or unicode variant
const forbiddenRegex = /\b(atölye|atolye|atelier|maison|istanbul|i\u0307stanbul)\b/iu;

// Artificial marketing / trust badges
const badgeRegexes = [
  /Özel Pandiones Kutusu/i,
  /Sigortalı Gönderim/i,
  /30 Gün Değişim/i,
  /BDDK güvencesi/i,
  /uçtan uca şifreleme/i,
  /güvenli alışveriş/i,
  /orijinallik garantisi/i,
  /%100 müşteri memnuniyeti/i,
];

test('adversarial brand compliance: zero forbidden words in modified files', () => {
  const violations = [];

  for (const relPath of modifiedFiles) {
    const fullPath = path.resolve(relPath);
    if (!fs.existsSync(fullPath)) continue;
    const content = fs.readFileSync(fullPath, 'utf8');
    const lines = content.split('\n');

    lines.forEach((line, idx) => {
      const nfc = line.normalize('NFC');
      const nfd = line.normalize('NFD');
      const match = nfc.match(forbiddenRegex) || nfd.match(forbiddenRegex);
      if (match) {
        violations.push({
          file: relPath,
          line: idx + 1,
          word: match[0],
          content: line.trim(),
        });
      }
    });
  }

  assert.equal(
    violations.length,
    0,
    `Violations found in modified files:\n${violations.map((v) => `  ${v.file}:${v.line} [${v.word}] -> ${v.content}`).join('\n')}`,
  );
});

test('adversarial brand compliance: zero artificial marketing or trust badges in modified files', () => {
  const violations = [];

  for (const relPath of modifiedFiles) {
    const fullPath = path.resolve(relPath);
    if (!fs.existsSync(fullPath)) continue;
    const content = fs.readFileSync(fullPath, 'utf8');
    const lines = content.split('\n');

    lines.forEach((line, idx) => {
      for (const badgeRe of badgeRegexes) {
        if (badgeRe.test(line)) {
          violations.push({
            file: relPath,
            line: idx + 1,
            badge: line.trim(),
          });
        }
      }
    });
  }

  assert.equal(
    violations.length,
    0,
    `Trust badge violations found in modified files:\n${violations.map((v) => `  ${v.file}:${v.line} -> ${v.badge}`).join('\n')}`,
  );
});
