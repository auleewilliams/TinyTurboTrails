import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

// Run against npm run dev -- --port 4175. Controlled native-size scene views
// capture every spring with the same renderer, assets and feedback as gameplay.
const directory = 'docs/evidence/spring-grounding';
await mkdir(directory, { recursive: true });
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.routeWebSocket('**', socket => socket.close());
  await page.goto('http://127.0.0.1:4175/?scene=foundation');
  const images = await page.evaluate(async () => {
    const { LEVELS } = await import('/src/world/levels.ts');
    const { loadWorldAssetMap } = await import('/src/world/assets.ts');
    const { AdventureScene } = await import('/src/game/adventure-scene.ts');
    const { loadHenry } = await import('/src/art/henry.ts');
    const { createPlayer } = await import('/src/game/movement.ts');
    const [worlds, henry] = await Promise.all([loadWorldAssetMap(LEVELS.map(l => l.atlas)), loadHenry()]);
    const frame = document.createElement('canvas'); frame.width = 426; frame.height = 240;
    const fctx = frame.getContext('2d'); fctx.imageSmoothingEnabled = false;
    const audio = { play() {}, startMusic() {}, stopMusic() {}, stop() {} };
    const images = [];
    const states = document.createElement('canvas'); states.width = 1326; states.height = 44 + LEVELS.length * 270;
    const sctx = states.getContext('2d'); sctx.imageSmoothingEnabled = false;
    sctx.fillStyle = '#15232f'; sctx.fillRect(0, 0, states.width, states.height);
    sctx.fillStyle = '#fff'; sctx.font = 'bold 16px monospace';
    sctx.fillText('Actual gameplay rendering · idle / compressed 0.6 / released 1.25', 12, 26);
    for (const [levelIndex, level] of LEVELS.entries()) {
      const springs = level.entities.filter(e => e.kind === 'spring');
      const board = document.createElement('canvas');
      board.width = 1326; board.height = 44 + Math.ceil(springs.length / 3) * 270;
      const ctx = board.getContext('2d'); ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = '#15232f'; ctx.fillRect(0, 0, board.width, board.height);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 16px monospace';
      ctx.fillText(`${level.name} · all ${springs.length} springs · native 426 × 240 scene views`, 12, 26);
      for (const [index, spring] of springs.entries()) {
        const scene = new AdventureScene(new Image(), henry, worlds, audio, level);
        scene.screens.state = 'playing';
        const x = spring.x - 190;
        scene.camera = { position: { x, y: 0 } };
        scene.player = createPlayer(spring.x - 70, level);
        scene.render(fctx);
        const dx = 12 + index % 3 * 438, dy = 64 + Math.floor(index / 3) * 270;
        ctx.fillStyle = '#fff'; ctx.font = '12px monospace';
        ctx.fillText(`${spring.id} (${spring.x}, ${spring.y})`, dx, dy - 8);
        ctx.drawImage(frame, dx, dy);
        if (index === 0) {
          for (const [stageIndex, stage] of ['idle', 'compressed', 'released'].entries()) {
            scene.feedback.clear();
            if (stage !== 'idle') scene.feedback.add('spring', spring.x, spring.y, spring.id);
            if (stage === 'released') scene.feedback.tick(0.195);
            scene.render(fctx);
            const sx = 12 + stageIndex * 438, sy = 64 + levelIndex * 270;
            sctx.fillStyle = '#fff'; sctx.font = '12px monospace';
            sctx.fillText(`${level.name} · ${stage}`, sx, sy - 8);
            sctx.drawImage(frame, sx, sy);
          }
        }
      }
      images.push({ id: level.id, data: board.toDataURL().split(',')[1] });
    }
    images.push({ id: 'animation-states', data: states.toDataURL().split(',')[1] });
    return images;
  });
  for (const image of images) await writeFile(`${directory}/${image.id}.png`, Buffer.from(image.data, 'base64'));
  console.log(`Captured all springs in ${images.length - 1} levels plus animation states.`);
} finally {
  await browser.close();
}
