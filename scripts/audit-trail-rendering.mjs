import { chromium } from '@playwright/test';
import { mkdir, writeFile, unlink } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { dirname } from 'node:path';
const outputPath = process.argv[2] ?? 'docs/evidence/trail-milestone/render-performance.json';
const directory = dirname(outputPath);
await mkdir(directory, { recursive: true });
const baselinePath = 'src/world/baseline-renderer.ts';
await writeFile(baselinePath, execFileSync('git', ['show', 'e04b5e2:src/world/renderer.ts']));
const browser = await chromium.launch();
const page = await browser.newPage();
await page.routeWebSocket('**', socket => socket.close());
await page.goto('http://127.0.0.1:4175/?scene=foundation');
const results = await page.evaluate(async () => {
  const { LEVELS } = await import('/src/world/levels.ts');
  const { loadWorldAssetMap } = await import('/src/world/assets.ts');
  const current = await import('/src/world/renderer.ts');
  const baseline = await import('/src/world/baseline-renderer.ts');
  const worlds = await loadWorldAssetMap(LEVELS.map(l => l.atlas));
  const canvas = document.createElement('canvas'); canvas.width = 426; canvas.height = 240;
  const ctx = canvas.getContext('2d', { willReadFrequently: true }); ctx.imageSmoothingEnabled = false;
  const results = [];
  for (const level of LEVELS) {
    const result = { level: level.id };
    for (const [name, renderer] of [['baseline', baseline], ['milestone', current]]) {
      const times = [];
      for (let frame = -30; frame < 600; frame++) {
        const x = Math.max(0, frame) / 600 * (level.width - 426);
        const camera = { position: { x, y: 0 } };
        const before = performance.now();
        renderer.drawWorld(ctx, worlds[level.atlas], level, camera);
        renderer.drawWorldForeground(ctx, worlds[level.atlas], level, camera);
        ctx.getImageData(0, 0, 426, 240); // Include rasterization, not just queued draw calls.
        if (frame >= 0) times.push(performance.now() - before);
      }
      times.sort((a, b) => a - b);
      result[name] = { medianMs: times[300], p95Ms: times[570], meanMs: times.reduce((a, b) => a + b) / times.length };
    }
    results.push(result);
  }
  return { method: '600 full-route camera samples per trail, 30 warmups; 426x240 software Canvas with full readback; headless Chromium; baseline renderer from e04b5e2; same host/assets', results };
});
await writeFile(outputPath, JSON.stringify(results, null, 2));
console.log(JSON.stringify(results));
await browser.close();
await unlink(baselinePath);
