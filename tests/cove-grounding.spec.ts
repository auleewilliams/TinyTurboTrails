import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { SANDY_COVE } from '../src/world/sandy-cove';
import { startCove, driveCove, observeCove } from './cove-browser-pilot';
import { COVE_LOWER, COVE_RETURN } from './cove-pilot';

const manifest = JSON.parse(readFileSync(new URL('../public/assets/cove/manifest.json', import.meta.url), 'utf8'));
const decorations = SANDY_COVE.entities.filter(e => e.kind === 'decoration');

for (const width of [426, 320]) test(`Cove grounded scenery uses actual forward and reverse input at ${width}px`, async ({ page, browser }, info) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width, height: width === 426 ? 300 : 240 });
  const evidence = observeCove(page, info);
  await page.addInitScript(({ decorations, manifest }) => {
    const probe = { phase: 'forward', frame: [] as { id: string; dx: number; dy: number; width: number; height: number }[], ordinal: 0,
      captures: [] as { id: string; phase: string; status: string; png: string; draw: object; css: object; backing: number[] }[] };
    Object.assign(window, { coveGrounding: probe });
    const fill = CanvasRenderingContext2D.prototype.fillRect;
    CanvasRenderingContext2D.prototype.fillRect = function (x, y, w, h) {
      if (this.canvas.id === 'game' && x === 0 && y === 0 && w === 426 && h === 240) { probe.ordinal = 0; probe.frame = []; }
      fill.call(this, x, y, w, h);
    };
    const draw = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = function (this: CanvasRenderingContext2D, ...args: Parameters<typeof draw>) {
      const [image, sx, sy, sw, sh, dx, dy, dw, dh] = args;
      if (this.canvas.id === 'game' && image instanceof HTMLImageElement && image.src.endsWith('/assets/cove/environment.png') && sw === 48 && sh === 48 && dw === 48 && dh === 48) {
        const cell = sy / 48 * 4 + sx / 48;
        if (cell === manifest.assets.tree || cell === manifest.assets.stone) {
          const entity = decorations[probe.ordinal++];
          if (entity && cell === manifest.assets[entity.asset]) probe.frame.push({ id: entity.id, dx, dy, width: dw, height: dh });
        }
      }
      Reflect.apply(draw, this, args);
    } as typeof draw;
    const raf = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = callback => raf(now => {
      callback(now); // Observe only AFTER the actual scene, Henry and HUD have painted.
      const canvas = document.querySelector<HTMLCanvasElement>('#game'), status = document.querySelector('#status')?.textContent ?? '';
      if (!canvas || !status.includes('Playing')) return;
      const velocity = Number(status.match(/V (-?\d+)/)?.[1] ?? 0);
      if (probe.phase === 'forward' ? velocity <= 20 : velocity >= -20) return;
      for (const item of probe.frame) if (item.dx >= 0 && item.dx + item.width <= 426 && item.dy >= 0 && item.dy + item.height <= 240
        && !probe.captures.some(c => c.id === item.id && c.phase === probe.phase)) {
        const rect = canvas.getBoundingClientRect();
        probe.captures.push({ id: item.id, phase: probe.phase, status, draw: item, png: canvas.toDataURL(),
          css: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }, backing: [canvas.width, canvas.height] });
      }
    });
  }, { decorations, manifest });
  await startCove(page);
  await driveCove(page, COVE_LOWER);
  await expect(page.locator('#status')).toContainText('Finish');
  await evidence.paint('grounding-forward-finish-css');
  await page.getByRole('button', { name: 'Build your word', exact: true }).click();
  await page.getByRole('button', { name: 'Find more letters', exact: true }).click();
  await expect(page.locator('#status')).toContainText('X 4030 Y 166 V 0');
  await page.evaluate(() => { (window as unknown as { coveGrounding: { phase: string } }).coveGrounding.phase = 'reverse'; });
  await driveCove(page, COVE_RETURN);
  await evidence.paint('grounding-reverse-dune-css');
  const captures = await page.evaluate(() => (window as unknown as { coveGrounding: { captures: { id: string; phase: string; status: string; png: string; draw: object; css: { width: number }; backing: number[] }[] } }).coveGrounding.captures);
  for (const phase of ['forward', 'reverse']) expect(captures.filter(c => c.phase === phase).map(c => c.id).sort()).toEqual(decorations.map(e => e.id).sort());
  for (const c of captures) {
    expect(c.backing).toEqual([426, 240]); expect(c.css.width).toBeCloseTo(width, 1);
    await info.attach(`${c.phase}-${c.id}-actual-native-frame`, { body: Buffer.from(c.png.split(',')[1], 'base64'), contentType: 'image/png' });
  }
  await info.attach('grounding-observed-source-draws-and-spaces', { body: JSON.stringify(captures.map(({ png: _png, ...c }) => c)), contentType: 'application/json' });
  await evidence.finish(browser.version());
});
