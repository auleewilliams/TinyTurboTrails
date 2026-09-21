import { drawTerrainMaterial, drawTerrainEdge, drawTrailBackdrop } from '../src/world/trail-presentation';
import { expect, test, type Page } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { PLAINS_LEVEL } from '../src/world/level';
import { LEVELS, QUARRY_RUN } from '../src/world/levels';
import { DEFAULT_MOVEMENT, surfaceY } from '../src/game/movement';
import { platformBodyAt } from '../src/game/platforms';
import { drawSurfaceMaterials } from '../src/world/surface-materials';
import { drawSpecial, drawChallengeCues, drawAsset, drawSurfaceGrip, drawCrumblingLedge, drawPlatformPath, drawPlatforms, drawWorld } from '../src/world/renderer';

/** The renderer is injected as plain functions, so every helper it calls has to travel with it. */
const RENDERER_SOURCE = [drawSpecial, drawChallengeCues, drawTerrainMaterial, drawTerrainEdge, drawTrailBackdrop, drawAsset, drawSurfaceGrip, drawCrumblingLedge, drawPlatformPath, drawPlatforms, drawSurfaceMaterials].map((helper) => helper.toString()).join('\n');

const dangerXs = (level: typeof PLAINS_LEVEL): number[] => level.entities
  .filter((entity) => entity.kind === 'slime' || entity.kind === 'hazard')
  // Traversal consumes this list from left to right. Entity order groups slimes
  // before hazards, which otherwise hides earlier stones until after the route.
  .map(({ x }) => x)
  .sort((left, right) => left - right);

/** Observe the real title drawing without adding a production-only test API. */
async function observeTitleSelection(page: Page): Promise<void> {
  await page.addInitScript(() => {
    setInterval(() => {
      const selected = document.querySelector('.trail-menu button[aria-pressed="true"]');
      const canvas = document.querySelector('canvas');
      if (selected && canvas) canvas.dataset.titleSelection = `◀ ${selected.getAttribute('aria-label')} ▶`;
    }, 16);
  });
}

async function selectNextLevel(page: Page, name: string): Promise<void> {
  await page.keyboard.down('ArrowRight');
  try {
    await expect(page.locator('canvas')).toHaveAttribute('data-title-selection', `◀ ${name} ▶`);
  } finally {
    await page.keyboard.up('ArrowRight');
  }
  // Selection is edge-triggered by simulation samples. Let neutral input reach
  // a simulation step before another keydown, even on a slow or fast display.
  await page.evaluate(() => new Promise<void>((resolve) => {
    requestAnimationFrame((start) => {
      const releasedFrame = (now: number): void => {
        if (now - start >= 50) resolve();
        else requestAnimationFrame(releasedFrame);
      };
      requestAnimationFrame(releasedFrame);
    });
  }));
}

async function advancePastDanger(page: Page, dangers: readonly number[], progress: { index: number; lastX?: number }): Promise<string> {
  const status = await page.locator('#status').innerText();
  const x = Number(status.match(/X (\d+)/)?.[1] ?? 0);
  if (progress.lastX !== undefined && x < progress.lastX - 100) {
    const retryIndex = dangers.findIndex((dangerX) => dangerX >= x - 40);
    progress.index = retryIndex < 0 ? dangers.length : retryIndex;
  }
  progress.lastX = x;
  while (dangers[progress.index] !== undefined && dangers[progress.index] < x - 40) progress.index++;
  if (dangers[progress.index] !== undefined && x >= dangers[progress.index] - 60) {
    await page.keyboard.down('Space');
    await page.waitForTimeout(350);
    await page.keyboard.up('Space');
    progress.index++;
  } else {
    await page.waitForTimeout(100);
  }
  return status;
}

test('terrain joins stay solid while scrolling in both directions at integer and fractional scales', async ({ page }, info) => {
  test.setTimeout(60_000);
  await page.goto('/?scene=foundation');
  // Run the real renderer on a separate canvas so sprites and HUD cannot hide seams.
  await page.addScriptTag({ content: `${RENDERER_SOURCE}\nwindow.drawTerrainTestWorld = ${drawWorld.toString()};` });
  const result = await page.evaluate(async ({ level, maxSpeed }) => {
    const manifest = await (await fetch('/assets/plains/manifest.json')).json();
    const atlas = new Image();
    atlas.src = `/assets/plains/${manifest.image}`;
    await atlas.decode();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const render = (window as unknown as { drawTerrainTestWorld: typeof drawWorld }).drawTerrainTestWorld;
    const failures: string[] = [];
    let frames = 0;
    let evidence = '';
    for (const scale of [1, 1.25, 1.5, 2]) {
      canvas.width = Math.ceil(426 * scale);
      canvas.height = Math.ceil(240 * scale);
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      for (const direction of [-1, 1]) {
        for (const surface of level.surfaces.slice(0, -1)) {
          for (let frame = 0; frame < 12; frame++) {
            const x = surface.x2 - 213 + 0.25 + direction * frame * maxSpeed / 60;
            const camera = { position: { x, y: 0 } } as Parameters<typeof drawWorld>[3];
            render(ctx, { atlas, manifest }, level, camera, () => false);
            // Every terrain surface is above y=200; the finish arch also ends above this strip.
            const joinX = Math.floor((surface.x2 - x) * scale);
            const pixels = ctx.getImageData(joinX - 1, Math.ceil(210 * scale), 3, Math.floor(20 * scale)).data;
            for (let i = 0; i < pixels.length; i += 4) {
              if (pixels[i] <= pixels[i + 1] || pixels[i + 1] <= pixels[i + 2] || pixels[i + 3] !== 255) {
                if (failures.length < 10) failures.push(`join ${surface.x2}, scale ${scale}, direction ${direction}, frame ${frame}: ${Array.from(pixels.slice(i, i + 4))}`);
                break;
              }
            }
            frames++;
            if (surface.x2 === 650 && scale === 2 && direction === 1 && frame === 0) evidence = canvas.toDataURL();
          }
        }
      }
    }
    return { failures, frames, evidence };
  }, { level: PLAINS_LEVEL, maxSpeed: DEFAULT_MOVEMENT.maxSpeed });
  const evidencePath = info.outputPath('terrain-join-650.png');
  await writeFile(evidencePath, Buffer.from(result.evidence.split(',')[1], 'base64'));
  await info.attach('terrain-join-650', { path: evidencePath, contentType: 'image/png' });
  expect(result.frames).toBe((PLAINS_LEVEL.surfaces.length - 1) * 4 * 2 * 12);
  expect(result.failures).toEqual([]);
});

test('moving platform slabs and their telegraphed paths draw on the real canvas', async ({ page }, info) => {
  await page.goto('/?scene=foundation');
  await page.addScriptTag({ content: `${RENDERER_SOURCE}\nwindow.drawTerrainTestWorld = ${drawWorld.toString()};` });
  const platforms = (QUARRY_RUN.platforms ?? []).filter(platform => platform.from.x !== platform.to.x || platform.from.y !== platform.to.y);
  // At two seconds in, the lift is parked at the top of its path and the ferry is
  // mid-crossing, so one sample covers both a parked and a travelling slab.
  const views = platforms.map((platform) => ({
    id: platform.id,
    body: platformBodyAt(platform, 2),
  }));
  const rgb = (hex: string): number[] => [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16));
  const theme = { edge: rgb(QUARRY_RUN.theme.edge), ground: rgb(QUARRY_RUN.theme.ground) };
  const results = await page.evaluate(async ({ level, views: sampled, theme: colors }) => {
    const manifest = await (await fetch('/assets/plains/manifest.json')).json();
    const atlas = new Image();
    atlas.src = `/assets/plains/${manifest.image}`;
    await atlas.decode();
    const canvas = document.createElement('canvas');
    canvas.width = 426;
    canvas.height = 240;
    const ctx = canvas.getContext('2d')!;
    const render = (window as unknown as { drawTerrainTestWorld: typeof drawWorld }).drawTerrainTestWorld;
    const bare = { ...level, platforms: [] };
    return sampled.map(({ id, body }) => {
      const offset = { x: body.x - 150, y: 0 };
      const camera = { position: offset } as Parameters<typeof drawWorld>[3];
      // The same frame without any platform data, to prove what the telegraph itself draws.
      ctx.clearRect(0, 0, 426, 240);
      render(ctx, { atlas, manifest }, bare, camera, () => true, (entity) => entity, []);
      const before = ctx.getImageData(0, 0, 426, 240).data;
      ctx.clearRect(0, 0, 426, 240);
      render(ctx, { atlas, manifest }, level, camera, () => true, (entity) => entity, [body]);
      const after = ctx.getImageData(0, 0, 426, 240).data;
      // Everything outside the deck is identical between the two frames except the telegraph,
      // so counting changed pixels there counts exactly the pips and their end markers.
      let telegraphed = 0;
      for (let y = 0; y < 240; y++) {
        for (let x = 0; x < 426; x++) {
          if (x >= 150 && x <= 150 + body.width && y >= body.y - 3 && y <= body.y + body.height) continue;
          const pixel = (y * 426 + x) * 4;
          if (before[pixel] !== after[pixel] || before[pixel + 1] !== after[pixel + 1]) telegraphed++;
        }
      }
      // Count along the whole deck rather than sampling one pixel: entity art, such as the
      // bonus gem hanging over the lift, legitimately covers part of it.
      const run = (y: number, colour: number[]): number => {
        const data = ctx.getImageData(150, Math.round(y), Math.round(body.width), 1).data;
        let matches = 0;
        for (let index = 0; index < data.length; index += 4) {
          if (data[index] === colour[0] && data[index + 1] === colour[1] && data[index + 2] === colour[2]) matches++;
        }
        return matches;
      };
      return {
        id,
        width: body.width,
        cap: run(body.y + 1, colors.edge),
        slab: run(body.y + 6, colors.ground),
        telegraphed,
        image: canvas.toDataURL(),
      };
    });
  }, { level: QUARRY_RUN, views, theme });
  expect(results.map(({ id }) => id)).toEqual(platforms.map((platform) => platform.id));
  for (const result of results) {
    // A quarter of the deck is a conservative floor: entity art legitimately covers the rest,
    // such as the bonus gem hanging over the lift or the hazards the ferry passes.
    expect(result.cap).toBeGreaterThan(result.width / 4);
    expect(result.slab).toBeGreaterThan(result.width / 4);
    // Pips mark the route away from the deck, whatever the ride happens to pass in front of.
    expect(result.telegraphed).toBeGreaterThan(20);
    const evidence = info.outputPath(`${result.id}.png`);
    await writeFile(evidence, Buffer.from(result.image.split(',')[1], 'base64'));
    await info.attach(result.id, { path: evidence, contentType: 'image/png' });
  }
});

test('production canvas loads, scales and recovers from focus loss', async ({ page, browser }, info) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('/?scene=foundation');
  await expect(page.locator('#status')).toHaveText('Foundation preview · Escape to pause · M to mute');
  const canvas = page.locator('canvas');
  await expect(canvas).toHaveAttribute('width', '426');
  await expect(canvas).toHaveAttribute('height', '240');
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor)).toBe('rgb(139, 208, 202)');
  expect(await canvas.boundingBox()).toMatchObject({ width: 1278, height: 720 });
  await page.setViewportSize({ width: 900, height: 600 });
  await expect.poll(async () => (await canvas.boundingBox())?.width).toBe(852);
  await page.keyboard.press('Escape');
  await expect(page.locator('#status')).toHaveText('Paused · Escape to resume');
  const pausedImage = await canvas.evaluate((element) => (element as HTMLCanvasElement).toDataURL());
  await page.evaluate(() => new Promise<void>((resolve) => {
    let frames = 0;
    const tick = () => { if (++frames === 10) resolve(); else requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  }));
  expect(await canvas.evaluate((element) => (element as HTMLCanvasElement).toDataURL())).toBe(pausedImage);
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await expect(page.locator('#status')).toHaveText('Paused · Return to the game to continue');
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(page.locator('#status')).toHaveText('Paused · Escape to resume');
  await page.keyboard.press('Escape');
  await expect(page.locator('#status')).toContainText('Foundation preview');
  await page.keyboard.press('m');
  await expect(page.locator('#status')).toContainText('Muted');
  await expect(page.locator('#mute')).toHaveAttribute('aria-label', 'Unmute');
  await page.locator('#mute').click();
  await expect(page.locator('#status')).not.toContainText('Muted');
  await reloadAndDismiss(page);
  await expect(page.locator('#status')).toHaveText('Foundation preview · Escape to pause · M to mute');
  expect(errors).toEqual([]);
  await info.attach('browser-version', { body: browser.version(), contentType: 'text/plain' });
  console.log(`${info.project.name}: ${browser.version()}`);
  await page.screenshot({ path: info.outputPath('foundation.png') });
});

