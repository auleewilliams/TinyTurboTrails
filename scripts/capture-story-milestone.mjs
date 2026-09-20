import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

const directory = 'docs/evidence/henry-patchwork-vale';
await mkdir(directory, { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 426, height: 240 },
  recordVideo: { dir: `${directory}/raw-video`, size: { width: 426, height: 240 } } });
const page = await context.newPage();
await page.addInitScript(() => {
  const fill = CanvasRenderingContext2D.prototype.fillText;
  window.hideStoryCaptions = false;
  CanvasRenderingContext2D.prototype.fillText = function(text, ...args) {
    if (window.hideStoryCaptions && ['The Vale Get-Together!', 'The Great Rumble broke the way.', 'Henry Turbo: find our friend!', 'Over the hill. Together again!'].includes(text)) return;
    fill.call(this, text, ...args);
  };
});
await page.goto('http://127.0.0.1:4175/');
await page.getByRole('button', { name: 'Next picture', exact: true }).waitFor();
await page.screenshot({ path: `${directory}/opening-1-native.png` });
await page.evaluate(() => { window.hideStoryCaptions = true; });
await page.waitForTimeout(60);
await page.screenshot({ path: `${directory}/opening-1-no-caption.png` });
await page.evaluate(() => { window.hideStoryCaptions = false; });

await page.getByRole('button', { name: 'Next picture', exact: true }).click();
await page.screenshot({ path: `${directory}/opening-2-native.png` });
await page.evaluate(() => { window.hideStoryCaptions = true; });
await page.waitForTimeout(60);
await page.screenshot({ path: `${directory}/opening-2-no-caption.png` });
await page.evaluate(() => { window.hideStoryCaptions = false; });

await page.getByRole('button', { name: 'Next picture', exact: true }).click();
await page.screenshot({ path: `${directory}/opening-3-native.png` });
await page.evaluate(() => { window.hideStoryCaptions = true; });
await page.waitForTimeout(60);
await page.screenshot({ path: `${directory}/opening-3-no-caption.png` });
await page.evaluate(() => { window.hideStoryCaptions = false; });

await page.setViewportSize({ width: 320, height: 240 });
await page.screenshot({ path: `${directory}/opening-small.png` });
await page.getByRole('button', { name: 'Continue to trails', exact: true }).click();
await page.screenshot({ path: `${directory}/map-small.png` });
await page.setViewportSize({ width: 426, height: 240 });
await page.screenshot({ path: `${directory}/map-native.png` });
await page.getByRole('button', { name: 'Play PLAINS', exact: true }).click();
await page.screenshot({ path: `${directory}/first-goal-native.png` });

