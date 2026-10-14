import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

async function generateMonogram() {
  const brandDir = path.join(process.cwd(), 'public', 'assets', 'brand');
  if (!fs.existsSync(brandDir)) {
    fs.mkdirSync(brandDir, { recursive: true });
  }

  // Pure SVG editorial serif P monogram vector with 2:3 aspect ratio (600x900)
  // Clean paths for crisp rendering and transparent background
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 900" width="600" height="900">
  <path d="M 230 180 
           L 360 180 
           C 470 180 530 240 530 350 
           C 530 460 460 520 350 520 
           L 270 520 
           L 270 720 
           L 230 720 
           Z 
           M 270 220 
           L 270 480 
           L 350 480 
           C 430 480 480 430 480 350 
           C 480 270 430 220 350 220 
           Z" 
        fill="#000000" />
</svg>`;

  const targetPath = path.join(brandDir, 'pandiones-monogram.png');
  await sharp(Buffer.from(svg.trim()))
    .png()
    .toFile(targetPath);

  console.log(`Monogram created successfully at ${targetPath}`);
}

generateMonogram().catch(console.error);
