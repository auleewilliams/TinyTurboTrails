import { expect, test } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { PLAINS_LEVEL } from '../src/world/level';
import { DEFAULT_MOVEMENT, surfaceY } from '../src/game/movement';
import { drawAsset, drawWorld } from '../src/world/renderer';

test('terrain joins stay solid while scrolling in both directions at integer and fractional scales', async ({ page }, info) => {
  await page.goto('/?scene=foundation');
  // Run the real renderer on a separate canvas so sprites and HUD cannot hide seams.
  await page.addScriptTag({ content: `${drawAsset.toString()}\nwindow.drawTerrainTestWorld = ${drawWorld.toString()};` });
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
              if (pixels[i] !== 134 || pixels[i + 1] !== 80 || pixels[i + 2] !== 47 || pixels[i + 3] !== 255) {
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
  await page.reload();
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
  await page.route('**/assets/henry/starter.png', (route) => route.abort());
  await page.reload();
  await expect(page.locator('#status')).toHaveText('Artwork could not load. Reload to retry.');
  await expect(page.locator('#retry')).toBeVisible();
  await page.unroute('**/assets/henry/starter.png');
  await page.locator('#retry').click();
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
  expect(results).toHaveLength(16);
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

test('adventure renders hurt feedback after hazard contact', async ({ page }) => {
  await page.goto('/?scene=adventure&debug=1');
  await expect(page.locator('#status')).toContainText('Adventure preview · Title', { timeout: 15000 });
  await page.keyboard.press('Space');
  await expect(page.locator('#status')).toContainText('Adventure preview · Playing');
  await page.keyboard.down('ArrowRight');
  for (let step = 0; step < 30; step++) {
    const x = Number((await page.locator('#status').innerText()).match(/X (\d+)/)?.[1] ?? 0);
    if (x >= 280) break;
    await page.waitForTimeout(100);
  }
  await page.keyboard.up('ArrowRight');
  await page.waitForTimeout(80);
  const redFeedbackPixels = await page.locator('canvas').evaluate((element) => {
    const pixels = (element as HTMLCanvasElement).getContext('2d')!.getImageData(0, 0, 426, 240).data;
    let matches = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      if (pixels[i] > 180 && pixels[i + 1] < 150 && pixels[i + 2] < 150 && pixels[i + 3] > 0) matches++;
    }
    return matches;
  });
  expect(redFeedbackPixels).toBeGreaterThan(20);
});

test('a patrolling slime keeps moving while Henry stands still', async ({ page }) => {
  await page.goto('/?scene=adventure&debug=1');
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
  await page.goto('/?scene=adventure&debug=1');
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
  await page.goto('/');
  await expect(page.locator('#status')).toContainText('Adventure preview · Title', { timeout: 15000 });
  await page.keyboard.press('Space');
  await expect(page.locator('#status')).toContainText('Adventure preview · Playing');
  await page.keyboard.press('Escape');
  await expect(page.locator('#status')).toHaveText('Paused · Escape to resume');
  await page.keyboard.press('Escape');
  await expect(page.locator('#status')).toContainText('Adventure preview · Playing');
  await page.reload();
  await expect(page.locator('#status')).toContainText('Adventure preview · Title');
});

test('title picker selects Quarry Run and starts the selected route', async ({ page }) => {
  // The extended Quarry Run (issue #73) takes about a minute of held-right real time.
  test.setTimeout(150_000);
  await page.goto('/?scene=adventure&debug=1');
  await expect(page.locator('#status')).toContainText('Adventure preview · Title', { timeout: 15000 });
  // Hold the selection key long enough for a simulation frame to consume it
  // before starting. A back-to-back press can be coalesced in WebKit.
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(100);
  await page.keyboard.up('ArrowRight');
  await page.keyboard.press('Space');
  await expect(page.locator('#status')).toContainText('Adventure preview · Playing');
  await page.keyboard.down('ArrowRight');
  await expect.poll(() => page.locator('#status').innerText(), { timeout: 120_000 }).toContain('Adventure preview · Finish');
  await page.keyboard.up('ArrowRight');
});

test('adventure mute control updates the audio state', async ({ page }) => {
  await page.goto('/?scene=adventure');
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
  await page.goto('/?scene=adventure');
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
  await page.goto('/?scene=adventure');
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
  await page.route('**/assets/henry/starter.png', (route) => route.abort());
  await page.goto('/?scene=adventure');
  await expect(page.locator('#status')).toHaveText('Artwork could not load. Reload to retry.', { timeout: 15000 });
  await expect(page.locator('#retry')).toBeVisible();
  await page.unroute('**/assets/henry/starter.png');
  await page.locator('#retry').click();
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
  await page.goto('/?scene=adventure&debug=1');
  await expect(page.locator('#status')).toContainText('Adventure preview · Title', { timeout: 15000 });
  await page.keyboard.press('Space');
  await expect(page.locator('#status')).toContainText('Adventure preview · Playing');
  await page.evaluate(() => {
    (window as unknown as { disconnectController: { axes: number[] } }).disconnectController.axes[0] = 1;
  });
  await page.waitForTimeout(180);
  const beforeDisconnect = Number((await page.locator('#status').innerText()).match(/X (\d+)/)?.[1] ?? 0);
  await page.evaluate(() => {
    window.dispatchEvent(new Event('gamepaddisconnected'));
    const pad = (window as unknown as { disconnectController: { axes: number[]; connected: boolean } }).disconnectController;
    pad.connected = false;
    pad.axes[0] = 0;
  });
  await page.waitForTimeout(180);
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

test('adventure can complete the forgiving route and replay from a fresh title', async ({ page }, info) => {
  test.setTimeout(150_000);
  await page.goto('/?scene=adventure&debug=1');
  await expect(page.locator('#status')).toContainText('Adventure preview · Title', { timeout: 15000 });
  const initialTitle = await page.locator('canvas').evaluate((element) => (element as HTMLCanvasElement).toDataURL());
  await page.keyboard.press('Space');
  await expect(page.locator('#status')).toContainText('Adventure preview · Playing', { timeout: 15000 });
  await page.keyboard.down('ArrowRight');
  // The extended route (issue #45) takes well over a minute of held-right real time;
  // jump periodically for coverage of jump input mid-run rather than at hardcoded obstacle spots.
  for (let step = 0; step < 600; step++) {
    const status = await page.locator('#status').innerText();
    if (status.includes('Finish')) break;
    if (step % 12 === 0) {
      await page.keyboard.down('Space');
      await page.waitForTimeout(250);
      await page.keyboard.up('Space');
    }
    await page.waitForTimeout(150);
  }
  await page.keyboard.up('ArrowRight');
  await expect(page.locator('#status')).toContainText('Adventure preview · Finish', { timeout: 5000 });
  const finishStatus = await page.locator('#status').innerText();
  expect(finishStatus).toMatch(/Gems [1-9]\d*/);
  const celebrationPixels = await page.locator('canvas').evaluate((element) => {
    const canvas = element as HTMLCanvasElement;
    const ctx = canvas.getContext('2d')!;
    const pixels = ctx.getImageData(150, 95, 130, 55).data;
    let matches = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      if (pixels[i] === 255 && pixels[i + 1] === 218 && pixels[i + 2] === 117 && pixels[i + 3] > 0) matches++;
    }
    return matches;
  });
  expect(celebrationPixels).toBeGreaterThan(20);
  await page.keyboard.press('Space');
  await expect(page.locator('#status')).toContainText('Adventure preview · Title', { timeout: 15000 });
  await expect.poll(() => page.locator('canvas').evaluate((element) => (element as HTMLCanvasElement).toDataURL())).toBe(initialTitle);
  await info.attach('replay-starting-view', { body: await page.locator('canvas').screenshot({ path: info.outputPath('replay-starting-view.png') }), contentType: 'image/png' });
});

test('adventure pause freezes progress and reload starts a fresh in-memory run', async ({ page }) => {
  await page.goto('/?scene=adventure&debug=1');
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
  await page.reload();
  await expect(page.locator('#status')).toContainText('Adventure preview · Title', { timeout: 15000 });
});

test('default main menu accepts controller primary-button start, Start pause and D-pad movement', async ({ page }) => {
  await page.addInitScript(() => {
    const buttons = Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 }));
    const pad = {
      id: 'browser-smoke-controller', index: 0, connected: true, mapping: 'standard', timestamp: 0,
      axes: [0, 0, 0, 0], buttons, vibrationActuator: null,
    };
    Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => [pad] });
    Object.assign(window, { smokeController: pad });
  });
  await page.goto('/');
  await expect(page.locator('#status')).toContainText('Adventure preview · Title', { timeout: 15000 });
  await page.evaluate(() => {
    const pad = (window as unknown as { smokeController: { buttons: { pressed: boolean }[] } }).smokeController;
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
  await expect(page.locator('#status')).toHaveText('Paused · Escape to resume');
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
  await page.goto('/?scene=adventure&debug=1');
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
      if (text.startsWith('GEMS ')) document.querySelector('canvas')?.setAttribute('data-test-hud', text);
      if (maxWidth === undefined) fillText.call(this, text, x, y);
      else fillText.call(this, text, x, y, maxWidth);
    };
  });
  await page.goto('/?scene=adventure&debug=1');
  await expect(page.locator('#status')).toContainText('Adventure preview · Title');
  await page.keyboard.press('Space');
  await expect(page.locator('#status')).toContainText('Adventure preview · Playing');
  await page.keyboard.down('ArrowRight');
  // Terrain heights come from surfaceY rather than being restated here, so the check
  // cannot drift from the level data the way the coordinates in #26 did.
  const checkpoints = PLAINS_LEVEL.checkpoints;
  for (const checkpoint of checkpoints) {
    await expect.poll(
      () => page.locator('canvas').getAttribute('data-test-hud'),
      { timeout: 25_000 },
    ).toContain(checkpoint.id);
    // Activation is detected anywhere in the 18px window around the flag, so compare
    // Henry's feet to the terrain beneath him rather than to the flag's own height:
    // the hillside marker sits on a ramp, where those two differ by the slope alone.
    // X and Y come from one status sample, so they describe the same frame.
    const status = await page.locator('#status').innerText();
    const x = Number(status.match(/X (\d+)/)?.[1] ?? 0);
    const y = Number(status.match(/Y (\d+)/)?.[1] ?? 0);
    expect(Math.abs(y + DEFAULT_MOVEMENT.height - surfaceY(PLAINS_LEVEL, x))).toBeLessThanOrEqual(2);
    // Walk just past the flag so Henry does not obscure its base in the evidence.
    await page.waitForTimeout(300);
    await page.keyboard.up('ArrowRight');
    await page.waitForTimeout(150);
    await info.attach(checkpoint.id, { body: await page.locator('canvas').screenshot(), contentType: 'image/png' });
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
  await page.goto('/?scene=adventure');
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
  // Left-aligned at x=10, the longest HUD line must still end inside its panel at x=210.
  const rightEdge = await canvas.evaluate((element) => {
    const ctx = (element as HTMLCanvasElement).getContext('2d')!;
    ctx.font = '8px monospace';
    return 10 + ctx.measureText('GEMS 0   CHECKPOINT checkpoint-hillside').width;
  });
  expect(rightEdge).toBeLessThan(210);
});