// Deterministic visual fixture instantiates the real scene, loads real assets,
// and triggers its actual finish transition. Browser regression tests traverse routes.
await page.goto('http://127.0.0.1:4175/?scene=foundation');
await page.evaluate(async () => {
  const [{ AdventureScene }, { loadHenry, loadImage }, { loadTitleArtwork }, { loadWorldAssetMap }, { LEVELS }] = await Promise.all([
    import('/src/game/adventure-scene.ts'), import('/src/art/henry.ts'), import('/src/art/title.ts'),
    import('/src/world/assets.ts'), import('/src/world/levels.ts'),
  ]);
  const [henry, title, worlds, landmarks, background, story] = await Promise.all([
    loadHenry(), loadTitleArtwork(), loadWorldAssetMap(LEVELS.map(l => l.atlas)),
    loadImage('/assets/overworld/landmarks.png'), loadImage('/assets/overworld/background.png'), loadImage('/assets/story/patchwork-vale.png'),
  ]);
  const audio = { unlock: async () => {}, setMuted() {}, setSuspended() {}, startMusic() {}, play() {}, stop() {}, dispose() {} };
  const scene = new AdventureScene(title, henry, worlds, audio, LEVELS[0], landmarks, background, story);
  scene.menuTargets.find(t => t.label === 'Skip story').action(); scene.startSelected();
  scene.run.collectedGems.add('fixture-gem'); scene.run.collectedSpecials.add('fixture-star');
  scene.player.x = LEVELS[0].finish.x;
  const neutral = { horizontal: 0, jumpHeld: false, jumpPressed: false, pausePressed: false, mutePressed: false };
  scene.update(1 / 60, neutral);
  const canvas = document.createElement('canvas'); canvas.width = 426; canvas.height = 240;
  canvas.id = 'evidence'; canvas.style.cssText = 'position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);height:auto;image-rendering:pixelated;z-index:10';
  const { fitViewport } = await import('/src/core/viewport.ts');
  const resize = () => { canvas.style.width = fitViewport(innerWidth, innerHeight).width + 'px'; };
  resize(); window.addEventListener('resize', resize);
  document.querySelector('#game').style.visibility = 'hidden'; document.querySelector('#status').style.display = 'none';
  document.body.append(canvas); const ctx = canvas.getContext('2d'); ctx.imageSmoothingEnabled = false;
  window.evidence = { scene, ctx, neutral, render: () => scene.render(ctx) };
  scene.render(ctx);
});
for (const [name, time] of [['ready', 0], ['crouch', 0.16], ['takeoff', 0.36], ['cheer', 0.53], ['descend', 0.66], ['land', 0.8], ['rise', 0.95], ['victory', 1.3]]) {
  await page.evaluate(time => { window.evidence.scene.celebration.seconds = time; window.evidence.render(); }, time);
  await page.screenshot({ path: `${directory}/finish-${name}.png` });
}
await page.evaluate(async () => {
  const e = window.evidence; e.scene.celebration.reset();
  let last; const start = performance.now();
  await new Promise(resolve => {
    const tick = now => {
      if (last !== undefined) e.scene.update((now - last) / 1000, e.neutral);
      last = now; e.render();
      if (now - start < 2600) requestAnimationFrame(tick); else resolve();
    }; requestAnimationFrame(tick);
  });
});
await page.emulateMedia({ reducedMotion: 'reduce' });
await page.evaluate(() => { window.evidence.scene.celebration.reset(); window.evidence.render(); });
await page.screenshot({ path: `${directory}/finish-reduced.png` });
await page.setViewportSize({ width: 320, height: 240 });
await page.screenshot({ path: `${directory}/finish-small.png` });
await page.setViewportSize({ width: 426, height: 240 });
await page.evaluate(() => { window.evidence.scene.menuTargets.find(t => t.label === 'View reunion picture').action(); window.evidence.render(); });
await page.screenshot({ path: `${directory}/reunion-native.png` });
// Inspect visual meaning independently of captions/audio.
await page.evaluate(() => {
  const e = window.evidence; const fill = e.ctx.fillText;
  e.ctx.fillText = function(text, ...args) { if (!['Over the hill. Together again!'].includes(text)) fill.call(this, text, ...args); };
  e.render(); e.ctx.fillText = fill;
});
await page.screenshot({ path: `${directory}/reunion-no-caption.png` });
await page.goto('http://127.0.0.1:4175/?scene=art');
await page.waitForFunction(() => document.querySelector('#status').textContent.includes('Art preview'));
await page.screenshot({ path: `${directory}/gameplay-art-reference.png` });
await page.goto('http://127.0.0.1:4175/?scene=art&animation=celebrate');
await page.waitForFunction(() => document.querySelector('#status').textContent.includes('Art preview'));
await page.screenshot({ path: `${directory}/celebration-art.png` });
await context.close();
await page.video().saveAs(`${directory}/integrated-flow.webm`);
await page.video().delete();
await browser.close();
await writeFile(`${directory}/capture-notes.txt`, 'Opening, map and goal: real UI. Finish phases and recording: real AdventureScene/real assets in deterministic fixture; one gem and one star set for layout. No child playtest claimed.\n');
