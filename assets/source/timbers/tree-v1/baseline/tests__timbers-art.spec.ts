import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { TREETOP_TIMBERS } from '../src/world/treetop-timbers';
import { DEFAULT_MOVEMENT } from '../src/game/movement';
import { timbersPreviewIds } from '../src/world/timbers-terrain';
import { installTimberKeyboardPilot, runTimberStages, TIMBER_ASCENT_RIGHT, TIMBER_TO_MIDDLE,
  TIMBER_SPRING_RETRY, TIMBER_DESCENT_ALL } from './timbers-browser-pilot';

const hash = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const manifest = JSON.parse(readFileSync(new URL('../public/assets/timbers/terrain-kit-v1/manifest.json', import.meta.url), 'utf8'));
const support = (id: string) => {
  const matches = TREETOP_TIMBERS.platforms!.filter(platform => platform.id === id);
  expect(matches).toHaveLength(1); return matches[0];
};

async function installArtObserver(page: Page): Promise<void> {
  await page.addInitScript(() => {
    type Draw = { source: string; x: number; y: number; width: number; height: number };
    const state = { draws: [] as Draw[], actor: null as null | { feet: { x: number; y: number }; bounds: { left: number; right: number; top: number; bottom: number } }, frameDraws: [] as Draw[], seen: [] as string[] };
    Object.assign(window, { timbersArtProbe: state });
    const fill = CanvasRenderingContext2D.prototype.fillRect, draw = CanvasRenderingContext2D.prototype.drawImage;
    const decoded = new WeakMap<HTMLImageElement, ImageData>();
    CanvasRenderingContext2D.prototype.fillRect = function (x, y, width, height) {
      if (this.canvas.id === 'game' && x === 0 && y === 0 && width === 426 && height === 240) state.draws = [];
      return fill.call(this, x, y, width, height);
    };
    CanvasRenderingContext2D.prototype.drawImage = function (image: CanvasImageSource, ...values: number[]) {
      if (this.canvas.id === 'game' && image instanceof HTMLImageElement) {
        if (image.src.includes('/timbers/terrain-kit-v1/') && values.length === 2) {
          state.draws.push({ source: image.src, x: values[0], y: values[1], width: image.naturalWidth, height: image.naturalHeight });
          if (!state.seen.includes(image.src)) state.seen.push(image.src);
        }
        if (image.src.includes('/henry/henry-celebration.png') && values.length === 8) {
          if (!decoded.has(image)) {
            const canvas = document.createElement('canvas'); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
            const ctx = canvas.getContext('2d')!; draw.call(ctx, image, 0, 0, image.naturalWidth, image.naturalHeight, 0, 0, image.naturalWidth, image.naturalHeight);
            decoded.set(image, ctx.getImageData(0, 0, canvas.width, canvas.height));
          }
          const pixels = decoded.get(image)!;
          const [sx, sy, sw, sh, dx, dy, dw, dh] = values, transform = this.getTransform();
          let left = Infinity, right = -Infinity, top = Infinity, bottom = -Infinity;
          for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
            if (!pixels.data[((sy + y) * pixels.width + sx + x) * 4 + 3]) continue;
            const p = transform.transformPoint({ x: dx + x * dw / sw, y: dy + y * dh / sh });
            const q = transform.transformPoint({ x: dx + (x + 1) * dw / sw, y: dy + (y + 1) * dh / sh });
            left = Math.min(left, p.x, q.x); right = Math.max(right, p.x, q.x); top = Math.min(top, p.y, q.y); bottom = Math.max(bottom, p.y, q.y);
          }
          const feet = transform.transformPoint({ x: dx + 24, y: dy + 44 });
          state.actor = { feet: { x: feet.x, y: feet.y }, bounds: { left, right, top, bottom } };
          state.frameDraws = [...state.draws];
        }
      }
      return draw.apply(this, [image, ...values] as Parameters<typeof draw>);
    };
  });
}

