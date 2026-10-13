import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

const directory = 'docs/evidence/issue-135';
await mkdir(directory, { recursive: true });
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.routeWebSocket('**', socket => socket.close());
  await page.goto('http://127.0.0.1:4175/?scene=foundation');
  for (const reduced of [false, true]) {
    await page.emulateMedia({ reducedMotion: reduced ? 'reduce' : 'no-preference' });
    const captures = await page.evaluate(async () => {
      const { LEVELS } = await import('/src/world/levels.ts');
      const { loadWorldAssetMap } = await import('/src/world/assets.ts');
      const { loadHenry } = await import('/src/art/henry.ts');
      const { AdventureScene } = await import('/src/game/adventure-scene.ts');
      const { SilentAudio } = await import('/src/core/audio.ts');
      const { createPlayer } = await import('/src/game/movement.ts');
      const { platformBodiesAt } = await import('/src/game/platforms.ts');
      const worlds = await loadWorldAssetMap(LEVELS.map(level => level.atlas));
      const henry = await loadHenry();
      const canvas = document.createElement('canvas'); canvas.width = 426; canvas.height = 240;
      const ctx = canvas.getContext('2d'); ctx.imageSmoothingEnabled = false;
      const captures = [];
      for (const level of LEVELS.filter(level => level.theme.weather)) {
        const scene = new AdventureScene(new Image(), henry, worlds, new SilentAudio(), level);
        scene.screens.start(); scene.screens.loaded();
        // Diagnostic sampling only: hold the production scene at authored
        // gameplay locations without changing the simulation to reach them.
        scene.run.seconds = 12.5;
        scene.platforms = platformBodiesAt(level.platforms, scene.run.seconds);
        const star = level.entities.find(entity => entity.kind === 'special')
          ?? level.entities.find(entity => entity.kind === 'gem');
        const hazard = level.entities.find(entity => entity.kind === 'hazard')
          ?? level.entities.find(entity => entity.kind === 'slime');
        for (const [name, target] of [['start', level.start.x], ['collectible', star.x], ['hazard', hazard.x]]) {
          const x = Math.max(0, Math.min(level.width - 426, target - 210));
          scene.player = createPlayer(x + 110, level);
          scene.camera = { position: { x, y: 0 } };
          scene.render(ctx);
          captures.push({ name: `${level.id}-${name}`, data: canvas.toDataURL().split(',')[1] });
        }
      }
      return captures;
    });
    for (const capture of captures) {
      await writeFile(`${directory}/${capture.name}${reduced ? '-reduced' : ''}.png`, Buffer.from(capture.data, 'base64'));
    }
  }
} finally { await browser.close(); }
