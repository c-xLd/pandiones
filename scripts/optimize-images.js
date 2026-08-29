const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');

async function processFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (!['.png', '.jpg', '.jpeg'].includes(ext)) return;
  if (filePath.includes('.webp') || filePath.includes('.avif')) return;

  const baseWithoutExt = filePath.substring(0, filePath.length - ext.length);
  const webpPath = baseWithoutExt + '.webp';

  const originalStats = fs.statSync(filePath);
  const originalSizeKb = Math.round(originalStats.size / 1024);

  // Generate WebP
  await sharp(filePath)
    .webp({ quality: 82, effort: 5 })
    .toFile(webpPath);

  const webpStats = fs.statSync(webpPath);
  const webpSizeKb = Math.round(webpStats.size / 1024);

  console.log(`✓ ${path.relative(PUBLIC_DIR, filePath)}: ${originalSizeKb} KB -> ${webpSizeKb} KB WebP (-${Math.round((1 - webpSizeKb / originalSizeKb) * 100)}%)`);
}

async function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      await walkDir(fullPath);
    } else {
      await processFile(fullPath);
    }
  }
}

async function main() {
  console.log('🚀 Starting image optimization in public/...');
  await walkDir(PUBLIC_DIR);
  console.log('✨ All images optimized successfully!');
}

main().catch(err => {
  console.error('Optimization error:', err);
  process.exit(1);
});
