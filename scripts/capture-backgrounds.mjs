import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

// Run against npm run dev -- --port 4175. The sweep audits rendering, not traversal.
const stage = process.argv[2] ?? 'after';
if (!['before', 'after'].includes(stage)) throw new Error('Use before or after');
const directory = `docs/evidence/issue-139/${stage}`;
await mkdir(directory, { recursive: true });
const browser = await chromium.launch();
try {
  for (const id of process.argv.includes('--layouts-only') ? [] : ['sunset', 'frost', 'cove']) {
    const context = await browser.newContext({ viewport: { width: 426, height: 240 },
      ...(stage === 'after' ? { recordVideo: { dir: directory, size: { width: 426, height: 240 } } } : {}) });
    const page = await context.newPage();
    await page.routeWebSocket('**', socket => socket.close());
    await page.goto('http://127.0.0.1:4175/?scene=foundation');
    const captures = await page.evaluate(async ({ id, stage }) => {
      const { LEVELS } = await import('/src/world/levels.ts');
      const { loadWorldAssetMap } = await import('/src/world/assets.ts');
      const { loadHenry } = await import('/src/art/henry.ts');
      const { createPlayer } = await import('/src/game/movement.ts');
      const { AdventureScene } = await import('/src/game/adventure-scene.ts');
      const [worlds, henry] = await Promise.all([loadWorldAssetMap(LEVELS.map(l => l.atlas)), loadHenry()]);
      const level = LEVELS.find(l => l.id === id);
      const audio = { play() {}, startMusic() {}, stopMusic() {}, stop() {} };
      const scene = new AdventureScene(new Image(), henry, worlds, audio, level);
      scene.screens.state = 'playing';
      const canvas = document.createElement('canvas'); canvas.width = 426; canvas.height = 240;
      canvas.style.cssText = 'position:fixed;inset:0;width:426px;height:240px;z-index:10';
      document.body.append(canvas);
      const ctx = canvas.getContext('2d'); ctx.imageSmoothingEnabled = false;
      const render = progress => {
        const x = progress * (level.width - 426);
        scene.camera = { position: { x, y: 0 } };
        scene.player = createPlayer(x + 140, level);
        scene.render(ctx);
      };
      const captures = [];
      for (const [name, progress] of [['start', 0], ['middle', 0.5], ['end', 1]]) {
        render(progress);
        captures.push({ name, data: canvas.toDataURL().split(',')[1] });
      }
      if (stage === 'after') {
        for (let frame = 0; frame < 480; frame++) {
          render(frame / 479);
          ctx.fillStyle = '#10252cee'; ctx.fillRect(5, 220, 295, 15);
          ctx.fillStyle = '#fff1c5'; ctx.font = '9px monospace'; ctx.textAlign = 'left';
          ctx.fillText(`${level.name} - background camera sweep`, 9, 231);
          await new Promise(requestAnimationFrame);
        }
      }
      return captures;
    }, { id, stage });
    for (const capture of captures) await writeFile(`${directory}/${id}-${capture.name}.png`, Buffer.from(capture.data, 'base64'));
    await context.close();
    if (stage === 'after') {
      await page.video().saveAs(`${directory}/${id}-scroll.webm`);
      await page.video().delete();
    }
  }
  if (stage === 'after') {
    const page = await browser.newPage();
    await page.routeWebSocket('**', socket => socket.close());
    await page.emulateMedia({ reducedMotion: 'reduce' });
    for (const [label, width, height] of [['native', 426, 240], ['2x', 852, 480], ['small', 320, 240]]) {
      await page.setViewportSize({ width, height });
      for (const [id, name] of [['sunset', 'SUNSET SITE'], ['frost', 'FROST RIDGE'], ['cove', 'SANDY COVE']]) {
        await page.goto('http://127.0.0.1:4175/');
        await page.getByRole('button', { name: 'Skip story', exact: true }).click();
        await page.getByRole('button', { name, exact: true }).click();
        await page.getByRole('button', { name: `Play ${name}`, exact: true }).waitFor();
        await page.screenshot({ path: `${directory}/${id}-map-${label}.png` });
        await page.getByRole('button', { name: `Play ${name}`, exact: true }).click();
        await page.waitForFunction(() => document.querySelector('#status').textContent.includes('Playing'));
        await page.screenshot({ path: `${directory}/${id}-play-${label}.png` });
      }
    }
    await page.close();
  }
} finally {
  await browser.close();
}