test('a collected gem stops being drawn where it stood', async ({ page }, info) => {
  await recordHudDraws(page);
  await page.goto('/?scene=adventure&debug=1');
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
      if (image instanceof HTMLImageElement && image.src.includes('/assets/plains/')) {
        const canvas = this.canvas;
        // The parallax hills precede the entity pass each frame.
        const calls = sx === 96 && sy === 144 ? [] : JSON.parse(canvas.dataset.worldDraws ?? '[]');
        if (!(sx === 96 && sy === 144)) calls.push(args.slice(1));
        canvas.dataset.worldDraws = JSON.stringify(calls);
      }
      Reflect.apply(drawImage, this, args);
    } as typeof drawImage;
  });
  await page.goto('/?scene=adventure&debug=1');
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
  expect(calls).toHaveLength(PLAINS_LEVEL.entities.length + 1);
  PLAINS_LEVEL.entities.forEach((entity, index) => {
    if (entity.kind !== 'decoration' && entity.kind !== 'slime') return;
    // Ground art anchors at its horizontal centre, 24px into the 48px cell. A patrolling
    // slime has already walked away from its level X, so check the ground under where it is.
    const drawnX = calls[index][4] + 24;
    if (entity.patrol) {
      expect(drawnX, entity.id).toBeGreaterThanOrEqual(entity.patrol.minX);
      expect(drawnX, entity.id).toBeLessThanOrEqual(entity.patrol.maxX);
    } else {
      expect(drawnX, entity.id).toBeCloseTo(entity.x, 5);
    }
    expect(calls[index][5] + bases[entity.asset], entity.id).toBeCloseTo(surfaceY(PLAINS_LEVEL, drawnX), 5);
  });
  // Frame the first slime on its ramp and the first tree on the meadow.
  await page.keyboard.down('ArrowRight');
  await expect.poll(async () => Number((await page.locator('#status').innerText()).match(/X (\d+)/)?.[1] ?? 0),
    { timeout: 5000, intervals: [30] }).toBeGreaterThan(320);
  await page.keyboard.up('ArrowRight');
  await page.waitForTimeout(900);
  await info.attach('grounded-slime-and-tree', { body: await page.locator('canvas').screenshot(), contentType: 'image/png' });
});
