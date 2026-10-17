import { expect, test } from '@playwright/test';
import { LEVELS } from '../src/world/levels';
import { drawSlime } from '../src/world/renderer';
import { writeFile } from 'node:fs/promises';

for (const controller of [false, true]) {
  test(`slime squash through real ${controller ? 'controller' : 'keyboard'} controls leaves a flattened costume`, async ({ page }, info) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(controller => {
      const pad = { connected: true, mapping: 'standard', axes: [0, 0],
        buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })) };
      const pilot = { active: false, jumped: false, jumpFrames: 0, flattened: false, settled: 0 };
      Object.assign(window, { squashPilot: pilot });
      Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => controller ? [pad] : [] });
      const drawImage = CanvasRenderingContext2D.prototype.drawImage;
      CanvasRenderingContext2D.prototype.drawImage = function (this: CanvasRenderingContext2D, ...args: unknown[]) {
        const image = args[0];
        if (this.canvas.id === 'game' && image instanceof HTMLImageElement
          && image.src.endsWith('/assets/slimes/slimes.png') && Number(args[8]) < 47) {
          pilot.flattened = true;
          this.canvas.dataset.squashed = 'true';
        }
        Reflect.apply(drawImage, this, args);
      } as typeof drawImage;
      const raf = requestAnimationFrame.bind(window);
      let time = 0;
      window.requestAnimationFrame = callback => raf(() => {
        const status = document.querySelector('#status')?.textContent ?? '';
        if (pilot.active && status.includes('Playing')) {
          const x = Number(status.match(/X (\d+)/)?.[1] ?? 0);
          if (!pilot.jumped && x >= 200) { pilot.jumped = true; pilot.jumpFrames = 8; }
          const moving = !pilot.flattened;
          const jumping = pilot.jumpFrames-- > 0;
          if (controller) { pad.axes[0] = moving ? 1 : 0; pad.buttons[0].pressed = jumping; }
          else {
            window.dispatchEvent(new KeyboardEvent(moving ? 'keydown' : 'keyup', { code: 'ArrowRight' }));
            window.dispatchEvent(new KeyboardEvent(jumping ? 'keydown' : 'keyup', { code: 'Space' }));
          }
          if (pilot.flattened) pilot.settled++;
        }
        // Drive the real input/clock boundary, never scene or entity state.
        if (pilot.settled < 40) time += 1000 / 60;
        callback(time);
      });
    }, controller);
    await page.goto('/?debug=1');
    await page.getByRole('button', { name: 'Skip story', exact: true }).click();
    await page.getByRole('button', { name: 'Play PLAINS', exact: true }).click();
    await page.locator('canvas').screenshot({ path: info.outputPath('slime-upright.png') });
    await page.evaluate(() => { (window as unknown as { squashPilot: { active: boolean } }).squashPilot.active = true; });
    await expect(page.locator('canvas')).toHaveAttribute('data-squashed', 'true', { timeout: 15_000 });
    await expect.poll(() => page.evaluate(() => (window as unknown as { squashPilot: { settled: number } }).squashPilot.settled)).toBeGreaterThanOrEqual(40);
    await page.locator('canvas').screenshot({ path: info.outputPath('slime-flattened-gameplay.png') });
    await info.attach('flattened-gameplay', { path: info.outputPath('slime-flattened-gameplay.png'), contentType: 'image/png' });
    expect(errors).toEqual([]);
  });
}

test('squish can be auditioned in the existing audio preview', async ({ page }) => {
  await page.goto('/?audio');
  await expect(page.getByRole('button', { name: 'squash', exact: true })).toBeVisible({ timeout: 1000 });
  await page.getByRole('button', { name: 'squash', exact: true }).click();
});

test('all six upright and flattened costumes retain their accessory pixels and ground anchor', async ({ page }, info) => {
  await page.goto('/?scene=foundation');
  await page.addScriptTag({ content: `window.drawSquashCostume = ${drawSlime.toString()};` });
  const result = await page.evaluate(async levels => {
    const atlas = new Image(); atlas.src = '/assets/slimes/slimes.png'; await atlas.decode();
    const canvas = document.createElement('canvas'); canvas.width = 426; canvas.height = 240;
    const ctx = canvas.getContext('2d')!; ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#17333b'; ctx.fillRect(0, 0, 426, 240);
    const draw = (window as unknown as { drawSquashCostume: typeof drawSlime }).drawSquashCostume;
    const samples: { upright: number[]; flat: number[]; signature: string }[] = [];
    const sample = document.createElement('canvas'); sample.width = 70; sample.height = 64;
    const ink = sample.getContext('2d')!; ink.imageSmoothingEnabled = false;
    const bounds = () => {
      const pixels = ink.getImageData(0, 0, 70, 64).data;
      let left = 70, right = 0, top = 64, bottom = 0;
      for (let y = 0; y < 64; y++) for (let x = 0; x < 70; x++) if (pixels[(y * 70 + x) * 4 + 3]) {
        left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
      }
      return [right - left + 1, bottom - top + 1, bottom];
    };
    for (const [index, level] of levels.entries()) {
      const x = 36 + index * 70;
      ctx.fillStyle = '#ffda75'; ctx.font = '9px monospace'; ctx.fillText(level.id, x - 25, 25);
      draw(ctx, atlas, level.theme.slimeAccessory!, x, 90);
      draw(ctx, atlas, level.theme.slimeAccessory!, x, 145, 0.5);
      draw(ctx, atlas, level.theme.slimeAccessory!, x, 200, 1);
      ink.clearRect(0, 0, 70, 64); draw(ink, atlas, level.theme.slimeAccessory!, 35, 54);
      const upright = bounds();
      ink.clearRect(0, 0, 70, 64); draw(ink, atlas, level.theme.slimeAccessory!, 35, 54, 1);
      samples.push({ upright, flat: bounds(), signature: sample.toDataURL() });
    }
    return { image: canvas.toDataURL(), samples };
  }, LEVELS);
  for (const { upright, flat } of result.samples) {
    expect(flat[0]).toBeGreaterThanOrEqual(upright[0]);
    expect(flat[1]).toBeGreaterThan(upright[1] * 0.25);
    expect(flat[1]).toBeLessThan(upright[1] * 0.55);
    expect(Math.abs(flat[2] - upright[2])).toBeLessThanOrEqual(1);
  }
  expect(new Set(result.samples.map(sample => sample.signature)).size).toBe(6);
  const buffer = Buffer.from(result.image.split(',')[1], 'base64');
  await writeFile(info.outputPath('all-costumes.png'), buffer);
  await info.attach('all-costumes', { body: buffer, contentType: 'image/png' });
});
