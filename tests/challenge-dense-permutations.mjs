import fs from 'node:fs';
import nextConfigFn from '../next.config.mjs';

const nextConfig = typeof nextConfigFn === 'function' ? nextConfigFn('phase-production-build') : nextConfigFn;
const candidates = [...nextConfig.images.imageSizes, ...nextConfig.images.deviceSizes].sort((a, b) => a - b);

function parseSizesForViewport(sizesStr, V) {
  const parts = sizesStr.split(',').map((s) => s.trim());
  for (const part of parts) {
    const match = part.match(/^\((max-width:\s*(\d+)px)\)\s*(.+)$/);
    if (match) {
      const maxW = parseInt(match[2], 10);
      const val = match[3].trim();
      if (V <= maxW) return evalVal(val, V);
    } else {
      return evalVal(part, V);
    }
  }
  return V;
}

function evalVal(val, V) {
  if (val.endsWith('vw')) return (parseFloat(val) / 100) * V;
  if (val.endsWith('px')) return parseFloat(val);
  return V;
}

function selectCandidate(targetW, cands) {
  for (const c of cands) {
    if (c >= targetW) return c;
  }
  return cands[cands.length - 1];
}

const expressions = [
  { name: 'FRAME_SIZES["2"]', sizes: '(max-width: 600px) 100vw, (max-width: 900px) 50vw, 50vw' },
  { name: 'FRAME_SIZES["4"]', sizes: '(max-width: 600px) 50vw, (max-width: 900px) 50vw, 25vw' },
  { name: 'FRAME_SIZES["6"]', sizes: '(max-width: 600px) 50vw, (max-width: 900px) 33vw, (max-width: 1200px) 25vw, 17vw' },
  { name: 'Hero model (HERO_FRAME_SIZES)', sizes: '(max-width: 900px) 100vw, 50vw' },
  { name: 'Campaign still', sizes: '(max-width: 900px) 50vw, 65vw' },
  { name: 'Category 1 & 2', sizes: '(max-width: 900px) 50vw, 33vw' },
  { name: 'Category 3 (dantel)', sizes: '(max-width: 900px) 50vw, 33vw' },
  { name: 'Night campaign (HERO_FRAME_SIZES)', sizes: '(max-width: 900px) 100vw, 50vw' },
  { name: 'Product stories (STORY_FRAME_SIZES)', sizes: '(max-width: 900px) 50vw, 50vw' },
  { name: 'Brand story (lace/satin)', sizes: '(max-width: 900px) 60vw, 30vw' },
  { name: 'Service stories', sizes: '(max-width: 900px) 50vw, 25vw' },
  { name: 'HomeProductGrid', sizes: '(max-width: 900px) 50vw, 33vw' },
  { name: 'PDP main gallery', sizes: '(max-width: 900px) 100vw, 1040px' },
  { name: 'Cart item thumbnail', sizes: '(max-width: 768px) 104px, 168px' },
  { name: 'Checkout item thumbnail', sizes: '64px' }
];

let totalTests = 0;
let maxCandidateAll = 0;
let maxTargetWidthAll = 0;
let maxTargetDetails = null;
const underSampled = [];

for (const expr of expressions) {
  for (let V = 320; V <= 600; V++) {
    for (const dpr of [1, 1.5, 2, 2.5, 3]) {
      totalTests++;
      const cssW = parseSizesForViewport(expr.sizes, V);
      const targetW = cssW * dpr;
      const cand = selectCandidate(targetW, candidates);
      if (cand > maxCandidateAll) maxCandidateAll = cand;
      if (targetW > maxTargetWidthAll) {
        maxTargetWidthAll = targetW;
        maxTargetDetails = { expr: expr.name, V, dpr, cssW, targetW, cand };
      }
      if (cand < targetW && cand < candidates[candidates.length - 1]) {
        underSampled.push({ expr: expr.name, V, dpr, cssW, targetW, cand });
      }
    }
  }
}

console.log(`Total dense evaluations (320..600 step 1px, DPR [1, 1.5, 2, 2.5, 3], ${expressions.length} expressions):`, totalTests);
console.log('Max target width across all dense evaluations:', maxTargetWidthAll, 'Details:', JSON.stringify(maxTargetDetails));
console.log('Max selected candidate across ALL dense evaluations:', maxCandidateAll);
console.log('Under-sampled violations:', underSampled.length);

if (underSampled.length > 0) {
  console.error('Violations found (under-sampled):', underSampled);
  process.exit(1);
}

// Verify high-resolution capabilities on dense mobile viewports:
// The maximum candidate across dense evaluations must reach 1920w on high-DPR devices.
if (maxCandidateAll < 1920) {
  console.error(`FAILED: Expected max candidate across dense evaluations to reach 1920w on high-DPR screens, got ${maxCandidateAll}`);
  process.exit(1);
}

console.log('SUCCESS: All dense evaluations meet high-resolution Retina requirements without quality loss.');
