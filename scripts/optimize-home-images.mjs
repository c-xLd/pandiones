/**
 * Home page photos as ready-to-serve WebP (public/assets/home/*.webp). The originals are 1.8–2.4 MB PNGs:
 * the image optimizer has to decode one of those for every size it is first asked for, which made the
 * first visit after a deploy slow. Same pixels and width, re-encoded (quality 86), so the optimizer starts
 * from ~10× fewer bytes. Re-run after replacing a source photo:  node scripts/optimize-home-images.mjs
 */
import { mkdirSync, statSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const SOURCES = [
  'beyaz-crop/1.png',
  'beyaz-crop/2.png',
  'beyaz-crop/5.png',
  'beyaz-crop/6.png',
  'beyaz-crop/7.png',
  'beyaz-crop/9.png',
  'pembe-balen/cizgili_balenli_dantelli_pembe(1).png',
  'pembe-balen/cizgili_balenli_dantelli_pembe(2).png',
  'pembe-balen/cizgili_balenli_dantelli_pembe(3).png',
  'siyah-crop/1.png',
  'siyah-crop/2.png',
  'siyah-crop/6.png',
  'siyah-crop/7.png',
  'siyah-crop/9.png',
];

const assets = path.join(process.cwd(), 'public', 'assets');
const out = path.join(assets, 'home');
mkdirSync(out, { recursive: true });

/** beyaz-crop/2.png → beyaz-crop-2.webp; pembe-balen/…pembe(1).png → pembe-balen-1.webp */
export const homeName = (source) => {
  const [folder, file] = source.split('/');
  const index = /\((\d+)\)|^(\d+)/.exec(file);
  return `${folder}-${index?.[1] ?? index?.[2]}.webp`;
};

for (const source of SOURCES) {
  const target = path.join(out, homeName(source));
  const info = await sharp(path.join(assets, source)).webp({ quality: 86, effort: 5 }).toFile(target);
  const before = statSync(path.join(assets, source)).size;
  console.log(`${source} ${Math.round(before / 1024)} KB → ${path.basename(target)} ${Math.round(info.size / 1024)} KB (${info.width}×${info.height})`);
}
