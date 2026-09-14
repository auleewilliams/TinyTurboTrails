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
  await page.reload();
  await expect(page.locator('#status')).toHaveText('Foundation preview · Escape to pause · M to mute');
  expect(errors).toEqual([]);
  await info.attach('browser-version', { body: browser.version(), contentType: 'text/plain' });
  console.log(`${info.project.name}: ${browser.version()}`);
  await page.screenshot({ path: info.outputPath('foundation.png') });
});