test('art preview loads local assets and reports a missing atlas', async ({ page }) => {
  await page.goto('/?scene=art');
  await expect(page.locator('#status')).toContainText('Art preview', { timeout: 15000 });
  await expect(page.locator('#status')).not.toContainText('Loading', { timeout: 15000 });
  await page.route('**/assets/henry/henry-celebration.png', (route) => route.abort());
  await reloadAndDismiss(page);
  await expect(page.locator('#status')).toHaveText('Artwork could not load. Reload to retry.');
  await expect(page.locator('#retry')).toBeVisible();
  await page.unroute('**/assets/henry/henry-celebration.png');
  await retryAndDismiss(page);
  await expect(page.locator('#status')).toContainText('Art preview', { timeout: 15000 });
});

test('starter atlas contains real transparency and every frame stays within its cell', async ({ page }) => {
  await page.goto('/?scene=art');
  await expect(page.locator('#status')).toContainText('Art preview', { timeout: 15000 });
  const results = await page.evaluate(async () => {
    const manifest = await (await fetch('/assets/henry/manifest.json')).json();
    const image = new Image();
    image.src = '/assets/henry/' + manifest.image;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(image, 0, 0);
    return manifest.frames.map((frame: { x: number; y: number; width: number; height: number }) => {
      const pixels = ctx.getImageData(frame.x, frame.y, frame.width, frame.height).data;
      let opaque = 0;
      let clear = 0;
      let edge = 0;
      let cornerBackground = 0;
      for (let y = 0; y < frame.height; y++) for (let x = 0; x < frame.width; x++) {
        const alpha = pixels[(y * frame.width + x) * 4 + 3];
        if (alpha === 0) clear++;
        else opaque++;
        if ((x === 0 || y === 0 || x === frame.width - 1 || y === frame.height - 1) && alpha) edge++;
        // Inspect inside the normalization margin: a transparent cell border
        // alone also passes for an opaque checkerboard rectangle (#42).
        if (((x >= 4 && x < 8) || (x >= 40 && x < 44)) &&
            ((y >= 4 && y < 8) || (y >= 40 && y < 44)) && alpha) cornerBackground++;
      }
      return { opaque, clear, edge, cornerBackground };
    });
  });
  expect(results).toHaveLength(24);
  for (const result of results) {
    expect(result.opaque).toBeGreaterThan(150);
    expect(result.clear).toBeGreaterThan(500);
    expect(result.edge).toBe(0);
    expect(result.cornerBackground).toBe(0);
  }
});

test('movement preview accepts keyboard movement and jump input', async ({ page }) => {
  await page.goto('/?scene=movement');
  await expect(page.locator('#status')).toContainText('Movement preview', { timeout: 15000 });
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(180);
  await page.keyboard.up('ArrowRight');
  await expect(page.locator('canvas')).toHaveAttribute('width', '426');
  await page.keyboard.press('Space');
  await page.waitForTimeout(40);
  await expect(page.locator('#status')).toContainText('Movement preview');
});

test('world preview loads generated Plains assets and level data', async ({ page }) => {
  await page.goto('/?scene=world');
  await expect(page.locator('#status')).toContainText('World preview', { timeout: 15000 });
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(160);
  await page.keyboard.up('ArrowRight');
  await expect(page.locator('canvas')).toHaveAttribute('width', '426');
});

test('gameplay preview collects a gem and reaches a checkpoint', async ({ page }) => {
  await page.goto('/?scene=gameplay');
  await expect(page.locator('#status')).toContainText('Gameplay preview', { timeout: 15000 });
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(900);
  await page.keyboard.up('ArrowRight');
  await expect(page.locator('#status')).toContainText('Gameplay preview');
});

test('adventure flashes the sprite after damage without a rectangular overlay', async ({ page }) => {
  await page.addInitScript(() => {
    const draw = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = function (this: CanvasRenderingContext2D, ...args: unknown[]) {
      if (args[0] instanceof HTMLCanvasElement && args.length === 9) {
        this.canvas.dataset.hitSprite = `tinted|${this.globalAlpha}`;
      }
      Reflect.apply(draw, this, args);
    } as typeof draw;
    const fill = CanvasRenderingContext2D.prototype.fillRect;
    CanvasRenderingContext2D.prototype.fillRect = function (x, y, width, height) {
      if (width === 44 && height === 50) this.canvas.dataset.hurtRectangle = 'true';
      fill.call(this, x, y, width, height);
    };
  });
  await openAdventure(page, '/?scene=adventure&debug=1');
  await expect(page.locator('#status')).toContainText('Title');
  await page.keyboard.press('Space');
  await page.keyboard.down('ArrowRight');
  await expect(page.locator('canvas')).toHaveAttribute('data-hit-sprite', /tinted/, { timeout: 5000 });
  await page.keyboard.up('ArrowRight');
  await expect(page.locator('canvas')).not.toHaveAttribute('data-hurt-rectangle');
});

test('adventure HUD shows three hearts and empties one after damage', async ({ page }) => {
  await openAdventure(page, '/?scene=adventure&debug=1');
  await expect(page.locator('#status')).toContainText('Adventure preview · Title', { timeout: 15000 });
  await page.keyboard.press('Space');
  await expect(page.locator('#status')).toContainText('Adventure preview · Playing');
  const canvas = page.locator('canvas');
  const readPips = async (): Promise<number[][]> => canvas.evaluate((element) => {
    const ctx = (element as HTMLCanvasElement).getContext('2d')!;
    return [94, 110, 126].map((x) => Array.from(ctx.getImageData(x, 13, 1, 1).data));
  });
  const full = [255, 93, 93, 255];
  expect(await readPips()).toEqual([full, full, full]);

  await page.keyboard.down('ArrowRight');
  await expect.poll(async () => (await readPips()).filter((pip) => pip[0] === 255 && pip[1] === 93 && pip[2] === 93).length,
    { timeout: 5000 }).toBe(2);
  await page.keyboard.up('ArrowRight');
  const damaged = await readPips();
  expect(new Set(damaged.map((pip) => pip.join(','))).size).toBeGreaterThan(1);
});

test('a patrolling slime keeps moving while Henry stands still', async ({ page }) => {
  await openAdventure(page, '/?scene=adventure&debug=1');
  await expect(page.locator('#status')).toContainText('Adventure preview · Title', { timeout: 15000 });
  await page.keyboard.press('Space');
  await expect(page.locator('#status')).toContainText('Adventure preview · Playing');
  // Henry never moves, so the camera stays at x=0 and only slime-001's patrol
  // (230-345 on the first ramp) can change this strip of the frame.
  const signature = async (): Promise<number> => page.locator('canvas').evaluate((element) => {
    const pixels = (element as HTMLCanvasElement).getContext('2d')!.getImageData(200, 110, 180, 90).data;
    let sum = 0;
    for (let i = 0; i < pixels.length; i += 4) sum += pixels[i] * 3 + pixels[i + 1] * 5 + pixels[i + 2] * 7;
    return sum;
  });
  const before = await signature();
  await expect.poll(signature, { timeout: 5000 }).not.toBe(before);
  expect(Number((await page.locator('#status').innerText()).match(/X (\d+)/)?.[1] ?? -1)).toBe(60);
});

test('Henry faces the direction of travel, including after reversing while moving', async ({ page }) => {
  await openAdventure(page, '/?scene=adventure&debug=1');
  await expect(page.locator('#status')).toContainText('Adventure preview · Title', { timeout: 15000 });
  await page.keyboard.press('Space');
  await expect(page.locator('#status')).toContainText('Adventure preview · Playing');
  const facing = async () => Number((await page.locator('#status').innerText()).match(/F (-?\d+)/)?.[1] ?? 0);
  const velocity = async () => Number((await page.locator('#status').innerText()).match(/V (-?\d+)/)?.[1] ?? 0);
  await page.keyboard.down('ArrowRight');
  await expect.poll(velocity).toBeGreaterThan(0);
  expect(await facing()).toBe(1);
  await page.keyboard.up('ArrowRight');
  await page.keyboard.down('ArrowLeft');
  await expect.poll(velocity, { timeout: 3000 }).toBeLessThan(0);
  expect(await facing()).toBe(-1);
  await page.keyboard.up('ArrowLeft');
});

test('default main menu starts the Plains level with Space', async ({ page }) => {
  await openAdventure(page, '/');
  await expect(page.locator('#status')).toContainText('Adventure preview · Title', { timeout: 15000 });
  await page.keyboard.press('Space');
  await expect(page.locator('#status')).toContainText('Adventure preview · Playing');
  await page.keyboard.press('Escape');
  await expect(page.locator('#status')).toHaveText('Paused · Escape to resume');
  await page.keyboard.press('Escape');
  await expect(page.locator('#status')).toContainText('Adventure preview · Playing');
  await reloadAndDismiss(page);
  await expect(page.locator('#status')).toContainText('Adventure preview · Title');
});

test('title picker selects Quarry Run and starts the selected route', async ({ page }) => {
  // The extended Quarry Run (issue #73) takes about a minute of held-right real time.
  // Issue #74 makes walking through every hazard fatal, so jump near each danger.
  test.setTimeout(200_000);
  await observeTitleSelection(page);
  await openAdventure(page, '/?scene=adventure&debug=1');
  await expect(page.locator('#status')).toContainText('Adventure preview · Title', { timeout: 15000 });
  await selectNextLevel(page, 'QUARRY RUN');
  await page.keyboard.press('Space');
  await expect(page.locator('#status')).toContainText('Adventure preview · Playing');
  await page.keyboard.down('ArrowRight');
  const progress = { index: 0 };
  const dangers = dangerXs(QUARRY_RUN);
  for (let step = 0; step < 1100; step++) {
    if ((await advancePastDanger(page, dangers, progress)).includes('Finish')) break;
  }
  await page.keyboard.up('ArrowRight');
  await expect(page.locator('#status')).toContainText('Adventure preview · Finish', { timeout: 5000 });
});

