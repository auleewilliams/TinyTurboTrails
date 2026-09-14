import { expect, test } from '@playwright/test';

test('production canvas loads, scales and recovers from focus loss', async ({ page, browser }, info) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('/');
  await expect(page.locator('#status')).toHaveText('Foundation preview · Escape to pause · M to mute');
  const canvas = page.locator('canvas');
  await expect(canvas).toHaveAttribute('width', '426');
  await expect(canvas).toHaveAttribute('height', '240');
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
      for (let y = 0; y < frame.height; y++) for (let x = 0; x < frame.width; x++) {
        const alpha = pixels[(y * frame.width + x) * 4 + 3];
        if (alpha === 0) clear++;
        else opaque++;
        if ((x === 0 || y === 0 || x === frame.width - 1 || y === frame.height - 1) && alpha) edge++;
      }
      return { opaque, clear, edge };
    });
  });
  expect(results).toHaveLength(16);
  for (const result of results) {
    expect(result.opaque).toBeGreaterThan(150);
    expect(result.clear).toBeGreaterThan(500);
    expect(result.edge).toBe(0);
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

test('adventure screen starts and shows a replayable title flow', async ({ page }) => {
  await page.goto('/?scene=adventure');
  await expect(page.locator('#status')).toContainText('Adventure preview', { timeout: 15000 });
  await page.keyboard.press('Space');
  await page.waitForTimeout(80);
  await page.keyboard.press('Escape');
  await expect(page.locator('#status')).toContainText('Paused');
  await page.keyboard.press('Escape');
  await expect(page.locator('canvas')).toHaveAttribute('width', '426');
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

test('adventure can complete the forgiving route and replay from a fresh title', async ({ page }) => {
  await page.goto('/?scene=adventure&debug=1');
  await expect(page.locator('#status')).toContainText('Adventure preview · Title', { timeout: 15000 });
  await page.keyboard.press('Space');
  await expect(page.locator('#status')).toContainText('Adventure preview · Playing', { timeout: 15000 });
  await page.keyboard.down('ArrowRight');
  for (let step = 0; step < 220; step++) {
    const status = await page.locator('#status').innerText();
    if (status.includes('Finish')) break;
    const x = Number(status.match(/X (\d+)/)?.[1] ?? 0);
    if ([430, 920, 1040, 1880].some((obstacle) => Math.abs(obstacle - x) < 100)) {
      await page.keyboard.down('Space');
      await page.waitForTimeout(350);
      await page.keyboard.up('Space');
    }
    await page.waitForTimeout(100);
  }
  await page.keyboard.up('ArrowRight');
  await expect(page.locator('#status')).toContainText('Adventure preview · Finish', { timeout: 5000 });
  await page.keyboard.press('Space');
  await expect(page.locator('#status')).toContainText('Adventure preview · Title', { timeout: 15000 });
});

test('adventure accepts a standard controller Start pause and D-pad movement', async ({ page }) => {
  await page.addInitScript(() => {
    const buttons = Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 }));
    const pad = {
      id: 'browser-smoke-controller', index: 0, connected: true, mapping: 'standard', timestamp: 0,
      axes: [0, 0, 0, 0], buttons, vibrationActuator: null,
    };
    Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => [pad] });
    Object.assign(window, { smokeController: pad });
  });
  await page.goto('/?scene=adventure');
  await expect(page.locator('#status')).toContainText('Adventure preview');
  await page.keyboard.press('Space');
  await page.waitForTimeout(80);
  await page.evaluate(() => {
    const pad = (window as unknown as { smokeController: { axes: number[]; buttons: { pressed: boolean }[] } }).smokeController;
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
