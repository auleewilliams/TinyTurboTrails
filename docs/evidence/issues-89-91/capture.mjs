// Run with Vite on 127.0.0.1:4174. Uses actual scene/assets; no production debug hooks.
import { chromium, firefox, webkit } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
const directory = new URL('.', import.meta.url).pathname;
const results = [];
for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
  const browser = await engine.launch();
  const page = await browser.newPage({ viewport: { width: 426, height: 240 } });
  await page.goto('http://127.0.0.1:4174/?scene=foundation');
  await page.evaluate(async () => {
    const [{ AdventureScene }, { loadHenry }, { loadWorldAssetMap }, { LEVELS }, interactions, movement] = await Promise.all([
      import('/src/game/adventure-scene.ts'), import('/src/art/henry.ts'), import('/src/world/assets.ts'),
      import('/src/world/levels.ts'), import('/src/game/interactions.ts'), import('/src/game/movement.ts'),
    ]);
    // Isolated canvas excludes the running app's animation loop while retaining its renderer.
    const canvas = document.createElement('canvas'); canvas.width = 426; canvas.height = 240;
    canvas.id = 'evidence'; canvas.style = 'position:fixed;inset:0;width:100%;height:100%;object-fit:contain;image-rendering:pixelated;background:#10252c;z-index:10';
    document.body.append(canvas);
    const ctx = canvas.getContext('2d'); ctx.imageSmoothingEnabled = false;
    const [henry, worlds] = await Promise.all([loadHenry(), loadWorldAssetMap(LEVELS.map(level => level.atlas))]);
    const audio = { play() {}, stop() {}, startMusic() {}, unlock() {}, setMuted() {}, setSuspended() {}, dispose() {} };
    const neutral = { horizontal: 0, jumpPressed: false, jumpHeld: false, pausePressed: false, mutePressed: false };
    window.evidence = { AdventureScene, henry, worlds, LEVELS, interactions, movement, audio, neutral, ctx, canvas };
  });
  for (let index = 0; index < 6; index++) {
    await page.evaluate(index => {
      const e = window.evidence;
      const level = e.LEVELS[index];
      const scene = new e.AdventureScene(e.henry, e.worlds, e.audio, level);
      scene.update(1 / 60, { ...e.neutral, jumpPressed: true });
      scene.update(1 / 60, e.neutral);
      const checkpoint = level.checkpoints[0];
      scene.player.x = checkpoint.x; scene.player.y = checkpoint.y - 34 - 100;
      scene.player.onGround = false;
      scene.update(1 / 60, { ...e.neutral, jumpHeld: true });
      for (let n = 0; n < 12; n++) scene.run.collectedGems.add(`evidence-${n}`);
      scene.run.health = 2;
      scene.run.healthFlashPip = 2; scene.run.healthFlashSeconds = 0.25;
      scene.camera.update(scene.player.x, scene.player.y);
      scene.render(e.ctx); e.scene = scene;
      if (scene.run.checkpointId !== checkpoint.id) throw Error('Airborne checkpoint failed');
    }, index);
    await page.locator('#evidence').screenshot({ path: `${directory}${name}-level-${index}-checkpoint.png` });
  }
  const checks = await page.evaluate(() => {
    const e = window.evidence, scene = e.scene, level = e.LEVELS[5];
    const events = [];
    scene.run.health = 1;
    e.interactions.damagePlayer(scene.run, scene.player, 1, events, level);
    if (scene.run.health !== 3 || scene.player.x !== level.checkpoints[0].x || scene.run.collectedGems.size < 12) throw Error('Recovery failed');
    scene.feedback.consume(events, level);
    scene.render(e.ctx);
    const frozen = e.canvas.toDataURL();
    scene.render(e.ctx);
    if (frozen !== e.canvas.toDataURL()) throw Error('Render mutated effects');
    scene.player.x = level.finish.x;
    scene.update(1 / 60, e.neutral);
    scene.update(1 / 60, { ...e.neutral, jumpPressed: true });
    if (scene.feedback.effects.length || scene.run.checkpointId || scene.run.collectedGems.size) throw Error('Replay retained state');
    return { recovery: true, renderOnlyFreeze: true, replay: true };
  });
  for (const levelIndex of name === 'chromium' ? [0, 1, 2, 3, 4, 5] : [0]) {
    for (const kind of ['gem', 'landing', 'spring', 'damage']) {
      await page.evaluate(({ kind, levelIndex }) => {
        const e = window.evidence, scene = e.scene, level = e.LEVELS[levelIndex];
        scene.loadLevel(level); scene.screens.state = 'playing';
        if (kind === 'landing') {
          scene.player.x = level.start.x + 5;
          scene.player.y = e.movement.surfaceY(level, scene.player.x) - 34 - 2;
          scene.player.onGround = false; scene.player.vy = 300;
        } else {
          const entity = level.entities.find(entity => kind === 'damage' ? ['slime', 'hazard'].includes(entity.kind) : entity.kind === kind);
          scene.player.x = entity.x; scene.player.y = entity.y - 34;
          scene.player.onGround = false;
        }
        scene.update(1 / 60, e.neutral);
        if (kind !== 'damage' && !scene.feedback.effects.some(effect => effect.kind === kind)) throw Error('Missing actual ' + kind);
        if (kind === 'damage' && !scene.run.healthFlashSeconds) throw Error('Missing actual damage');
        // Let launched Henry clear the spring; retain an early release pose.
        if (kind === 'spring') for (let n = 0; n < 6; n++) scene.update(1 / 60, { ...e.neutral, jumpHeld: true });
        scene.render(e.ctx);
      }, { kind, levelIndex });
      await page.locator('#evidence').screenshot({ path: `${directory}${name}-level-${levelIndex}-${kind}.png` });
    }
  }
  const performance = await page.evaluate(() => {
    const e = window.evidence, scene = e.scene;
    const measure = () => { const start = window.performance.now(); for (let n = 0; n < 300; n++) scene.render(e.ctx); return (window.performance.now() - start) / 300; };
    scene.feedback.clear(); measure(); const baseline = measure();
    for (let n = 0; n < 24; n++) scene.feedback.add('gem', scene.player.x + n, scene.player.y + 34);
    const loaded = measure();
    return { baselineMs: baseline, maxEffectsMs: loaded, addedMs: loaded - baseline };
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.evaluate(() => {
    const e = window.evidence, scene = e.scene;
    scene.feedback.clear(); scene.feedback.add('spring', scene.player.x, scene.player.y, 'test');
    if (!scene.reducedMotion || scene.feedback.springScale('test', scene.reducedMotion) !== 1) throw Error('Reduced motion not respected');
    scene.render(e.ctx);
  });
  await page.locator('#evidence').screenshot({ path: `${directory}${name}-reduced-motion.png` });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.addInitScript(() => {
    const buttons = Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 }));
    window.capturePad = { connected: true, mapping: 'standard', axes: [0, 0], buttons };
    Object.defineProperty(navigator, 'getGamepads', { value: () => [window.capturePad] });
  });
  await page.goto('http://127.0.0.1:4174/?scene=adventure');
  await page.waitForFunction(() => document.querySelector('#status').textContent.includes('Title'));
  await page.keyboard.press('Space');
  await page.waitForFunction(() => document.querySelector('#status').textContent.includes('Playing'));
  await page.screenshot({ path: `${directory}${name}-native-hud.png` });
  await page.evaluate(() => { window.capturePad.buttons[9].pressed = true; });
  await page.waitForFunction(() => document.querySelector('#status').textContent.includes('Start to resume'));
  await page.screenshot({ path: `${directory}${name}-native-controller-pause.png` });
  await page.evaluate(() => { window.capturePad.buttons[9].pressed = false; });
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => document.querySelector('#status').textContent.includes('Playing'));
  await page.setViewportSize({ width: 852, height: 480 });
  await page.screenshot({ path: `${directory}${name}-integer-hud.png` });
  await page.setViewportSize({ width: 360, height: 240 });
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => document.querySelector('#status').textContent.includes('Escape to resume'));
  await page.screenshot({ path: `${directory}${name}-small-keyboard-pause.png` });
  results.push({ browser: name, ...checks, performance });
  await browser.close();
}
await writeFile(`${directory}results.json`, JSON.stringify(results, null, 2) + '\n');