test('Quarry crumbling ledge warns, disappears and returns after fall recovery', async ({ page }, info) => {
  test.setTimeout(150_000);
  await page.addInitScript(() => {
    const fillRect = CanvasRenderingContext2D.prototype.fillRect;
    const drawImage = CanvasRenderingContext2D.prototype.drawImage;
    const stroke = CanvasRenderingContext2D.prototype.stroke;
    CanvasRenderingContext2D.prototype.fillRect = function (x, y, width, height) {
      if (x === 0 && y === 0 && width === 426 && height === 240 && this.fillStyle === '#657b8c') {
        this.canvas.dataset.ledgeTiles = '0';
        this.canvas.dataset.ledgeCracks = '0';
      }
      fillRect.call(this, x, y, width, height);
    };
    CanvasRenderingContext2D.prototype.drawImage = function (this: CanvasRenderingContext2D, ...args: unknown[]) {
      if (args.length === 9 && args[7] === 24 && args[8] === 24) {
        const count = Number(this.canvas.dataset.ledgeTiles ?? 0);
        this.canvas.dataset.ledgeTiles = String(count + 1);
      }
      Reflect.apply(drawImage, this, args);
    } as typeof drawImage;
    CanvasRenderingContext2D.prototype.stroke = function (path?: Path2D) {
      if (this.strokeStyle === '#49362d') {
        const count = Number(this.canvas.dataset.ledgeCracks ?? 0);
        this.canvas.dataset.ledgeCracks = String(count + 1);
        if (!this.canvas.dataset.ledgeAutoPaused) {
          this.canvas.dataset.ledgeAutoPaused = 'true';
          window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape' }));
          window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Escape' }));
        }
      }
      Reflect.apply(stroke, this, path ? [path] : []);
    };
  });
  await openAdventure(page, '/?scene=adventure&debug=1');
  await expect(page.locator('#status')).toContainText('Adventure preview · Title', { timeout: 15_000 });
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(100);
  await page.keyboard.up('ArrowRight');
  await page.keyboard.press('Space');
  await expect(page.locator('#status')).toContainText('Adventure preview · Playing');
  const canvas = page.locator('canvas');
  await expect(canvas).toHaveAttribute('data-ledge-tiles', '9');

  const dangerProgress = { index: 0 };
  const dangers = dangerXs(QUARRY_RUN);
  await page.keyboard.down('ArrowRight');
  for (let step = 0; step < 1_000; step++) {
    const status = await advancePastDanger(page, dangers, dangerProgress);
    if (status.includes('Paused')) break;
  }
  await expect(page.locator('#status')).toHaveText('Paused · Escape to resume', { timeout: 5_000 });
  await page.keyboard.up('ArrowRight');
  expect(Number(await canvas.getAttribute('data-ledge-cracks') ?? 0)).toBeGreaterThan(0);
  await info.attach('crumbling-ledge-warning', {
    body: await canvas.screenshot({ path: info.outputPath('crumbling-ledge-warning.png') }),
    contentType: 'image/png',
  });
  await page.keyboard.press('Escape');
  await expect(page.locator('#status')).toContainText('Adventure preview · Playing');
  await expect.poll(async () => Number(await canvas.getAttribute('data-ledge-tiles') ?? 0), { timeout: 5_000 })
    .toBe(6);

  await page.keyboard.down('ArrowLeft');
  await expect.poll(async () => Number(await canvas.getAttribute('data-ledge-tiles') ?? 0), { timeout: 20_000 })
    .toBe(9);
  await page.keyboard.up('ArrowLeft');
  expect(await page.locator('#status').innerText()).toContain('Playing');
});

test('title picker renders Treetop Timbers with its own atlas', async ({ page }, info) => {
  await observeTitleSelection(page);
  await page.addInitScript(() => {
    const original = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = function (this: CanvasRenderingContext2D,
      ...args: Parameters<typeof original>) {
      const image = args[0];
      if (image instanceof HTMLImageElement && image.src.endsWith('/assets/timbers/environment.png')) {
        this.canvas.dataset.timberAtlas = image.src;
      }
      Reflect.apply(original, this, args);
    } as typeof original;
  });
  await openAdventure(page, '/?scene=adventure&debug=1');
  await expect(page.locator('#status')).toContainText('Adventure preview · Title', { timeout: 15000 });
  await selectNextLevel(page, 'QUARRY RUN');
  await selectNextLevel(page, 'TREETOP TIMBERS');
  await page.keyboard.press('Space');
  await expect(page.locator('#status')).toContainText('Adventure preview · Playing');
  await expect(page.locator('canvas')).toHaveAttribute(
    'data-timber-atlas', /\/assets\/timbers\/environment\.png$/,
  );
  await page.keyboard.down('ArrowRight');
  await expect.poll(async () => Number(
    (await page.locator('#status').innerText()).match(/X (\d+)/)?.[1] ?? 0,
  ), { timeout: 10000 }).toBeGreaterThan(1000);
  await page.keyboard.up('ArrowRight');
  const screenshot = info.outputPath('treetop-timbers.png');
  await page.locator('canvas').screenshot({ path: screenshot });
  await info.attach('treetop-timbers', { path: screenshot, contentType: 'image/png' });
});

test('title picker consumes each selection and release with delayed animation frames', async ({ page }) => {
  await observeTitleSelection(page);
  await page.addInitScript(() => {
    const original = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (callback) => window.setTimeout(() => original(callback), 200);
  });
  await openAdventure(page, '/?scene=adventure&debug=1');
  await expect(page.locator('#status')).toContainText('Adventure preview · Title', { timeout: 15000 });
  await selectNextLevel(page, 'QUARRY RUN');
  await selectNextLevel(page, 'TREETOP TIMBERS');
  await page.keyboard.press('Space');
  await expect(page.locator('#status')).toContainText('Adventure preview · Playing');
});

test('title picker wraps back to Sunset Site and renders its terrain atlas', async ({ page }) => {
  await page.addInitScript(() => {
    const original = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = function (this: CanvasRenderingContext2D,
      ...args: Parameters<typeof original>) {
      const image = args[0];
      if (image instanceof HTMLImageElement && image.src.endsWith('/assets/site/environment.png')
        && args.length === 9) {
        this.canvas.dataset.siteTerrainAtlas = image.src;
      }
      Reflect.apply(original, this, args);
    } as typeof original;
  });
  await openAdventure(page, '/?scene=adventure&debug=1');
  await expect(page.locator('#status')).toContainText('Adventure preview · Title', { timeout: 15000 });
  // Wrap from Plains through Sandy Cove and Frost Ridge to Sunset Site.
  for (let step = 0; step < 3; step++) {
    await page.keyboard.down('ArrowLeft');
    await page.waitForTimeout(100);
    await page.keyboard.up('ArrowLeft');
    await page.waitForTimeout(50);
  }
  await page.keyboard.press('Space');
  await expect(page.locator('#status')).toContainText('Adventure preview · Playing');
  await expect(page.locator('canvas')).toHaveAttribute(
    'data-site-terrain-atlas', /\/assets\/site\/environment\.png$/,
  );
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(600);
  await page.keyboard.up('ArrowRight');
  await expect(page.locator('#status')).toContainText('Adventure preview · Playing');
});

test('adventure mute control updates the audio state', async ({ page }) => {
  await openAdventure(page, '/?scene=adventure');
  await expect(page.locator('#status')).toContainText('Adventure preview', { timeout: 15000 });
  await page.locator('#mute').click();
  await expect(page.locator('#mute')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#status')).toContainText('Muted');
  await page.locator('#mute').click();
  await expect(page.locator('#mute')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('#status')).not.toContainText('Muted');
});

test('adventure remains playable when Web Audio is unavailable', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    Object.defineProperty(window, 'AudioContext', { value: class { constructor() { throw Error('Unavailable'); } } });
  });
  await openAdventure(page, '/?scene=adventure');
  await expect(page.locator('#status')).toContainText('Adventure preview · Title', { timeout: 15000 });
  await page.keyboard.press('Space');
  await expect(page.locator('#status')).toContainText('Adventure preview · Playing');
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(180);
  await page.keyboard.up('ArrowRight');
  await page.keyboard.press('Escape');
  await expect(page.locator('#status')).toHaveText('Paused · Escape to resume');
  expect(errors).toEqual([]);
});

test('adventure keeps its letterbox and pauses on focus loss', async ({ page }) => {
  await openAdventure(page, '/?scene=adventure');
  await expect(page.locator('#status')).toContainText('Adventure preview · Title', { timeout: 15000 });
  await page.keyboard.press('Space');
  await expect(page.locator('#status')).toContainText('Adventure preview · Playing');
  const canvas = page.locator('canvas');
  await page.setViewportSize({ width: 900, height: 600 });
  await expect.poll(async () => (await canvas.boundingBox())?.width).toBe(852);
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await expect(page.locator('#status')).toHaveText('Paused · Return to the game to continue');
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(page.locator('#status')).toContainText('Adventure preview · Playing');
});

test('adventure exposes retry when a required asset fails to load', async ({ page }) => {
  await page.route('**/assets/henry/henry-celebration.png', (route) => route.abort());
  await openAdventure(page, '/?scene=adventure');
  await expect(page.locator('#status')).toHaveText('Artwork could not load. Reload to retry.', { timeout: 15000 });
  await expect(page.locator('#retry')).toBeVisible();
  await page.unroute('**/assets/henry/henry-celebration.png');
  await retryAndDismiss(page);
  await expect(page.locator('#status')).toContainText('Adventure preview · Title', { timeout: 15000 });
});

test('adventure clears held controller input after disconnect', async ({ page }) => {
  await page.addInitScript(() => {
    const buttons = Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 }));
    const pad = {
      id: 'disconnect-controller', index: 0, connected: true, mapping: 'standard', timestamp: 0,
      axes: [0, 0, 0, 0], buttons, vibrationActuator: null,
    };
    Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => [pad] });
    Object.assign(window, { disconnectController: pad });
  });
  await openAdventure(page, '/?scene=adventure&debug=1');
  await expect(page.locator('#status')).toContainText('Adventure preview · Title', { timeout: 15000 });
  await page.keyboard.press('Space');
  await expect(page.locator('#status')).toContainText('Adventure preview · Playing');
  await page.evaluate(() => {
    (window as unknown as { disconnectController: { axes: number[] } }).disconnectController.axes[0] = 1;
  });
  await expect.poll(async () => Number(
    (await page.locator('#status').innerText()).match(/V (-?\d+)/)?.[1] ?? 0,
  )).toBeGreaterThan(0);
  // Sample and disconnect in one browser task: tracing/transport latency between
  // separate calls otherwise counts still-held movement as post-disconnect coast.
  const beforeDisconnect = await page.evaluate(() => {
    const x = Number(document.querySelector('#status')?.textContent?.match(/X (\d+)/)?.[1] ?? 0);
    window.dispatchEvent(new Event('gamepaddisconnected'));
    const pad = (window as unknown as { disconnectController: { axes: number[]; connected: boolean } }).disconnectController;
    pad.connected = false;
    pad.axes[0] = 0;
    return x;
  });
  await expect(page.locator('#status')).toContainText(' V 0 ');
  const afterDisconnect = Number((await page.locator('#status').innerText()).match(/X (\d+)/)?.[1] ?? 0);
  // Disconnect clears the held input; existing momentum may coast briefly while braking.
  expect(afterDisconnect - beforeDisconnect).toBeLessThanOrEqual(25);
  await page.evaluate(() => {
    const pad = (window as unknown as { disconnectController: { axes: number[]; connected: boolean } }).disconnectController;
    pad.connected = true;
    pad.axes[0] = 0;
  });
  await page.waitForTimeout(50);
  await page.evaluate(() => {
    (window as unknown as { disconnectController: { axes: number[] } }).disconnectController.axes[0] = 1;
  });
  await page.waitForTimeout(150);
  const afterRelease = Number((await page.locator('#status').innerText()).match(/X (\d+)/)?.[1] ?? 0);
  expect(afterRelease).toBeGreaterThan(afterDisconnect);
});

test('adventure can complete the forgiving route and replay directly with a fresh camera', async ({ page }, info) => {
  test.setTimeout(200_000);
  await openAdventure(page, '/?scene=adventure&debug=1');
  await expect(page.locator('#status')).toContainText('Adventure preview · Title', { timeout: 15000 });
  await page.keyboard.press('Space');
  await expect(page.locator('#status')).toContainText('Adventure preview · Playing', { timeout: 15000 });
  await page.keyboard.down('ArrowRight');
  // The extended route (issue #45) takes well over a minute of held-right real time.
  // Jump near hazards so health loss does not intentionally return the run to a checkpoint.
  const progress = { index: 0 };
  const dangers = dangerXs(PLAINS_LEVEL);
  for (let step = 0; step < 1100; step++) {
    const status = await advancePastDanger(page, dangers, progress);
    if (status.includes('Finish')) break;
  }
  await page.keyboard.up('ArrowRight');
  await expect(page.locator('#status')).toContainText('Adventure preview · Finish', { timeout: 5000 });
  const finishStatus = await page.locator('#status').innerText();
  expect(finishStatus).toMatch(/Gems [1-9]\d*/);
  const celebrationPixels = await page.locator('canvas').evaluate((element) => {
    const canvas = element as HTMLCanvasElement;
    const ctx = canvas.getContext('2d')!;
    const pixels = ctx.getImageData(256, 87, 48, 64).data;
    let matches = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      if (pixels[i] > 190 && pixels[i + 1] > 120 && pixels[i + 1] < 240 && pixels[i + 2] < 100 && pixels[i + 3] > 0) matches++;
    }
    return matches;
  });
  expect(celebrationPixels).toBeGreaterThan(20);
  await page.keyboard.press('Space');
  await expect(page.locator('#status')).toContainText('Adventure preview · Playing', { timeout: 15000 });
  await expect(page.locator('#status')).toContainText('X 60');
  await info.attach('replay-starting-view', { body: await page.locator('canvas').screenshot({ path: info.outputPath('replay-starting-view.png') }), contentType: 'image/png' });
});

