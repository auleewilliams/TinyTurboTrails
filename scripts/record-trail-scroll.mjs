import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
const directory = 'docs/evidence/trail-milestone/scroll';
await mkdir(directory, { recursive: true });
const browser = await chromium.launch();
for (let index = 0; index < 6; index++) {
  const context = await browser.newContext({ viewport: { width: 426, height: 240 },
    recordVideo: { dir: directory, size: { width: 426, height: 240 } } });
  const page = await context.newPage();
  await page.routeWebSocket('**', socket => socket.close());
await page.goto('http://127.0.0.1:4175/?scene=foundation');
  const name = await page.evaluate(async (index) => {
    const { LEVELS } = await import('/src/world/levels.ts');
    const { loadWorldAssets } = await import('/src/world/assets.ts');
    const { drawWorld, drawWorldForeground } = await import('/src/world/renderer.ts');
    const { loadHenry } = await import('/src/art/henry.ts');
    const { surfaceY } = await import('/src/game/movement.ts');
    const level = LEVELS[index], assets = await loadWorldAssets(level.atlas), henry = await loadHenry();
    const canvas = document.createElement('canvas'); canvas.width = 426; canvas.height = 240;
    canvas.style.cssText = 'position:fixed;inset:0;width:426px;height:240px;z-index:10'; document.body.append(canvas);
    const ctx = canvas.getContext('2d'); ctx.imageSmoothingEnabled = false;
    for (let frame = 0; frame < 600; frame++) {
      const x = frame / 599 * (level.width - 426), camera = { position: { x, y: 0 } };
      drawWorld(ctx, assets, level, camera);
      const pose = henry.manifest.frames[henry.manifest.animations.run.frames[Math.floor(frame / 6) % henry.manifest.animations.run.frames.length]];
      const foot = surfaceY(level, x + 90);
      ctx.drawImage(henry.atlas, pose.x, pose.y, pose.width, pose.height, 90 - henry.manifest.anchor.x, foot - henry.manifest.anchor.y, 48, 48);
      drawWorldForeground(ctx, assets, level, camera);
      ctx.fillStyle = '#10252cee'; ctx.fillRect(5, 5, 290, 15);
      ctx.fillStyle = '#fff1c5'; ctx.font = '9px monospace'; ctx.fillText(`${level.name} · camera audit · x=${Math.round(x)}`, 9, 16);
      await new Promise(requestAnimationFrame);
    }
    return level.id;
  }, index);
  await context.close();
  await page.video().saveAs(`${directory}/${name}.webm`);
  await page.video().delete();
}
await browser.close();
