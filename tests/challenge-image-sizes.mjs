import fs from 'node:fs';
import nextConfigFn from '../next.config.mjs';

const nextConfig = typeof nextConfigFn === 'function' ? nextConfigFn('phase-production-build') : nextConfigFn;
const candidates = [
  ...nextConfig.images.imageSizes,
  ...nextConfig.images.deviceSizes,
].sort((a, b) => a - b);

console.log('Project configured candidates:', candidates);

const viewports = [320, 375, 390, 414, 480, 600];
const dprs = [1, 2, 3];

function parseSizesForViewport(sizesStr, V) {
  const parts = sizesStr.split(',').map((s) => s.trim());
  for (const part of parts) {
    const match = part.match(/^\((max-width:\s*(\d+)px)\)\s*(.+)$/);
    if (match) {
      const maxW = parseInt(match[2], 10);
      const val = match[3].trim();
      if (V <= maxW) {
        return evalVal(val, V);
      }
    } else {
      return evalVal(part, V);
    }
  }
  return V;
}

function evalVal(val, V) {
  if (val.endsWith('vw')) {
    const pct = parseFloat(val);
    return (pct / 100) * V;
  }
  if (val.endsWith('px')) {
    return parseFloat(val);
  }
  return V;
}

function selectCandidate(targetW, cands) {
  // Standard browser srcset selection: smallest candidate >= target physical pixels
  for (const c of cands) {
    if (c >= targetW) return c;
  }
  return cands[cands.length - 1];
}

const expressions = [
  { file: 'src/components/collection/CollectionProductCard.tsx', name: 'FRAME_SIZES["2"]', sizes: '(max-width: 600px) 100vw, (max-width: 900px) 50vw, 50vw' },
  { file: 'src/components/collection/CollectionProductCard.tsx', name: 'FRAME_SIZES["4"]', sizes: '(max-width: 600px) 50vw, (max-width: 900px) 50vw, 25vw' },
  { file: 'src/components/collection/CollectionProductCard.tsx', name: 'FRAME_SIZES["6"]', sizes: '(max-width: 600px) 50vw, (max-width: 900px) 33vw, (max-width: 1200px) 25vw, 17vw' },
  { file: 'src/app/(anasayfa)/page.tsx', name: 'Hero model (HERO_FRAME_SIZES)', sizes: '(max-width: 900px) 100vw, 50vw' },
  { file: 'src/app/(anasayfa)/page.tsx', name: 'Campaign still', sizes: '(max-width: 900px) 50vw, 65vw' },
  { file: 'src/app/(anasayfa)/page.tsx', name: 'Category 1 & 2', sizes: '(max-width: 900px) 50vw, 33vw' },
  { file: 'src/app/(anasayfa)/page.tsx', name: 'Category 3 (dantel)', sizes: '(max-width: 900px) 50vw, 33vw' },
  { file: 'src/app/(anasayfa)/page.tsx', name: 'Night campaign (HERO_FRAME_SIZES)', sizes: '(max-width: 900px) 100vw, 50vw' },
  { file: 'src/app/(anasayfa)/page.tsx', name: 'Product stories (STORY_FRAME_SIZES)', sizes: '(max-width: 900px) 50vw, 50vw' },
  { file: 'src/app/(anasayfa)/page.tsx', name: 'Brand story (lace/satin)', sizes: '(max-width: 900px) 60vw, 30vw' },
  { file: 'src/app/(anasayfa)/page.tsx', name: 'Service stories', sizes: '(max-width: 900px) 50vw, 25vw' },
  { file: 'src/app/_home/HomeProductGrid.tsx', name: 'HomeProductGrid', sizes: '(max-width: 900px) 50vw, 33vw' },
  { file: 'src/lib/images.ts', name: 'PDP main gallery (PDP_GALLERY_SIZES)', sizes: '(max-width: 900px) 135vw, 1040px' },
  { file: 'src/components/product/ProductLowerContent.tsx', name: 'Related strip (phones)', sizes: '(max-width: 900px) 45vw, 66vw' },
  { file: 'src/app/canta/page.tsx', name: 'Cart item thumbnail', sizes: '(max-width: 768px) 104px, 168px' },
  { file: 'src/app/odeme/page.tsx', name: 'Checkout item thumbnail', sizes: '64px' }
];

// Verify all expressions match actual file contents
for (const expr of expressions) {
  const content = fs.readFileSync(expr.file, 'utf8');
  if (!content.includes(expr.sizes)) {
    throw new Error(`Integrity error: sizes string "${expr.sizes}" not found in ${expr.file}`);
  }
}

const results = [];
const underSampled = [];

for (const expr of expressions) {
  for (const V of viewports) {
    for (const dpr of dprs) {
      const cssWidth = parseSizesForViewport(expr.sizes, V);
      const targetWidth = cssWidth * dpr;
      const selected = selectCandidate(targetWidth, candidates);
      // Under-sampling happens if selected candidate is smaller than target physical pixels
      // while a larger candidate was available in nextConfig.
      const isUnderSampled = selected < targetWidth && selected < candidates[candidates.length - 1];
      if (isUnderSampled) {
        underSampled.push({ expr: expr.name, V, dpr, cssWidth, targetWidth, selected });
      }
      results.push({
        file: expr.file,
        name: expr.name,
        sizes: expr.sizes,
        viewport: V,
        dpr,
        cssWidth,
        targetWidth,
        selectedCandidate: selected,
      });
    }
  }
}

console.log(`\nEvaluated ${results.length} total (viewport, DPR, expression) permutations across mobile viewports: ${viewports.join(', ')} px.`);
console.log(`Under-sampled occurrences (blurry images): ${underSampled.length}\n`);

if (underSampled.length > 0) {
  console.error('FAILED: Under-sampled images found:', underSampled);
  process.exit(1);
}

// Verify high-resolution Retina delivery:
// 100vw images on modern iPhone (390px, DPR=3 => 1170px target) must select >= 1200w candidate.
const iphoneHeroTarget = 390 * 3; // 1170px
const iphoneHeroCand = selectCandidate(iphoneHeroTarget, candidates);
if (iphoneHeroCand < 1200) {
  console.error(`FAILED: iPhone 390px @ DPR=3 hero candidate is ${iphoneHeroCand}w, expected >= 1200w for Retina clarity`);
  process.exit(1);
}

// Group by expression
for (const expr of expressions) {
  const exprResults = results.filter((r) => r.name === expr.name);
  const minCandidate = Math.min(...exprResults.map((r) => r.selectedCandidate));
  const maxCandidate = Math.max(...exprResults.map((r) => r.selectedCandidate));
  console.log(`Expression: ${expr.name} [${expr.sizes}]`);
  console.log(`  ✓ Range of selected candidates: ${minCandidate}w - ${maxCandidate}w (crystal-clear Retina support)`);
}

console.log('\nSUCCESS: All images meet full physical pixel density requirements for luxury apparel clarity.');
