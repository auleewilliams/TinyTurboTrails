import { chromium } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';

// Dedicated 3:1 panoramas pan through a 426 x 240 viewport at native pixel height.
// Keep original generated pixels untouched; ship only the 720 x 240 runtime copy.
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  for (const directory of ['site', 'frost', 'cove']) {
    const source = (await readFile(`assets/source/${directory}/background/panorama.png`)).toString('base64');
    const data = await page.evaluate(async source => {
      const image = new Image(); image.src = `data:image/png;base64,${source}`; await image.decode();
      if (Math.abs(image.naturalWidth / image.naturalHeight - 3) > 0.01) throw new Error('Expected a 3:1 panorama');
      const canvas = document.createElement('canvas'); canvas.width = 720; canvas.height = 240;
      const ctx = canvas.getContext('2d'); ctx.imageSmoothingEnabled = false;
      ctx.drawImage(image, 0, 0, 720, 240);
      return canvas.toDataURL('image/png').split(',')[1];
    }, source);
    await writeFile(`public/assets/${directory}/background.png`, Buffer.from(data, 'base64'));
  }
} finally {
  await browser.close();
}
