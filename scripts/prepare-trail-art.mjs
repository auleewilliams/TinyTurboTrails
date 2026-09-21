import { chromium } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
// Originals are never modified. Browser high-quality resampling keeps the
// reproducible pipeline dependency-local and matches the runtime color path.
const browser = await chromium.launch();
const page = await browser.newPage();
for (const [sourcePath, outputPath, width, height, smooth] of [
  ['assets/source/overworld/landmarks.png', 'public/assets/overworld/landmarks.png', 288, 192, true],
  ['assets/source/overworld/background.png', 'public/assets/overworld/background.png', 426, 240, true],
  ['assets/source/trails/materials.png', 'public/assets/trails/materials.png', 576, 384, false],
  ['assets/source/trails/backdrops.png', 'public/assets/trails/backdrops.webp', 720, 480, true],
  ['assets/source/title/tiny-turbo-trails-v2.png', 'public/assets/title/tiny-turbo-trails-v2.png', 282, 154, true],
  ['assets/source/plains/scenery/background.png', 'public/assets/plains/scenery/background.webp', 768, 512, true],
  ['assets/source/plains/scenery/foreground.png', 'public/assets/plains/scenery/foreground.png', 384, 256, true],
]) {
  const source = (await readFile(sourcePath)).toString('base64');
  const data = await page.evaluate(async ({ source, outputPath, width, height, smooth }) => {
    const image = new Image(); image.src = `data:image/png;base64,${source}`; await image.decode();
    const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext('2d'); ctx.imageSmoothingEnabled = smooth;
    if (smooth) ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(image, 0, 0, width, height);
    const format = outputPath.endsWith('.webp') ? 'image/webp' : 'image/png';
    return canvas.toDataURL(format, 0.86).split(',')[1];
  }, { source, outputPath, width, height, smooth });
  await writeFile(outputPath, Buffer.from(data, 'base64'));
}
await browser.close();
