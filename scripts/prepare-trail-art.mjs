import { chromium } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
// Run against npm run dev -- --port 4175. Originals are never modified.
const browser = await chromium.launch();
const page = await browser.newPage();
for (const [folder, name, width, height] of [
  ['overworld', 'landmarks', 384, 256],
  ['overworld', 'background', 426, 240],
  ['trails', 'materials', 576, 384],
  ['trails', 'backdrops', 1152, 768],
]) {
  const source = (await readFile(`assets/source/${folder}/${name}.png`)).toString('base64');
  const data = await page.evaluate(async ({ source, width, height }) => {
    const image = new Image(); image.src = `data:image/png;base64,${source}`; await image.decode();
    const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext('2d'); ctx.imageSmoothingEnabled = false;
    ctx.drawImage(image, 0, 0, width, height);
    return canvas.toDataURL('image/png').split(',')[1];
  }, { source, width, height });
  await writeFile(`public/assets/${folder}/${name}.png`, Buffer.from(data, 'base64'));
}
await browser.close();