test('adventure pause freezes progress and reload starts a fresh in-memory run', async ({ page }) => {
  await openAdventure(page, '/?scene=adventure&debug=1');
  await expect(page.locator('#status')).toContainText('Adventure preview · Title', { timeout: 15000 });
  await page.keyboard.press('Space');
  await expect(page.locator('#status')).toContainText('Adventure preview · Playing', { timeout: 15000 });
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(220);
  await page.keyboard.up('ArrowRight');
  const progressed = await page.locator('#status').innerText();
  const progressedX = Number(progressed.match(/X (\d+)/)?.[1] ?? 0);
  expect(progressedX).toBeGreaterThan(0);
  await page.keyboard.press('Escape');
  await expect(page.locator('#status')).toHaveText('Paused · Escape to resume');
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));
  const pausedImage = await page.locator('canvas').evaluate((element) => (element as HTMLCanvasElement).toDataURL());
  await page.waitForTimeout(250);
  expect(await page.locator('canvas').evaluate((element) => (element as HTMLCanvasElement).toDataURL())).toBe(pausedImage);
  await page.keyboard.press('Escape');
  await expect(page.locator('#status')).toContainText('Adventure preview · Playing');
  await reloadAndDismiss(page);
  await expect(page.locator('#status')).toContainText('Adventure preview · Title', { timeout: 15000 });
});

test('default main menu accepts controller primary-button start, Start pause and D-pad movement', async ({ page }) => {
  await observeTitleSelection(page);
  await page.addInitScript(() => {
    const buttons = Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 }));
    const pad = {
      id: 'browser-smoke-controller', index: 0, connected: true, mapping: 'standard', timestamp: 0,
      axes: [0, 0, 0, 0], buttons, vibrationActuator: null,
    };
    Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => [pad] });
    Object.assign(window, { smokeController: pad });
  });
  await openAdventure(page, '/');
  await expect(page.locator('#status')).toContainText('Adventure preview · Title', { timeout: 15000 });
  await page.evaluate(() => {
    const pad = (window as unknown as { smokeController: { buttons: { pressed: boolean }[] } }).smokeController;
    pad.buttons[15].pressed = true;
  });
  await expect(page.locator('canvas')).toHaveAttribute('data-title-selection', '◀ QUARRY RUN ▶');
  await page.evaluate(() => {
    const pad = (window as unknown as { smokeController: { buttons: { pressed: boolean }[] } }).smokeController;
    pad.buttons[15].pressed = false;
    pad.buttons[0].pressed = true;
  });
  await expect(page.locator('#status')).toContainText('Adventure preview · Playing');
  await page.evaluate(() => {
    const pad = (window as unknown as { smokeController: { axes: number[]; buttons: { pressed: boolean }[] } }).smokeController;
    pad.buttons[0].pressed = false;
    pad.axes[0] = 1;
    pad.buttons[15].pressed = true;
  });
  await page.waitForTimeout(120);
  await page.evaluate(() => {
    const pad = (window as unknown as { smokeController: { axes: number[]; buttons: { pressed: boolean }[] } }).smokeController;
    pad.axes[0] = 0;
    pad.buttons[15].pressed = false;
    pad.buttons[9].pressed = true;
  });
  await expect(page.locator('#status')).toHaveText('Paused · Start to resume');
  await page.evaluate(() => {
    const pad = (window as unknown as { smokeController: { buttons: { pressed: boolean }[] } }).smokeController;
    pad.buttons[9].pressed = false;
  });
  await page.waitForTimeout(40);
  await page.evaluate(() => {
    const pad = (window as unknown as { smokeController: { buttons: { pressed: boolean }[] } }).smokeController;
    pad.buttons[9].pressed = true;
  });
  await expect(page.locator('#status')).toContainText('Adventure preview');
});

test('controller jump works mid-gameplay via any face button, not just at the title screen (#62)', async ({ page }) => {
  await page.addInitScript(() => {
    const buttons = Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 }));
    const pad = {
      id: 'jump-controller', index: 0, connected: true, mapping: 'standard', timestamp: 0,
      axes: [0, 0, 0, 0], buttons, vibrationActuator: null,
    };
    Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => [pad] });
    Object.assign(window, { jumpController: pad });
  });
  await openAdventure(page, '/?scene=adventure&debug=1');
  await expect(page.locator('#status')).toContainText('Adventure preview · Title', { timeout: 15000 });
  const readY = async (): Promise<number> =>
    Number((await page.locator('#status').innerText()).match(/Y (\d+)/)?.[1] ?? 0);
  // Start with A (button 0), as the existing controller smoke test does.
  await page.evaluate(() => {
    const pad = (window as unknown as { jumpController: { buttons: { pressed: boolean }[] } }).jumpController;
    pad.buttons[0].pressed = true;
  });
  await expect(page.locator('#status')).toContainText('Adventure preview · Playing');
  await page.evaluate(() => {
    const pad = (window as unknown as { jumpController: { buttons: { pressed: boolean }[] } }).jumpController;
    pad.buttons[0].pressed = false;
  });
  await page.waitForTimeout(150); // Let the player settle on the ground.
  const groundedY = await readY();
  // Jump with B (button 1) once gameplay is running, exercising the broadened jump mapping.
  await page.evaluate(() => {
    const pad = (window as unknown as { jumpController: { buttons: { pressed: boolean }[] } }).jumpController;
    pad.buttons[1].pressed = true;
  });
  await page.waitForTimeout(80);
  await page.evaluate(() => {
    const pad = (window as unknown as { jumpController: { buttons: { pressed: boolean }[] } }).jumpController;
    pad.buttons[1].pressed = false;
  });
  await expect.poll(readY).toBeLessThan(groundedY);
});

test('all checkpoints activate along the ground route and render planted markers', async ({ page }, info) => {
  // The extended route (issue #45) spreads six checkpoints across ~9,800px real
  // held-right travel, so this needs a much larger budget than the original
  // three-checkpoint level did.
  test.setTimeout(200_000);
  // Observe the visible HUD without adding test-only state to the game.
  await page.addInitScript(() => {
    const fillText = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (text, x, y, maxWidth) {
      if (text === 'Checkpoint reached!') document.querySelector('canvas')?.setAttribute('data-test-checkpoint', text);
      if (maxWidth === undefined) fillText.call(this, text, x, y);
      else fillText.call(this, text, x, y, maxWidth);
    };
  });
  await openAdventure(page, '/?scene=adventure&debug=1');
  await expect(page.locator('#status')).toContainText('Adventure preview · Title');
  await page.keyboard.press('Space');
  await expect(page.locator('#status')).toContainText('Adventure preview · Playing');
  await page.keyboard.down('ArrowRight');
  // Terrain heights come from surfaceY rather than being restated here, so the check
  // cannot drift from the level data the way the coordinates in #26 did.
  const checkpoints = PLAINS_LEVEL.checkpoints;
  const dangers = dangerXs(PLAINS_LEVEL);
  const progress = { index: 0 };
  for (const checkpoint of checkpoints) {
    await page.evaluate(() => document.querySelector('canvas')?.removeAttribute('data-test-checkpoint'));
    let activated = false;
    for (let step = 0; step < 400; step++) {
      if (await page.locator('canvas').getAttribute('data-test-checkpoint') === 'Checkpoint reached!') {
        activated = true;
        break;
      }
      await advancePastDanger(page, dangers, progress);
    }
    expect(activated, checkpoint.id).toBe(true);
    // Activation is detected anywhere in the 28px window around the flag, so compare
    // Henry's feet to the terrain beneath him rather than to the flag's own height:
    // the hillside marker sits on a ramp, where those two differ by the slope alone.
    // X and Y come from one status sample, so they describe the same frame.
    const status = await page.locator('#status').innerText();
    const x = Number(status.match(/X (\d+)/)?.[1] ?? 0);
    const y = Number(status.match(/Y (\d+)/)?.[1] ?? 0);
    expect(Math.abs(x - checkpoint.x), checkpoint.id).toBeLessThan(90);
    expect(Math.abs(y + DEFAULT_MOVEMENT.height - surfaceY(PLAINS_LEVEL, x))).toBeLessThanOrEqual(2);
    // Walk just past the flag so Henry does not obscure its base in the evidence.
    await page.waitForTimeout(300);
    await page.keyboard.up('ArrowRight');
    await page.waitForTimeout(150);
    await info.attach(checkpoint.id, { body: await page.locator('canvas').screenshot(), contentType: 'image/png' });
    await page.waitForTimeout(2000);
    await page.keyboard.down('ArrowRight');
  }
  await page.keyboard.up('ArrowRight');
});

// Record how the HUD is actually drawn, the way #46 was measured, without test-only game state.
const recordHudDraws = async (page: import('@playwright/test').Page): Promise<void> => {
  await page.addInitScript(() => {
    const fillText = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (text, x, y, maxWidth) {
      if (text.startsWith('GEMS ')) document.querySelector('canvas')?.setAttribute('data-test-hud-draw', `${this.textAlign} ${x} ${text}`);
      if (maxWidth === undefined) fillText.call(this, text, x, y);
      else fillText.call(this, text, x, y, maxWidth);
    };
  });
};

test('adventure HUD stays left-aligned through keyboard pause and focus loss', async ({ page }) => {
  await recordHudDraws(page);
  await openAdventure(page, '/?scene=adventure');
  await expect(page.locator('#status')).toContainText('Adventure preview · Title', { timeout: 15000 });
  await page.keyboard.press('Space');
  await expect(page.locator('#status')).toContainText('Adventure preview · Playing');
  const canvas = page.locator('canvas');
  await expect(canvas).toHaveAttribute('data-test-hud-draw', /^left 10 /);
  const resample = async (): Promise<void> => {
    await page.evaluate(() => document.querySelector('canvas')?.removeAttribute('data-test-hud-draw'));
  };
  await page.keyboard.press('Escape');
  await expect(page.locator('#status')).toHaveText('Paused · Escape to resume');
  await resample();
  await page.keyboard.press('Escape');
  await expect(page.locator('#status')).toContainText('Adventure preview · Playing');
  await expect(canvas).toHaveAttribute('data-test-hud-draw', /^left 10 /);
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await expect(page.locator('#status')).toHaveText('Paused · Return to the game to continue');
  await resample();
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(page.locator('#status')).toContainText('Adventure preview · Playing');
  await expect(canvas).toHaveAttribute('data-test-hud-draw', /^left 10 /);
  // The double-digit gem total must fit its own panel, before the hearts at x=85.
  const rightEdge = await canvas.evaluate((element) => {
    const ctx = (element as HTMLCanvasElement).getContext('2d')!;
    ctx.font = 'bold 10px monospace';
    return 10 + ctx.measureText('GEMS 99').width;
  });
  expect(rightEdge).toBeLessThan(81);
});

