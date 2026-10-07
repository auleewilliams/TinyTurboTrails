import { chromium } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

// Package the generated cutout at native gameplay resolution. One source and
// one alpha mask keep every biome's size, facets and bottom anchor identical.
const source = (await readFile('assets/source/gems/cut-diamond-source.png')).toString('base64');
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  const result = await page.evaluate(async source => {
    const image = new Image(); image.src = `data:image/png;base64,${source}`; await image.decode();
    const original = document.createElement('canvas');
    original.width = image.width; original.height = image.height;
    const originalCtx = original.getContext('2d'); originalCtx.drawImage(image, 0, 0);
    const pixels = originalCtx.getImageData(0, 0, image.width, image.height).data;
    let left = image.width, top = image.height, right = -1, bottom = -1;
    let transparent = 0;
    for (let y = 0; y < image.height; y++) for (let x = 0; x < image.width; x++) {
      const alpha = pixels[(y * image.width + x) * 4 + 3];
      if (!alpha) transparent++;
      // Ignore isolated near-transparent extraction residue when trimming.
      if (alpha >= 128) {
        left = Math.min(left, x); right = Math.max(right, x);
        top = Math.min(top, y); bottom = Math.max(bottom, y);
      }
    }
    if (!transparent || right < left) throw new Error('Expected a visible gem on actual transparency');
    const sprite = document.createElement('canvas'); sprite.width = 32; sprite.height = 24;
    const ctx = sprite.getContext('2d'); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(image, left, top, right - left + 1, bottom - top + 1, 0, 0, 32, 24);
    const gold = ctx.getImageData(0, 0, 32, 24);
    const atlas = document.createElement('canvas'); atlas.width = 96; atlas.height = 24;
    const atlasCtx = atlas.getContext('2d');
    for (let variant = 0; variant < 3; variant++) {
      const cell = new ImageData(new Uint8ClampedArray(gold.data), 32, 24);
      for (let i = 0; i < cell.data.length; i += 4) {
        // RGB palette remapping preserves the source alpha, value and facets.
        // Cell order is amber, original gold, cyan. Neutral glints stay pale.
        if (variant === 1 || !cell.data[i + 3]) continue;
        const [r, g, b] = Array.from(cell.data.slice(i, i + 3), v => v / 255);
        const max = Math.max(r, g, b), min = Math.min(r, g, b), delta = max - min;
        if (delta < 0.02) continue;
        let hue = max === r ? ((g - b) / delta + 6) % 6 : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4;
        hue *= 60;
        const mapped = variant === 0 ? Math.max(12, hue * 0.85 - 10) : 215 - Math.min(65, hue) * 0.5;
        const h = mapped / 60, c = delta, x = c * (1 - Math.abs(h % 2 - 1));
        const rgb = h < 1 ? [c, x, 0] : h < 2 ? [x, c, 0] : h < 3 ? [0, c, x]
          : h < 4 ? [0, x, c] : h < 5 ? [x, 0, c] : [c, 0, x];
        for (let channel = 0; channel < 3; channel++) cell.data[i + channel] = Math.round((rgb[channel] + min) * 255);
      }
      atlasCtx.putImageData(cell, variant * 32, 0);
    }
    return { data: atlas.toDataURL().split(',')[1], sourceBounds: [left, top, right, bottom] };
  }, source);
  await mkdir('public/assets/gems', { recursive: true });
  await writeFile('public/assets/gems/gems.png', Buffer.from(result.data, 'base64'));
  console.log(`Prepared 96 x 24 gem atlas; source bounds ${result.sourceBounds.join(', ')}`);
} finally {
  await browser.close();
}