async function capture(page: Page, info: TestInfo, name: string, width: number, supportId?: string) {
  await page.evaluate(() => { (window as unknown as { timberKeyboardPilot: { frozen: boolean } }).timberKeyboardPilot.frozen = true; });
  const sample = await page.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>('#game')!, box = canvas.getBoundingClientRect();
    const probe = (window as unknown as { timbersArtProbe: { actor: { feet: { x: number; y: number }; bounds: { left: number; right: number; top: number; bottom: number } }; frameDraws: { source: string; x: number; y: number; width: number; height: number }[]; seen: string[] } }).timbersArtProbe;
    return { status: document.querySelector('#status')!.textContent!, native: [canvas.width, canvas.height],
      css: { width: box.width, height: box.height }, viewport: [innerWidth, innerHeight], probe,
      png: canvas.toDataURL('image/png') };
  });
  const native = Buffer.from(sample.png.split(',')[1], 'base64');
  const nativePath = info.outputPath(`${name}-native.png`), cssPath = info.outputPath(`${name}-css.png`);
  writeFileSync(nativePath, native); await page.locator('#game').screenshot({ path: cssPath });
  await info.attach(`${name}-native`, { path: nativePath, contentType: 'image/png' });
  await info.attach(`${name}-css`, { path: cssPath, contentType: 'image/png' });
  const { png: _png, ...metadata } = sample;
  const metaPath = info.outputPath(`${name}.json`);
  writeFileSync(metaPath, JSON.stringify({ ...metadata, nativeSha256: hash(native), cssSha256: hash(readFileSync(cssPath)) }, null, 2));
  await info.attach(`${name}-metadata`, { path: metaPath, contentType: 'application/json' });
  expect(sample.native).toEqual([426, 240]); expect(sample.css.width).toBe(width);
  if (supportId) expect(Number(sample.status.match(/Y (-?\d+)/)![1]) + DEFAULT_MOVEMENT.height).toBe(support(supportId).from.y);
  await page.evaluate(() => { (window as unknown as { timberKeyboardPilot: { frozen: boolean } }).timberKeyboardPilot.frozen = false; });
  return metadata;
}