test('a collected gem stops being drawn where it stood', async ({ page }, info) => {
  await recordHudDraws(page);
  await openAdventure(page, '/?scene=adventure&debug=1');
  await expect(page.locator('#status')).toContainText('Adventure preview · Title', { timeout: 15000 });
  await page.keyboard.press('Space');
  await expect(page.locator('#status')).toContainText('Adventure preview · Playing');
  const canvas = page.locator('canvas');
  const gem = PLAINS_LEVEL.entities.find((entity) => entity.id === 'gem-001')!;
  // Near the start the camera is clamped to 0, so the gem's cell keeps one screen rect.
  const cell = { x: gem.x - 24, y: gem.y - 48, size: 48 };
  const readCell = async (): Promise<number[]> => canvas.evaluate((element, rect) =>
    Array.from((element as HTMLCanvasElement).getContext('2d')!.getImageData(rect.x, rect.y, rect.size, rect.size).data), cell);
  const playerX = async (): Promise<number> => Number((await page.locator('#status').innerText()).match(/X (\d+)/)?.[1] ?? 0);
  const before = await readCell();
  await expect(canvas).toHaveAttribute('data-test-hud-draw', /GEMS 0/);
  await page.keyboard.down('ArrowRight');
  for (let step = 0; step < 40 && (await playerX()) < 100; step++) await page.waitForTimeout(50);
  // Jump before the gem and stay airborne across it, as #44 reproduced it.
  await page.keyboard.down('Space');
  await page.waitForTimeout(300);
  await page.keyboard.up('Space');
  for (let step = 0; step < 40 && (await playerX()) < gem.x + 40; step++) await page.waitForTimeout(50);
  await page.keyboard.up('ArrowRight');
  await expect(canvas).toHaveAttribute('data-test-hud-draw', /GEMS 1/);
  // Walk back so Henry cannot be standing over the gem's cell when it is sampled.
  await page.keyboard.down('ArrowLeft');
  for (let step = 0; step < 40 && (await playerX()) > 60; step++) await page.waitForTimeout(50);
  await page.keyboard.up('ArrowLeft');
  await page.waitForTimeout(150);
  await expect(canvas).toHaveAttribute('data-test-hud-draw', /GEMS 1/);
  const after = await readCell();
  const changed = before.filter((value, index) => value !== after[index]).length;
  expect(changed, 'the collected gem is still drawn').toBeGreaterThan(200);
  await info.attach('gem-001-collected', { body: await canvas.screenshot(), contentType: 'image/png' });
});

test('ground scenery and slimes draw their opaque bases at terrain height', async ({ page }, info) => {
  await page.addInitScript(() => {
    const drawImage = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = function (this: CanvasRenderingContext2D, ...args: unknown[]) {
      const [image, sx, sy] = args;
      if (image instanceof HTMLImageElement && image.src.endsWith('/scenery/background.png')) {
        this.canvas.dataset.worldDraws = '[]';
      } else if (image instanceof HTMLImageElement && image.src.endsWith('/assets/plains/environment.png')) {
        const canvas = this.canvas;
        // The parallax hills precede the entity pass each frame.
        const calls = sx === 96 && sy === 144 ? [] : JSON.parse(canvas.dataset.worldDraws ?? '[]');
        if (!(sx === 96 && sy === 144)) calls.push(args.slice(1));
        canvas.dataset.worldDraws = JSON.stringify(calls);
      }
      Reflect.apply(drawImage, this, args);
    } as typeof drawImage;
  });
  await openAdventure(page, '/?scene=adventure&debug=1');
  await expect(page.locator('#status')).toContainText('Adventure preview · Title');
  await page.keyboard.press('Space');
  const bases = await page.evaluate(async () => {
    const manifest = await (await fetch('/assets/plains/manifest.json')).json();
    const image = new Image();
    image.src = '/assets/plains/' + manifest.image;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(image, 0, 0);
    const bases: Record<string, number> = {};
    for (const [asset, index] of Object.entries(manifest.assets) as [string, number][]) {
      const pixels = ctx.getImageData(index % 4 * 48, Math.floor(index / 4) * 48, 48, 48).data;
      bases[asset] = 0;
      for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) {
        if (pixels[(y * 48 + x) * 4 + 3]) bases[asset] = y + 1;
      }
    }
    return bases;
  });
  const calls = JSON.parse(await page.locator('canvas').getAttribute('data-world-draws') ?? '[]') as number[][];
  PLAINS_LEVEL.entities.forEach((entity) => {
    if (entity.kind !== 'decoration' && entity.kind !== 'slime') return;
    // Generated decorative trees/plants/rocks are covered by the scenery test.
    if (entity.kind === 'decoration' && entity.asset !== 'cave') return;
    const call = calls.find((args) => {
      const drawnX = args[4] + 24;
      if (entity.patrol) {
        return args[0] === 96 && args[1] === 96 &&
          drawnX >= entity.patrol.minX && drawnX <= entity.patrol.maxX;
      }
      return drawnX === entity.x && args[6] === 48;
    })!;
    expect(call, entity.id).toBeDefined();
    // Ground art anchors at its horizontal centre, 24px into the 48px cell. A patrolling
    // slime has already walked away from its level X, so check the ground under where it is.
    const drawnX = call[4] + 24;
    if (entity.patrol) {
      expect(drawnX, entity.id).toBeGreaterThanOrEqual(entity.patrol.minX);
      expect(drawnX, entity.id).toBeLessThanOrEqual(entity.patrol.maxX);
    } else {
      expect(drawnX, entity.id).toBeCloseTo(entity.x, 5);
    }
    expect(call[5] + bases[entity.asset], entity.id).toBeCloseTo(surfaceY(PLAINS_LEVEL, drawnX), 5);
  });
  // Frame the first slime on its ramp and the first tree on the meadow.
  await page.keyboard.down('ArrowRight');
  await expect.poll(async () => Number((await page.locator('#status').innerText()).match(/X (\d+)/)?.[1] ?? 0),
    { timeout: 5000, intervals: [30] }).toBeGreaterThan(320);
  await page.keyboard.up('ArrowRight');
  await page.waitForTimeout(900);
  const screenshot = info.outputPath('grounded-slime-and-tree.png');
  await page.locator('canvas').screenshot({ path: screenshot });
  await info.attach('grounded-slime-and-tree', { path: screenshot, contentType: 'image/png' });
});

test('Plains renders its panorama and transparent scenery, and Quarry keeps its own backdrop', async ({ page }, info) => {
  await page.addInitScript(() => {
    const original = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = function (this: CanvasRenderingContext2D, ...args: unknown[]) {
      const image = args[0];
      if (image instanceof HTMLImageElement) {
        const source = image.src;
        if (source.endsWith('/scenery/background.png') || source.endsWith('/trails/backdrops.png') || (source.endsWith('/environment.png') && args[1] === 48 && args[2] === 48 && Number(args[7]) > 48)) {
          this.canvas.dataset.sceneryDraws = '[]';
        }
        const calls = JSON.parse(this.canvas.dataset.sceneryDraws ?? '[]');
        calls.push({ source, args: args.slice(1) });
        this.canvas.dataset.sceneryDraws = JSON.stringify(calls);
      }
      Reflect.apply(original, this, args);
    } as typeof original;
  });
  await openAdventure(page, '/?scene=adventure&debug=1');
  await expect(page.locator('#status')).toContainText('Adventure preview · Title');
  await page.keyboard.press('Space');
  await expect(page.locator('#status')).toContainText('Playing');
  const calls = JSON.parse(await page.locator('canvas').getAttribute('data-scenery-draws') ?? '[]') as { source: string; args: number[] }[];
  expect(calls[0].source).toContain('/scenery/background.png');
  const tree = calls.find((call) => call.source.endsWith('/foreground.png') && call.args[0] === 29 && call.args[4] > 400)!;
  expect(tree).toBeDefined();
  expect(tree.args[5] + tree.args[7]).toBe(158);
  const henryIndex = calls.findIndex((call) => call.source.includes('/henry/'));
  expect(henryIndex).toBeGreaterThan(0);
  expect(calls.slice(henryIndex + 1).some((call) => call.source.endsWith('/foreground.png'))).toBe(true);
  const transparent = await page.evaluate(async () => {
    const image = new Image(); image.src = '/assets/plains/scenery/foreground.png'; await image.decode();
    const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
    const ctx = canvas.getContext('2d')!; ctx.drawImage(image, 0, 0);
    return ctx.getImageData(0, 0, 1, 1).data[3];
  });
  expect(transparent).toBe(0);
  const screenshot = info.outputPath('plains-scenery-start.png');
  await page.locator('canvas').screenshot({ path: screenshot });
  await info.attach('plains-scenery-start', { path: screenshot, contentType: 'image/png' });
  await openAdventure(page, '/?scene=adventure&debug=1');
  await expect(page.locator('#status')).toContainText('Title');
  await page.keyboard.down('ArrowRight');
  // Selection changes the title text; the world changes only when Space starts it.
  await page.waitForTimeout(100);
  await page.keyboard.up('ArrowRight');
  await page.keyboard.press('Space');
  await expect(page.locator('#status')).toContainText('Playing');
  const quarryCalls = JSON.parse(await page.locator('canvas').getAttribute('data-scenery-draws') ?? '[]') as { source: string }[];
  expect(quarryCalls.length).toBeGreaterThan(0);
  expect(quarryCalls.some((call) => call.source.includes('/scenery/'))).toBe(false);
});

test('a failed scenery image exposes Retry loading and recovers', async ({ page }) => {
  await page.route('**/assets/plains/scenery/foreground.png', (route) => route.abort());
  await openAdventure(page, '/?scene=adventure');
  await expect(page.locator('#status')).toHaveText('Artwork could not load. Reload to retry.');
  await expect(page.locator('#retry')).toBeVisible();
  const retryBox = (await page.locator('#retry').boundingBox())!;
  const statusBox = (await page.locator('#status').boundingBox())!;
  expect(retryBox.y + retryBox.height).toBeLessThan(statusBox.y);
  await page.unroute('**/assets/plains/scenery/foreground.png');
  await retryAndDismiss(page);
  await expect(page.locator('#status')).toContainText('Adventure preview · Title');
  await expect(page.locator('#retry')).toBeHidden();
  await expect(page.locator('canvas')).toBeVisible();
});

for (const [biome, pickerSteps] of [['frost', 4], ['cove', 5]] as const) {
  test(`${biome} trail renders its material, completes and replays`, async ({ page }, info) => {
    test.setTimeout(120_000);
    await page.addInitScript(() => {
      const original = CanvasRenderingContext2D.prototype.drawImage;
      CanvasRenderingContext2D.prototype.drawImage = function (this: CanvasRenderingContext2D,
        ...args: Parameters<typeof original>) {
        const image = args[0];
        if (image instanceof HTMLImageElement && /\/assets\/(frost|cove)\/environment.png$/.test(image.src)) {
          this.canvas.dataset.biomeAtlas = image.src;
          // Creature cell: track the live drawn Y for the real pause behavior below.
          if (args[1] === 96 && args[2] === 96) this.canvas.dataset.creatureY = String(args[6]);
        }
        Reflect.apply(original, this, args);
      } as typeof original;
    });
    await openAdventure(page, '/?scene=adventure&debug=1');
    await expect(page.locator('#status')).toContainText('Adventure preview · Title');
    for (let i = 0; i < pickerSteps; i++) {
      await page.keyboard.down('ArrowRight');
      await page.waitForTimeout(100);
      await page.keyboard.up('ArrowRight');
      await page.waitForTimeout(50);
    }
    await page.keyboard.press('Space');
    await expect(page.locator('#status')).toContainText('Playing');
    await expect(page.locator('canvas')).toHaveAttribute('data-biome-atlas', new RegExp(`/assets/${biome}/environment.png$`));
    const position = async (): Promise<number> => Number((await page.locator('#status').innerText()).match(/X (\d+)/)?.[1] ?? 0);
    const velocity = async (): Promise<number> => Number((await page.locator('#status').innerText()).match(/V (-?\d+)/)?.[1] ?? 0);
    await page.keyboard.down('ArrowRight');
    await expect.poll(position, { intervals: [20], timeout: 10000 }).toBeGreaterThan(420);
    if (biome === 'frost') {
      await page.keyboard.up('ArrowRight');
      await page.waitForTimeout(120);
      expect(await velocity()).toBeGreaterThan(80);
    } else {
      expect(await velocity()).toBe(176);
      await expect.poll(position, { intervals: [20], timeout: 10000 }).toBeGreaterThan(1000);
      expect(await velocity()).toBe(143);
      await page.keyboard.up('ArrowRight');
    }
    await page.keyboard.press('Escape');
    await expect(page.locator('#status')).toContainText('Paused');
    const frozen = await page.locator('canvas').getAttribute('data-creature-y');
    await page.waitForTimeout(200);
    expect(await page.locator('canvas').getAttribute('data-creature-y')).toBe(frozen);
    const screenshot = info.outputPath(`${biome}-material.png`);
    await page.locator('canvas').screenshot({ path: screenshot });
    await info.attach(`${biome}-material`, { path: screenshot, contentType: 'image/png' });
    await page.keyboard.press('Escape');
    await page.keyboard.down('ArrowRight');
    await expect(page.locator('#status')).toContainText('Finish', { timeout: 85000 });
    await page.keyboard.up('ArrowRight');
    await expect(page.locator('#status')).toContainText(/Gems [1-9]\d*/);
    await page.waitForTimeout(60);
    await page.keyboard.press('Space');
    await expect(page.locator('#status')).toContainText('Playing');
    expect(await position()).toBe(60);
    await expect(page.locator('canvas')).toHaveAttribute('data-biome-atlas', new RegExp(`/assets/${biome}/environment.png$`));
  });

  test(`${biome} atlas failure is recoverable through retry`, async ({ page }) => {
    const path = `**/assets/${biome}/environment.png`;
    await page.route(path, (route) => route.abort());
    await openAdventure(page, '/?scene=adventure');
    await expect(page.locator('#status')).toHaveText('Artwork could not load. Reload to retry.');
    await page.unroute(path);
    await retryAndDismiss(page);
    await expect(page.locator('#status')).toContainText('Adventure preview · Title');
  });
}

