import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

// Run against npm run dev -- --port 4175. The board uses real scene rendering
// at controlled positions; the separate play capture uses normal UI and input.
const directory = 'docs/evidence/gem-consistency';
await mkdir(directory, { recursive: true });
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.routeWebSocket('**', socket => socket.close());
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://127.0.0.1:4175/?scene=foundation');
  const data = await page.evaluate(async () => {
    const { LEVELS } = await import('/src/world/levels.ts');
    const { loadWorldAssetMap } = await import('/src/world/assets.ts');
    const { AdventureScene } = await import('/src/game/adventure-scene.ts');
    const { loadHenry } = await import('/src/art/henry.ts');
    const { createPlayer } = await import('/src/game/movement.ts');
    const [worlds, henry] = await Promise.all([loadWorldAssetMap(LEVELS.map(l => l.atlas)), loadHenry()]);
    const board = document.createElement('canvas'); board.width = 1326; board.height = 798;
    const ctx = board.getContext('2d'); ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#15232f'; ctx.fillRect(0, 0, board.width, board.height);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 20px monospace';
    ctx.fillText('Selected cut-diamond artwork in game · transparent sprites, bright edges', 12, 30);
    const frame = document.createElement('canvas'); frame.width = 426; frame.height = 240;
    const fctx = frame.getContext('2d'); fctx.imageSmoothingEnabled = false;
    const audio = { play() {}, startMusic() {}, stopMusic() {}, stop() {} };
    for (const [index, level] of LEVELS.entries()) {
      const scene = new AdventureScene(new Image(), henry, worlds, audio, level);
      scene.screens.state = 'playing';
      const gem = level.entities.find(e => e.kind === 'gem');
      const x = Math.max(0, gem.x - 170);
      scene.camera = { position: { x, y: 0 } };
      scene.player = createPlayer(x + 72, level);
      scene.render(fctx);
      const dx = 12 + index % 3 * 438, dy = 72 + Math.floor(index / 3) * 282;
      ctx.font = 'bold 14px monospace'; ctx.fillStyle = '#fff'; ctx.fillText(level.name.toUpperCase(), dx, dy - 10);
      ctx.drawImage(frame, dx, dy);
    }
    ctx.font = '14px monospace'; ctx.fillText('Sprite detail at 4× (same bitmap as gameplay above)', 12, 653);
    for (let i = 0; i < 3; i++) {
      ctx.drawImage(worlds.plains.gems, i * 32, 0, 32, 24, 12 + i * 165, 672, 128, 96);
    }
    ctx.fillStyle = '#afbfca'; ctx.font = '13px monospace';
    ctx.fillText('Controlled scene views at native 426 × 240 resolution.', 545, 707);
    ctx.fillText('One source sprite; amber / gold / cyan palettes; shared bottom anchor.', 545, 730);
    ctx.fillText('Source is cropped and resized artwork, with no added outline.', 545, 753);
    return board.toDataURL().split(',')[1];
  });
  await writeFile(`${directory}/after-sprites.png`, Buffer.from(data, 'base64'));
  await page.addInitScript(() => {
    const fillText = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (text, ...args) {
      if (/^GEMS \d+$/.test(text)) document.documentElement.dataset.gems = text;
      return fillText.call(this, text, ...args);
    };
  });
  await page.goto('http://127.0.0.1:4175/?debug=1');
  await page.getByRole('button', { name: 'Skip story', exact: true }).click();
  await page.getByRole('button', { name: 'Play PLAINS', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('#status').textContent.includes('Playing'));
  await page.screenshot({ path: `${directory}/sprite-play.png` });
  await page.keyboard.down('ArrowRight');
  await page.waitForFunction(() => /^GEMS [1-9]/.test(document.documentElement.dataset.gems ?? ''));
  await page.keyboard.up('ArrowRight');
  await page.keyboard.press('Escape');
  await page.screenshot({ path: `${directory}/sprite-collected.png` });
  console.log(JSON.stringify({ errors, gems: await page.locator('html').getAttribute('data-gems'), status: await page.locator('#status').innerText() }));
  if (errors.length) throw new Error(errors.join('\n'));
} finally {
  await browser.close();
}