for (const width of [426, 320]) test(`Timbers illustrated preview input journey and actual silhouette clearance at ${width}px`, async ({ page, browser }, info) => {
  test.setTimeout(180_000);
  const errors: string[] = [], responses: { path: string; status: number; sha256?: string; buildSha256?: string; error?: string }[] = [], pending: Promise<void>[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => {
    if (!response.url().includes('/assets/timbers/terrain-kit-v1/')) return;
    pending.push((async () => {
      const path = new URL(response.url()).pathname;
      const entry: typeof responses[number] = { path, status: response.status() }; responses.push(entry);
      try { entry.sha256 = hash(await response.body()); entry.buildSha256 = hash(readFileSync(new URL(`../dist${path}`, import.meta.url))); }
      catch (error) { entry.error = String(error); }
    })());
  });
  await page.setViewportSize({ width, height: width === 426 ? 300 : 240 });
  await installTimberKeyboardPilot(page); await installArtObserver(page);
  const start = async () => {
    await page.goto('/?scene=adventure&debug=1');
    await page.getByRole('button', { name: 'TREETOP TIMBERS', exact: true }).click();
    await page.getByRole('button', { name: 'Play TREETOP TIMBERS', exact: true }).click();
    await expect(page.locator('#status')).toContainText('X 100 Y 1046');
  };
  const histories: { name: string; result: object }[] = [];
  const route = async (name: string, stages: Parameters<typeof runTimberStages>[1]) => {
    const result = await runTimberStages(page, stages); histories.push({ name, result });
    expect(result, name).toMatchObject({ done: true, error: '' });
  };
  try {
    await start(); await capture(page, info, 'roots', width);
    await route('middle', TIMBER_TO_MIDDLE); await capture(page, info, 'middle', width, 'timber-middle');
    await route('under-spring', [{ kind: 'walk', x: 100 }]);
    const under = await capture(page, info, 'under-spring', width, 'timber-middle');
    const actor = under.probe.actor, worldX = Number(under.status.match(/X (-?\d+)/)![1]);
    const camera = { x: worldX - actor.feet.x, y: support('timber-middle').from.y - actor.feet.y };
    const spring = support('timber-spring');
    const springDraws = under.probe.frameDraws.filter(draw => draw.width === spring.width
      && Math.abs(draw.x - (spring.from.x - camera.x)) < 1 && Math.abs(draw.y - (spring.from.y - camera.y)) < 1);
    expect(springDraws).toHaveLength(1);
    expect(actor.bounds.top - springDraws[0].y - springDraws[0].height).toBeGreaterThanOrEqual(2);
    await route('spring-reward', TIMBER_SPRING_RETRY.slice(1, 2)); await capture(page, info, 'spring-reward', width, 'timber-spring-reward');
    await route('spring-catch', TIMBER_SPRING_RETRY.slice(2, 4));
    const caught = await capture(page, info, 'spring-catch', width, 'timber-spring-catch');
    const catchCameraX = Number(caught.status.match(/X (-?\d+)/)![1]) - caught.probe.actor.feet.x;
    const reward = support('timber-spring-reward');
    expect(caught.probe.actor.bounds.left + catchCameraX).toBeGreaterThan(reward.from.x + reward.width);
    await route('spring-repeat', TIMBER_SPRING_RETRY.slice(4)); await capture(page, info, 'spring-repeat', width, 'timber-spring-reward');
    await start(); await route('full-ascent', TIMBER_ASCENT_RIGHT);
    await page.getByRole('button', { name: 'Build your word', exact: true }).click();
    await page.getByRole('button', { name: 'Find more letters', exact: true }).click();
    await route('middle-edge', TIMBER_DESCENT_ALL.slice(0, 14)); await capture(page, info, 'return-middle-edge', width, 'timber-middle');
    await route('return720', TIMBER_DESCENT_ALL.slice(14, 15)); await capture(page, info, 'return720', width, 'timber-return-720');
    await route('return780', TIMBER_DESCENT_ALL.slice(15, 16)); await capture(page, info, 'return780', width, 'timber-return-780');
    await route('returned-roots', TIMBER_DESCENT_ALL.slice(16)); await capture(page, info, 'returned-roots', width);
    await expect(page.locator('#status')).toContainText('Letter bag: 4/4');
    await Promise.all(pending);
    for (const file of new Set(['manifest.json', 'ground.png', ...timbersPreviewIds().map(id => manifest.platforms[id].image)])) {
      const delivered = responses.filter(response => response.path.endsWith('/' + file) && response.status === 200 && response.sha256);
      expect(delivered.length, String(file)).toBeGreaterThan(0);
      for (const response of delivered) expect(response.sha256).toBe(response.buildSha256);
    }
    expect(errors).toEqual([]);
  } finally {
    await Promise.all(pending);
    const path = info.outputPath('journey.json');
    const files = ['src/world/renderer.ts', 'src/world/assets.ts', 'src/world/timbers-terrain.ts', 'src/world/treetop-timbers.ts',
      'src/game/education.ts', 'dist/index.html', 'assets/source/timbers/illustrated-v1/preparation.json'];
    writeFileSync(path, JSON.stringify({ sourceRevision: process.env.BROWSER_REPORT_SOURCE_SHA ?? null,
      browser: browser.browserType().name(), version: browser.version(), width, errors, responses, histories,
      files: Object.fromEntries(files.map(file => [file, hash(readFileSync(new URL(`../${file}`, import.meta.url)))])) }, null, 2));
    await info.attach('journey', { path, contentType: 'application/json' });
  }
});

for (const file of ['manifest.json', 'ground.png', 'branch-580.png']) test(`Timbers required ${file} fails visibly and recovers with ordinary Retry`, async ({ page }, info) => {
  let fail = true;
  await page.route(`**/assets/timbers/terrain-kit-v1/${file}`, route => fail ? route.fulfill({ status: 503, body: 'intentional required-resource test' }) : route.continue());
  await page.goto('/?scene=adventure');
  await expect(page.getByRole('button', { name: 'Retry loading', exact: true })).toBeVisible();
  const failedPath = info.outputPath('required-resource-failed.png'); await page.screenshot({ path: failedPath });
  await info.attach('required-resource-failed', { path: failedPath, contentType: 'image/png' });
  fail = false; await page.getByRole('button', { name: 'Retry loading', exact: true }).click();
  await page.getByRole('button', { name: 'TREETOP TIMBERS', exact: true }).click();
  await page.getByRole('button', { name: 'Play TREETOP TIMBERS', exact: true }).click();
  await expect(page.locator('#status')).toContainText('Playing');
  const recoveredPath = info.outputPath('required-resource-recovered.png'); await page.locator('#game').screenshot({ path: recoveredPath });
  await info.attach('required-resource-recovered', { path: recoveredPath, contentType: 'image/png' });
});