test('movement preview shows distinct friction cues and remains controllable', async ({ page }, info) => {
  await page.goto('/?scene=movement');
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
  await expect.poll(() => page.evaluate(() => {
    const canvas = document.querySelector('canvas')!;
    const ctx = canvas.getContext('2d')!;
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let cyan = 0;
    let ochre = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      if (pixels[i] === 128 && pixels[i + 1] === 219 && pixels[i + 2] === 234) cyan++;
      if (pixels[i] === 214 && pixels[i + 1] === 172 && pixels[i + 2] === 99) ochre++;
    }
    return cyan > 10 && ochre > 10;
  })).toBe(true);
  const before = await canvas.screenshot();
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(700);
  await page.keyboard.up('ArrowRight');
  expect((await canvas.screenshot()).equals(before)).toBe(false);
  await page.goto('/?scene=movement');
  await page.waitForTimeout(300);
  await canvas.screenshot({ path: info.outputPath('surface-friction.png') });
});

test('native HUD hints follow active input and pause controls fit small windows', async ({ page }, info) => {
  await page.setViewportSize({ width: 426, height: 240 });
  await page.addInitScript(() => {
    const buttons = Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 }));
    const pad = { connected: true, mapping: 'standard', axes: [0, 0], buttons };
    Object.defineProperty(navigator, 'getGamepads', { value: () => pad.connected ? [pad] : [] });
    (window as unknown as { clarityPad: typeof pad }).clarityPad = pad;
    const original = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (text, x, y, maxWidth) {
      if (text.startsWith('GEMS ')) this.canvas.dataset.frameText = '';
      this.canvas.dataset.frameText = (this.canvas.dataset.frameText ?? '') + text + '|';
      if (maxWidth === undefined) original.call(this, text, x, y);
      else original.call(this, text, x, y, maxWidth);
    };
  });
  await openAdventure(page, '/?scene=adventure');
  await expect(page.locator('#status')).toContainText('Title');
  await page.keyboard.press('Space');
  const canvas = page.locator('canvas');
  await expect(canvas).toHaveAttribute('data-frame-text', /Arrows \/ A-D: move/);
  await info.attach('native-keyboard-hud', { body: await canvas.screenshot(), contentType: 'image/png' });
  await page.evaluate(() => { (window as unknown as { clarityPad: { axes: number[] } }).clarityPad.axes[0] = 1; });
  await expect(canvas).toHaveAttribute('data-frame-text', /Face button: jump/);
  await page.evaluate(() => {
    const pad = (window as unknown as { clarityPad: { axes: number[]; buttons: { pressed: boolean }[] } }).clarityPad;
    pad.axes[0] = 0; pad.buttons[9].pressed = true;
  });
  await expect(page.locator('#status')).toContainText('Paused');
  await expect(canvas).toHaveAttribute('data-frame-text', /Stick \/ D-pad: move.*Face button: jump.*Start: resume/);
  await info.attach('native-controller-pause', { body: await canvas.screenshot(), contentType: 'image/png' });
  await page.evaluate(() => {
    (window as unknown as { clarityPad: { connected: boolean } }).clarityPad.connected = false;
    window.dispatchEvent(new Event('gamepaddisconnected'));
  });
  await expect(canvas).toHaveAttribute('data-frame-text', /Arrows \/ A-D: move.*Space: jump.*Escape: resume/);
  await page.keyboard.press('Escape');
  await expect(page.locator('#status')).toContainText('Playing');
  await expect(canvas).toHaveAttribute('data-frame-text', /Space: jump/);
  await expect(canvas).not.toHaveAttribute('data-frame-text', /checkpoint-|quarry-checkpoint/);
  await page.keyboard.press('Space');
  await expect(canvas).not.toHaveAttribute('data-frame-text', /Space: jump/);
  await page.setViewportSize({ width: 360, height: 240 });
  await page.keyboard.press('Escape');
  await info.attach('small-keyboard-pause', { body: await page.screenshot(), contentType: 'image/png' });
});

for (const viewport of [
  { width: 1366, height: 768 },
  { width: 426, height: 240 },
  { width: 320, height: 240 },
]) {
  test(`approved title artwork and menu fit ${viewport.width}x${viewport.height}`, async ({ page }, info) => {
    await page.setViewportSize(viewport);
    await observeTitleSelection(page);
    await page.addInitScript(() => {
      const draw = CanvasRenderingContext2D.prototype.drawImage;
      CanvasRenderingContext2D.prototype.drawImage = function (image: CanvasImageSource, ...coordinates: number[]) {
        if (image instanceof HTMLImageElement && image.src.endsWith('/assets/title/tiny-turbo-trails-v2.png')) {
          this.canvas.dataset.titleArtwork = JSON.stringify({
            rect: coordinates, smoothing: this.imageSmoothingEnabled,
            width: image.naturalWidth, height: image.naturalHeight,
          });
        }
        return Reflect.apply(draw, this, [image, ...coordinates]);
      };
    });
    await openAdventure(page, '/?scene=adventure');
    await expect(page.locator('#status')).toContainText('Adventure preview · Title');
    const canvas = page.locator('canvas');
    await expect(canvas).toHaveAttribute('data-title-artwork');
    const artwork = JSON.parse((await canvas.getAttribute('data-title-artwork'))!);
    expect(artwork.smoothing).toBe(false);
    expect(artwork.rect).toEqual([8, 0, 94, 94 * 926 / 1699]);
    expect(artwork.rect[1] + artwork.rect[3]).toBeLessThan(160);
    const box = (await canvas.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
    expect(box.y + 217 * box.height / 240).toBeLessThanOrEqual(viewport.height);
    await selectNextLevel(page, 'QUARRY RUN');
    await info.attach('title-screen', {
      body: await page.screenshot({ path: info.outputPath(`map-${info.project.name}-${viewport.width}x${viewport.height}.png`) }),
      contentType: 'image/png',
    });
    await canvas.evaluate((element) => delete element.dataset.titleArtwork);
    await page.keyboard.press('Space');
    await expect(page.locator('#status')).toContainText('Adventure preview · Playing');
    await canvas.evaluate((element) => delete element.dataset.titleArtwork);
    await page.waitForTimeout(100);
    await expect(canvas).not.toHaveAttribute('data-title-artwork');
  });
}

test('title artwork failure recovers through the existing retry flow', async ({ page }) => {
  const path = '**/assets/title/tiny-turbo-trails-v2.png';
  await page.route(path, (route) => route.abort());
  await openAdventure(page, '/?scene=adventure');
  await expect(page.locator('#status')).toHaveText('Artwork could not load. Reload to retry.');
  await expect(page.locator('#retry')).toBeVisible();
  await page.unroute(path);
  await retryAndDismiss(page);
  await expect(page.locator('#status')).toContainText('Adventure preview · Title');
  await expect(page.locator('#retry')).toBeHidden();
});

// Drive the real input boundary and simulation faster without production test hooks.
async function installTrailPilot(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const buttons = Array.from({ length: 17 }, () => ({ pressed: false, value: 0, touched: false }));
    const pad = { connected: true, mapping: 'standard', axes: [0, 0], buttons };
    const pilot = { active: false, lastActive: false, controller: false, dangers: [] as number[], index: 0, lastX: 0, jumpUntil: 0, jumping: false };
    Object.assign(window, { trailPad: pad, trailPilot: pilot });
    Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => pilot.controller ? [pad] : [] });
    let previousTime: number | undefined; let presentationTime = 0;
    const raf = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (callback) => raf((now) => {
      const status = document.querySelector('#status')?.textContent ?? '';
      if (pilot.active) {
        const x = Number(status.match(/X (\d+)/)?.[1] ?? 0);
        if (x < pilot.lastX - 100) pilot.index = Math.max(0, pilot.dangers.findIndex(d => d >= x - 30));
        pilot.lastX = x;
        if (status.includes('Finish')) pilot.active = false;
        else if (pilot.dangers[pilot.index] !== undefined && x >= pilot.dangers[pilot.index] - 65) {
          pilot.jumpUntil = now + 65; pilot.index++;
        }
      }
      const jumping = pilot.active && now < pilot.jumpUntil;
      if (pilot.controller) {
        if (pilot.active) { pad.axes[0] = 1; pad.buttons[0].pressed = jumping; }
        else if (pilot.lastActive) { pad.axes[0] = 0; pad.buttons[0].pressed = false; }
      } else {
        if (pilot.active) window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowRight' }));
        else if (pilot.lastActive) window.dispatchEvent(new KeyboardEvent('keyup', { code: 'ArrowRight' }));
        if (jumping !== pilot.jumping) window.dispatchEvent(new KeyboardEvent(jumping ? 'keydown' : 'keyup', { code: 'Space' }));
      }
      pilot.jumping = jumping;
      pilot.lastActive = pilot.active;
      presentationTime += previousTime === undefined ? 0 : (now - previousTime) * (status.includes('Playing') ? 6 : 1);
      previousTime = now;
      callback(presentationTime);
    });
  });
}

for (const [index, level] of LEVELS.entries()) {
  test(`milestone ${level.name}: pointer selection, full route, return, replay and next`, async ({ page }, info) => {
    test.setTimeout(100_000);
    await installTrailPilot(page);
    await openAdventure(page, '/?debug=1');
    await page.getByRole('button', { name: level.name, exact: true }).click();
    await expect(page.getByRole('button', { name: level.name, exact: true })).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: `Play ${level.name}`, exact: true }).click();
    const traverse = async (): Promise<void> => {
      await page.evaluate(({ dangers, controller }) => {
        const pilot = (window as unknown as { trailPilot: { active: boolean; controller: boolean; dangers: number[]; index: number; lastX: number } }).trailPilot;
        Object.assign(pilot, { active: true, controller, dangers, index: 0, lastX: 0 });
      }, { dangers: dangerXs(level), controller: index % 2 === 1 });
      await expect(page.locator('#status')).toContainText('Finish', { timeout: 35_000 });
      await page.waitForTimeout(100); // neutral input crosses the finish boundary
    };
    const finishAction = async (label: string): Promise<void> => {
      if (index % 3 === 0) { await page.getByRole('button', { name: label, exact: true }).click(); return; }
      const steps = label === 'Replay' ? 0 : label === 'Next trail' ? 1 : index === LEVELS.length - 1 ? 1 : 2;
      const controller = index % 3 === 2;
      await page.evaluate(controller => {
        (window as unknown as { trailPilot: { controller: boolean } }).trailPilot.controller = controller;
      }, controller);
      for (let step = 0; step < steps; step++) {
        if (controller) {
          await page.evaluate(() => { (window as unknown as { trailPad: { buttons: { pressed: boolean }[] } }).trailPad.buttons[15].pressed = true; });
          await page.waitForTimeout(60);
          await page.evaluate(() => { (window as unknown as { trailPad: { buttons: { pressed: boolean }[] } }).trailPad.buttons[15].pressed = false; });
        } else await page.keyboard.press('ArrowRight', { delay: 60 });
        await page.waitForTimeout(60);
      }
      if (controller) {
        await page.evaluate(() => { (window as unknown as { trailPad: { buttons: { pressed: boolean }[] } }).trailPad.buttons[0].pressed = true; });
        await page.waitForTimeout(60);
        await page.evaluate(() => { (window as unknown as { trailPad: { buttons: { pressed: boolean }[] } }).trailPad.buttons[0].pressed = false; });
      } else await page.keyboard.press('Space', { delay: 60 });
    };
    await traverse();
    await info.attach('finish', { body: await page.locator('canvas').screenshot(), contentType: 'image/png' });
    await finishAction('Choose trail');
    await expect(page.getByRole('button', { name: level.name, exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('button', { name: level.name, exact: true })).toHaveAttribute('aria-description', 'Completed this session');
    await info.attach('completed-map', { body: await page.locator('canvas').screenshot(), contentType: 'image/png' });
    // Replay after a second completion checks the browser-visible reset independently of unit state checks.
    await page.getByRole('button', { name: `Play ${level.name}`, exact: true }).click();
    await traverse();
    await finishAction('Replay');
    await expect(page.locator('#status')).toContainText('Playing');
    await expect(page.locator('#status')).toContainText('X 60');
    await traverse();
    if (index < LEVELS.length - 1) {
      await finishAction('Next trail');
      await expect(page.locator('#status')).toContainText('Playing');
      await expect(page.locator('#status')).toContainText('X 60');
    } else await expect(page.getByRole('button', { name: 'Next trail', exact: true })).toHaveCount(0);
    await reloadAndDismiss(page);
    await expect(page.getByRole('button', { name: 'PLAINS', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('button', { name: level.name, exact: true })).toHaveAttribute('aria-description', 'Ready to explore');
  });
}

test('overworld tab focus, controller selection and shared-art retry stay usable', async ({ page }) => {
  await installTrailPilot(page);
  await openAdventure(page, '/');
  await page.getByRole('button', { name: 'SANDY COVE', exact: true }).focus();
  await expect(page.getByRole('button', { name: 'SANDY COVE', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.evaluate(() => {
    const state = window as unknown as { trailPilot: { controller: boolean }; trailPad: { buttons: { pressed: boolean }[] } };
    state.trailPilot.controller = true; state.trailPad.buttons[15].pressed = true;
  });
  await expect(page.getByRole('button', { name: 'PLAINS', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.evaluate(() => {
    const state = window as unknown as { trailPad: { buttons: { pressed: boolean }[] } };
    state.trailPad.buttons[15].pressed = false; state.trailPad.buttons[0].pressed = true;
  });
  await expect(page.locator('#status')).toContainText('Playing');
  await page.route('**/assets/trails/materials.png', route => route.abort());
  await reloadAndDismiss(page);
  await expect(page.locator('#retry')).toBeVisible();
  await page.unroute('**/assets/trails/materials.png');
  await retryAndDismiss(page);
  await expect(page.getByRole('button', { name: 'Play PLAINS', exact: true })).toBeVisible();
});

test('textured flats and slopes keep authored grip above cosmetic materials', async ({ page }, info) => {
  await page.goto('/?scene=foundation');
  await page.addScriptTag({ content: `${RENDERER_SOURCE}\nwindow.drawTerrainTestWorld = ${drawWorld.toString()};` });
  const result = await page.evaluate(async (base) => {
    const manifest = await (await fetch('/assets/plains/manifest.json')).json();
    const atlas = new Image(); atlas.src = `/assets/plains/${manifest.image}`; await atlas.decode();
    const materials = new Image(); materials.src = '/assets/trails/materials.png'; await materials.decode();
    const level = { ...base, entities: [], theme: { ...base.theme, scenery: false, parallax: [] }, surfaces: [
      { x1: 0, x2: 100, y1: 190, y2: 150, friction: 0.6 },
      { x1: 100, x2: 200, y1: 150, y2: 150, friction: 1 },
      { x1: 200, x2: 310, y1: 150, y2: 190, friction: 1.4 },
      { x1: 310, x2: 500, y1: 190, y2: 190, material: 'ice', friction: 0.6 },
    ] };
    const canvas = document.createElement('canvas'); canvas.width = 426; canvas.height = 240;
    const ctx = canvas.getContext('2d')!;
    const render = (window as unknown as { drawTerrainTestWorld: typeof drawWorld }).drawTerrainTestWorld;
    const samples = [];
    for (const x of [0, 0.25, 19.5, 40, 19.5, 0.25, 0]) {
      render(ctx, { atlas, manifest, materials }, level as typeof base, { position: { x, y: 0 } } as Parameters<typeof drawWorld>[3]);
      const pixels = ctx.getImageData(0, 140, 426, 65).data;
      let cyan = 0, ochre = 0, streaks = 0, grains = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        const rgb = `${pixels[i]},${pixels[i + 1]},${pixels[i + 2]}`;
        if (rgb === '128,219,234') cyan++;
        if (rgb === '214,172,99') ochre++;
        if (rgb === '230,255,255') streaks++;
        if (rgb === '114,80,45') grains++;
      }
      samples.push({ cyan, ochre, streaks, grains });
    }
    return { samples, image: canvas.toDataURL() };
  }, PLAINS_LEVEL);
  // At fractional camera offsets each 2x2 grain may contain only one fully opaque pixel.
  for (const sample of result.samples) {
    expect(sample.cyan).toBeGreaterThan(400); expect(sample.ochre).toBeGreaterThan(200);
    expect(sample.streaks).toBeGreaterThan(40); expect(sample.grains).toBeGreaterThan(7);
  }
  await info.attach('textured-grip', { body: Buffer.from(result.image.split(',')[1], 'base64'), contentType: 'image/png' });
});

test('every destination accepts keyboard and standard-controller selection and start', async ({ page }) => {
  await installTrailPilot(page);
  for (const controller of [false, true]) for (const [index, level] of LEVELS.entries()) {
    await openAdventure(page, '/?debug=1');
    await expect(page.getByRole('button', { name: 'PLAINS', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await page.evaluate(controller => { (window as unknown as { trailPilot: { controller: boolean } }).trailPilot.controller = controller; }, controller);
    for (let step = 0; step < index; step++) {
      if (controller) {
        await page.evaluate(() => { (window as unknown as { trailPad: { buttons: { pressed: boolean }[] } }).trailPad.buttons[15].pressed = true; });
        await page.waitForTimeout(60);
        await page.evaluate(() => { (window as unknown as { trailPad: { buttons: { pressed: boolean }[] } }).trailPad.buttons[15].pressed = false; });
      } else await page.keyboard.press('ArrowRight', { delay: 60 });
      await page.waitForTimeout(60);
    }
    await expect(page.getByRole('button', { name: level.name, exact: true })).toHaveAttribute('aria-pressed', 'true');
    if (controller) await page.evaluate(() => { (window as unknown as { trailPad: { buttons: { pressed: boolean }[] } }).trailPad.buttons[0].pressed = true; });
    else await page.keyboard.press('Space', { delay: 60 });
    await expect(page.locator('#status')).toContainText('Playing');
    await expect(page.locator('#status')).toContainText('X 60');
  }
});

// Input-only star pilot: observes the shipped debug position and dispatches the
// same keyboard events as a player. No scene access, teleports or reward writes.
for (const [index, level] of LEVELS.slice(0, 3).entries()) {
  test(`signature ${level.name}: nine-star route, native/small evidence and fresh navigation`, async ({ page }, info) => {
    test.setTimeout(120_000);
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(({ id, dangers }) => {
      const pilot = { active: false, pauseAt: 0, frozen: false, lastX: 0, index: 0, jumpUntil: 0, docked: false, rode: false, time: 0 };
      Object.assign(window, { starPilot: pilot });
      const originalText = CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText = function (text, x, y, maxWidth) {
        if (text.startsWith('STARS ')) this.canvas.dataset.stars = text;
        return maxWidth === undefined ? originalText.call(this, text, x, y) : originalText.call(this, text, x, y, maxWidth);
      };
      const raf = requestAnimationFrame.bind(window);
      let last = 0;
      window.requestAnimationFrame = callback => raf(now => {
        if (pilot.frozen) { last = now; callback(pilot.time); return; }
        const status = document.querySelector('#status')?.textContent ?? '';
        const x = Number(status.match(/X (\d+)/)?.[1] ?? 0);
        const y = Number(status.match(/Y (-?\d+)/)?.[1] ?? 0);
        const vx = Number(status.match(/V (-?\d+)/)?.[1] ?? 0);
        let horizontal = 0;
        let jump = false;
        if (pilot.active && status.includes('Playing')) {
          horizontal = 1;
          if (x < pilot.lastX - 100) pilot.index = Math.max(0, dangers.findIndex(d => d >= x - 30));
          pilot.lastX = x;
          if (dangers[pilot.index] !== undefined && x >= dangers[pilot.index] - 65) {
            pilot.jumpUntil = pilot.time + 400; pilot.index++;
          }
          if (id === 'quarry' && x > 2250 && !pilot.docked) {
            const stop = x + Math.sign(vx) * vx ** 2 / 2400;
            horizontal = stop < 2376 ? 1 : stop > 2384 ? -1 : 0;
            if (Math.abs(x - 2380) < 12 && Math.abs(vx) < 15) pilot.docked = true;
          }
          if (id === 'quarry' && pilot.docked && !pilot.rode) {
            horizontal = 0; pilot.jumpUntil = 0;
            if (y + 34 <= 67) pilot.rode = true;
          }
          if (id === 'quarry' && pilot.rode && x < 2650) pilot.jumpUntil = 0;
          jump = pilot.time < pilot.jumpUntil;
          if (pilot.pauseAt && x >= pilot.pauseAt) {
            pilot.frozen = true;
            callback(pilot.time); return;
          }
        }
        if (!pilot.active || status.includes('Finish')) { horizontal = 0; jump = false; }
        for (const [code, down] of [['ArrowRight', horizontal > 0], ['ArrowLeft', horizontal < 0], ['Space', jump]] as const) {
          window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code }));
        }
        // Match the existing input pilot's accelerated wall clock outside the
        // challenge area; the production clock still integrates fixed steps.
        const near = id === 'plains' ? x > 600 && x < 900 : id === 'quarry' ? x > 2200 && x < 2700 : x > 850 && x < 3450;
        pilot.time += Math.min(now - (last || now), 32) * (near ? 1 : 4); last = now;
        callback(pilot.time);
      });
    }, { id: level.id, dangers: dangerXs(level) });
    await openAdventure(page, '/?debug=1');
    await page.getByRole('button', { name: level.name, exact: true }).click();
    await page.getByRole('button', { name: `Play ${level.name}`, exact: true }).click();
    await expect(page.locator('canvas')).toHaveAttribute('data-stars', 'STARS 0/3');
    const stops = index === 0 ? [620, 845] : index === 1 ? [2290, 2490] : [910, 1140, 1710, 3160, 3340];
    const capture = async (name: string): Promise<void> => {
      for (const width of [426, 320]) {
        await page.setViewportSize({ width, height: 240 });
        await page.waitForTimeout(50);
        await page.screenshot({ path: info.outputPath(`${level.id}-${name}-${width}.png`) });
        await info.attach(`${name}-${width}`, { path: info.outputPath(`${level.id}-${name}-${width}.png`), contentType: 'image/png' });
      }
      await page.setViewportSize({ width: 1366, height: 768 });
    };
    for (const x of stops) {
      await page.evaluate(x => {
        const pilot = (window as unknown as { starPilot: { active: boolean; frozen: boolean; pauseAt: number } }).starPilot;
        Object.assign(pilot, { active: true, frozen: false, pauseAt: x });
      }, x);
      await page.waitForFunction(() => (window as unknown as { starPilot: { frozen: boolean } }).starPilot.frozen, undefined, { timeout: 35_000, polling: 100 });
      await capture(`challenge-${stops.indexOf(x) + 1}`);
    }
    await page.evaluate(() => { Object.assign((window as unknown as { starPilot: object }).starPilot, { active: true, frozen: false, pauseAt: 0 }); });
    await expect(page.locator('#status')).toContainText('Finish', { timeout: 75_000 });
    await expect(page.locator('canvas')).toHaveAttribute('data-stars', 'STARS 3/3');
    for (const width of [426, 320]) {
      await page.setViewportSize({ width, height: 240 });
      await page.screenshot({ path: info.outputPath(`${level.id}-finish-${width}.png`) });
      await info.attach(`finish-${width}`, { path: info.outputPath(`${level.id}-finish-${width}.png`), contentType: 'image/png' });
      for (const label of ['Replay', 'Next trail', 'Choose trail']) await expect(page.getByRole('button', { name: label, exact: true })).toBeVisible();
    }
    await page.evaluate(() => { Object.assign((window as unknown as { starPilot: object }).starPilot, { active: false }); });
    await page.getByRole('button', { name: ['Replay', 'Next trail', 'Choose trail'][index], exact: true }).click();
    if (index === 2) await page.getByRole('button', { name: `Play ${level.name}`, exact: true }).click();
    await expect(page.locator('canvas')).toHaveAttribute('data-stars', 'STARS 0/3');
    await reloadAndDismiss(page);
    await page.getByRole('button', { name: 'Play PLAINS', exact: true }).click();
    await expect(page.locator('canvas')).toHaveAttribute('data-stars', 'STARS 0/3');
    expect(errors).toEqual([]);
  });
}

async function dismissOpening(page: Page): Promise<void> {
  await expect(page.locator('#status')).not.toContainText('Loading artwork', { timeout: 15000 });
  const skip = page.getByRole('button', { name: 'Skip story', exact: true });
  if ((await page.locator('#status').innerText()).includes('Story')) {
    await expect(skip).toBeVisible();
    await skip.click();
    await expect(page.locator('#status')).toContainText('Title');
    await page.evaluate(() => new Promise<void>(resolve => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    })); // sample release even when rendering is deliberately delayed
  }
}
async function openAdventure(page: Page, url: string): Promise<void> {
  await page.goto(url); await dismissOpening(page);
}
async function reloadAndDismiss(page: Page): Promise<void> {
  await page.reload(); await dismissOpening(page);
}

async function retryAndDismiss(page: Page): Promise<void> {
  // Retry reloads the document. Wait for that navigation before inspecting status,
  // otherwise the old error page can be mistaken for a finished loading screen.
  await Promise.all([page.waitForEvent('load'), page.locator('#retry').click()]);
  await dismissOpening(page);
}

for (const level of LEVELS.slice(3)) {
  test(`${level.id} panorama appears in the map and pans during keyboard play`, async ({ page }, info) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => {
      const original = CanvasRenderingContext2D.prototype.drawImage;
      CanvasRenderingContext2D.prototype.drawImage = function (this: CanvasRenderingContext2D, ...args: unknown[]) {
        const image = args[0];
        if (image instanceof HTMLImageElement && /\/assets\/(site|frost|cove)\/background\.png$/.test(image.src)) {
          this.canvas.dataset.panorama = image.src;
          this.canvas.dataset.panoramaX = String(args[1]);
          this.canvas.dataset.repeatedHills = '0';
        } else if (image instanceof HTMLCanvasElement && image.dataset.panorama) {
          this.canvas.dataset.panorama = image.dataset.panorama;
        } else if (image instanceof HTMLImageElement && /\/assets\/(site|frost|cove)\/environment\.png$/.test(image.src)
          && args[1] === 96 && args[2] === 144 && Number(args[7]) > 48) {
          this.canvas.dataset.repeatedHills = String(Number(this.canvas.dataset.repeatedHills ?? 0) + 1);
        }
        Reflect.apply(original, this, args);
      } as typeof original;
    });
    await openAdventure(page, '/?debug=1');
    await page.getByRole('button', { name: level.name, exact: true }).click();
    const canvas = page.locator('canvas');
    await expect(canvas).toHaveAttribute('data-panorama', new RegExp(`/assets/${level.atlas}/background.png$`));
    await info.attach(`${level.id}-map`, { body: await canvas.screenshot(), contentType: 'image/png' });
    await page.getByRole('button', { name: `Play ${level.name}`, exact: true }).click();
    await expect(page.locator('#status')).toContainText('Playing');
    await expect(canvas).toHaveAttribute('data-panorama-x', '0');
    await page.keyboard.down('ArrowRight');
    await expect.poll(async () => Number(await canvas.getAttribute('data-panorama-x'))).toBeGreaterThan(2);
    await page.keyboard.up('ArrowRight');
    await expect(canvas).toHaveAttribute('data-repeated-hills', '0');
    await info.attach(`${level.id}-background-playing`, { body: await canvas.screenshot(), contentType: 'image/png' });
    expect(errors).toEqual([]);
  });

  test(`${level.id} panorama failure recovers through Retry loading`, async ({ page }) => {
    const path = `**/assets/${level.atlas}/background.png`;
    await page.route(path, route => route.abort());
    await page.goto('/');
    await expect(page.locator('#status')).toHaveText('Artwork could not load. Reload to retry.');
    await page.unroute(path);
    await retryAndDismiss(page);
    await expect(page.getByRole('button', { name: level.name, exact: true })).toBeVisible();
  });
}


test('picture story supports keyboard, pointer and controller without timed pages or repeated retries', async ({ page }, info) => {
  await installTrailPilot(page);
  await page.goto('/?debug=1');
  const canvas = page.locator('canvas');
  await expect(canvas).toHaveAttribute('aria-label', /prepare a picnic/);
  await page.keyboard.press('m');
  await page.keyboard.down('Space');
  await expect(canvas).toHaveAttribute('aria-label', /Rain has broken/);
  await page.waitForTimeout(500);
  await expect(canvas).toHaveAttribute('aria-label', /Rain has broken/);
  await page.keyboard.up('Space');
  await page.getByRole('button', { name: 'Previous picture' }).click();
  await expect(canvas).toHaveAttribute('aria-label', /prepare a picnic/);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Skip story' })).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Previous picture' })).toBeVisible();
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await page.evaluate(() => {
    const state = window as unknown as { trailPilot: { controller: boolean }; trailPad: { buttons: { pressed: boolean }[] } };
    state.trailPilot.controller = true; state.trailPad.buttons[15].pressed = true;
  });
  await expect(page.getByRole('button', { name: 'Next picture' })).toHaveAttribute('aria-pressed', 'true');
  await page.evaluate(() => {
    const pad = (window as unknown as { trailPad: { buttons: { pressed: boolean }[] } }).trailPad;
    pad.buttons[15].pressed = false; pad.buttons[0].pressed = true;
  });
  await expect(canvas).toHaveAttribute('aria-label', /Rain has broken/);
  await page.evaluate(() => { (window as unknown as { trailPad: { buttons: { pressed: boolean }[] } }).trailPad.buttons[0].pressed = false; });
  await page.getByRole('button', { name: 'Skip story' }).click();
  await expect(page.getByRole('button', { name: 'Play PLAINS' })).toBeVisible();
  await page.evaluate(() => { (window as unknown as { trailPad: { buttons: { pressed: boolean }[] } }).trailPad.buttons[8].pressed = true; });
  await expect(canvas).toHaveAttribute('aria-label', /prepare a picnic/);
  await page.evaluate(() => { (window as unknown as { trailPad: { buttons: { pressed: boolean }[] } }).trailPad.buttons[8].pressed = false; });
  await page.getByRole('button', { name: 'Skip story' }).click();
  await page.getByRole('button', { name: 'Replay story', exact: true }).focus();
  await page.keyboard.down('Space');
  await expect(canvas).toHaveAttribute('aria-label', /prepare a picnic/);
  await page.waitForTimeout(200);
  await expect(canvas).toHaveAttribute('aria-label', /prepare a picnic/);
  await page.keyboard.up('Space');
  await page.getByRole('button', { name: 'Skip story' }).click();
  await page.getByRole('button', { name: 'Play PLAINS' }).click();
  await expect(page.locator('#status')).toContainText('Playing');
  await info.attach('visual-goal', { body: await canvas.screenshot(), contentType: 'image/png' });
});

test('celebration freezes for pause and focus, then accepts finish actions during playback', async ({ page }, info) => {
  test.setTimeout(60_000);
  await installTrailPilot(page);
  await page.addInitScript(() => {
    const draw = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = function (this: CanvasRenderingContext2D, ...args: unknown[]) {
      Reflect.apply(draw, this, args);
      const values = args as unknown as (number | HTMLImageElement)[];
      if (values[0] instanceof HTMLImageElement && values[0].src.endsWith('/henry-celebration.png') &&
          values.length === 9 && Number(values[2]) >= 192 && Number(values[5]) === 256) {
        const pose = 16 + (Number(values[2]) - 192) / 48 * 4 + Number(values[1]) / 48;
        this.canvas.dataset.celebrationPose = String(pose);
        if (pose === 18 && !this.canvas.dataset.celebrationPaused) {
          this.canvas.dataset.celebrationPaused = 'yes';
          window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape' }));
          window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Escape' }));
        }
      }
    };
  });
  await openAdventure(page, '/?debug=1');
  await page.getByRole('button', { name: 'Play PLAINS' }).click();
  await page.evaluate(dangers => {
    Object.assign((window as unknown as { trailPilot: object }).trailPilot, { active: true, dangers });
  }, dangerXs(LEVELS[0]));
  await expect(page.locator('#status')).toContainText('Paused', { timeout: 35000 });
  const canvas = page.locator('canvas');
  const pose = await canvas.getAttribute('data-celebration-pose');
  expect(Number(pose)).toBeLessThan(23);
  await page.waitForTimeout(350);
  expect(await canvas.getAttribute('data-celebration-pose')).toBe(pose);
  await page.keyboard.press('Escape');
  await expect(page.locator('#status')).toContainText('Finish');
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await expect(page.locator('#status')).toContainText('Return to the game');
  const focusPose = await canvas.getAttribute('data-celebration-pose');
  expect(Number(focusPose)).toBeLessThan(23);
  await page.waitForTimeout(350);
  expect(await canvas.getAttribute('data-celebration-pose')).toBe(focusPose);
  await expect(page.getByRole('button', { name: 'Replay', exact: true })).toHaveCount(0);
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(page.locator('#status')).toContainText('Finish');
  await expect(page.getByRole('button', { name: 'Replay', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'View reunion picture', exact: true }).focus();
  await page.keyboard.press('Space');
  await expect(canvas).toHaveAttribute('aria-label', /high-five/);
  await page.getByRole('button', { name: 'Return to results', exact: true }).click();
  await expect(page.locator('#status')).toContainText('Finish');
  await page.getByRole('button', { name: 'Replay', exact: true }).click();
  await expect(page.locator('#status')).toContainText('Playing');
  await expect(page.getByRole('button', { name: 'Skip story' })).toHaveCount(0);
  await info.attach('replay-during-celebration', { body: await canvas.screenshot(), contentType: 'image/png' });
});

test('celebration preview preserves gameplay pixels and final pose under reduced motion', async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/?scene=art&animation=celebrate');
  await expect(page.locator('#status')).toContainText('Art preview');
  const same = await page.evaluate(async () => {
    const images = await Promise.all(['starter.png', 'henry-celebration.png'].map(async file => {
      const image = new Image(); image.src = '/assets/henry/' + file; await image.decode(); return image;
    }));
    const canvas = document.createElement('canvas'); canvas.width = 192; canvas.height = 192;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(images[0], 0, 0); const before = ctx.getImageData(0, 0, 192, 192).data;
    ctx.clearRect(0, 0, 192, 192); ctx.drawImage(images[1], 0, 0);
    return ctx.getImageData(0, 0, 192, 192).data.every((value, i) => value === before[i]);
  });
  expect(same).toBe(true);
  const still = await page.locator('canvas').evaluate(c => (c as HTMLCanvasElement).toDataURL());
  await page.waitForTimeout(350);
  expect(await page.locator('canvas').evaluate(c => (c as HTMLCanvasElement).toDataURL())).toBe(still);
  await info.attach('celebration-art-reduced', { body: await page.locator('canvas').screenshot(), contentType: 'image/png' });
});
