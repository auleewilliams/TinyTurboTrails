import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { TREETOP_TIMBERS } from '../src/world/treetop-timbers';
import { DEFAULT_MOVEMENT } from '../src/game/movement';
import { timbersPlatformWidths } from '../src/world/timbers-terrain';
import { installTimberKeyboardPilot, runTimberStages, TIMBER_ASCENT_RIGHT, TIMBER_TO_MIDDLE,
  TIMBER_SPRING_RETRY, TIMBER_DESCENT_ALL, TIMBER_LEFT_STARS_ASCENT } from './timbers-browser-pilot';

const hash = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const manifest = JSON.parse(readFileSync(new URL('../public/assets/timbers/terrain-kit-v1/manifest.json', import.meta.url), 'utf8'));
const treeManifest = JSON.parse(readFileSync(new URL('../public/assets/timbers/tree-v1/manifest.json', import.meta.url), 'utf8'));
const support = (id: string) => {
  const matches = TREETOP_TIMBERS.platforms!.filter(platform => platform.id === id);
  expect(matches).toHaveLength(1); return matches[0];
};

async function installArtObserver(page: Page): Promise<void> {
  await page.addInitScript(() => {
    type Draw = { source: string; x: number; y: number; width: number; height: number };
    const state = { mapTreeRenders: 0, draws: [] as Draw[], props: [] as Draw[], frameProps: [] as Draw[], actor: null as null | { feet: { x: number; y: number }; bounds: { left: number; right: number; top: number; bottom: number } }, frameDraws: [] as Draw[], seen: [] as string[] };
    Object.assign(window, { timbersArtProbe: state });
    const fill = CanvasRenderingContext2D.prototype.fillRect, draw = CanvasRenderingContext2D.prototype.drawImage;
    const decoded = new WeakMap<HTMLImageElement, ImageData>();
    CanvasRenderingContext2D.prototype.fillRect = function (x, y, width, height) {
      if (this.canvas.id === 'game' && x === 0 && y === 0 && width === 426 && height === 240) { state.draws = []; state.props = []; }
      return fill.call(this, x, y, width, height);
    };
    CanvasRenderingContext2D.prototype.drawImage = function (image: CanvasImageSource, ...values: number[]) {
      if (image instanceof HTMLImageElement && image.src.endsWith('/timbers/tree-v1/tree.png') && this.canvas.id !== 'game') state.mapTreeRenders++;
      if (this.canvas.id === 'game' && image instanceof HTMLImageElement) {
        if (values.length === 8 && (image.src.endsWith('/plains/scenery/foreground.png') || image.src.endsWith('/slimes/slimes.png'))) {
          state.props.push({ source: image.src, x: values[4], y: values[5], width: values[6], height: values[7] });
        }
        if ((image.src.includes('/timbers/terrain-kit-v1/') || image.src.includes('/timbers/tree-v1/')) && values.length === 2) {
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
          state.frameProps = [...state.props];
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
    const probe = (window as unknown as { timbersArtProbe: { actor: { feet: { x: number; y: number }; bounds: { left: number; right: number; top: number; bottom: number } }; frameDraws: { source: string; x: number; y: number; width: number; height: number }[]; frameProps: { source: string; x: number; y: number; width: number; height: number }[]; seen: string[] } }).timbersArtProbe;
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
  const treeDraws = sample.probe.frameDraws.filter(draw => draw.source.endsWith('/timbers/tree-v1/tree.png'));
  expect(treeDraws).toHaveLength(1);
  expect([treeDraws[0].width, treeDraws[0].height]).toEqual([treeManifest.width, treeManifest.height]);
  expect(sample.probe.frameDraws.indexOf(treeDraws[0])).toBeLessThan(sample.probe.frameDraws.findIndex(draw => draw.source.includes('/timbers/terrain-kit-v1/')));
  if (name === 'roots' || name === 'returned-roots' || name === 'tree-base') expect(treeDraws[0].y + treeManifest.basePlane).toBeCloseTo(sample.probe.actor.feet.y, 5);
  const platformDraws = sample.probe.frameDraws.filter(draw => /\/branch-\d+\.png$/.test(draw.source));
  expect(platformDraws).toHaveLength(44);
  const groundDraw = sample.probe.frameDraws.find(draw => draw.source.endsWith('/terrain-kit-v1/ground.png'))!;
  const camera = { x: manifest.ground.x - groundDraw.x, y: manifest.ground.y - groundDraw.y };
  const bushes = sample.probe.frameProps.filter(draw => draw.source.endsWith('/plains/scenery/foreground.png'));
  expect(bushes).toHaveLength(8);
  for (const bush of TREETOP_TIMBERS.entities.filter(entity => entity.asset === 'bush')) {
    expect(bushes.filter(draw => Math.abs(draw.x + 22 + camera.x - bush.x) < 1e-6
      && Math.abs(draw.y + 32 + camera.y - bush.y) < 1e-6 && draw.width === 44 && draw.height === 32)).toHaveLength(1);
  }
  const slimes = sample.probe.frameProps.filter(draw => draw.source.endsWith('/slimes/slimes.png'));
  expect(slimes).toHaveLength(3);
  for (const slime of TREETOP_TIMBERS.entities.filter(entity => entity.kind === 'slime')) {
    const draws = slimes.filter(draw => Math.abs(draw.x + draw.width / 2 + camera.x - slime.x) < 1e-6);
    expect(draws, slime.id).toHaveLength(1);
    const feet = draws[0].y + draws[0].height * 44 / 48 + camera.y;
    expect(feet, slime.id).toBeGreaterThanOrEqual(slime.y - 6 - 1e-6);
    expect(feet, slime.id).toBeLessThanOrEqual(slime.y + 1e-6);
  }
  for (const platform of TREETOP_TIMBERS.platforms!) {
    const matching = platformDraws.filter(draw => draw.source.endsWith('/' + manifest.platforms[platform.id].image)
      && Math.abs(draw.x - (platform.from.x - camera.x)) < 1e-6 && Math.abs(draw.y - (platform.from.y - camera.y)) < 1e-6);
    expect(matching, platform.id).toHaveLength(1);
    expect([matching[0].width, matching[0].height]).toEqual([platform.width, 17]);
  }
  if (supportId) expect(Number(sample.status.match(/Y (-?\d+)/)![1]) + DEFAULT_MOVEMENT.height).toBe(support(supportId).from.y);
  await page.evaluate(() => { (window as unknown as { timberKeyboardPilot: { frozen: boolean } }).timberKeyboardPilot.frozen = false; });
  return metadata;
}

for (const width of [426, 320]) test(`Timbers illustrated preview input journey and actual silhouette clearance at ${width}px`, async ({ page, browser }, info) => {
  test.setTimeout(180_000);
  const errors: string[] = [], responses: { path: string; status: number; sha256?: string; buildSha256?: string; error?: string }[] = [], pending: Promise<void>[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => {
    if (!response.url().includes('/assets/timbers/terrain-kit-v1/') && !response.url().includes('/assets/timbers/tree-v1/')) return;
    pending.push((async () => {
      const path = new URL(response.url()).pathname;
      const entry: typeof responses[number] = { path, status: response.status() }; responses.push(entry);
      try { entry.sha256 = hash(await response.body()); entry.buildSha256 = hash(readFileSync(new URL(`../dist${path}`, import.meta.url))); }
      catch (error) { entry.error = String(error); }
    })());
  });
  await page.setViewportSize({ width, height: width === 426 ? 300 : 240 });
  await page.emulateMedia({ reducedMotion: width === 320 ? 'reduce' : 'no-preference' });
  await installTimberKeyboardPilot(page); await installArtObserver(page);
  let capturedMap = false;
  const start = async () => {
    await page.goto('/?scene=adventure&debug=1');
    await page.getByRole('button', { name: 'TREETOP TIMBERS', exact: true }).click();
    if (!capturedMap) {
      await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
      const map = await page.evaluate(() => {
        const canvas = document.querySelector<HTMLCanvasElement>('#game')!, box = canvas.getBoundingClientRect();
        return { status: document.querySelector('#status')!.textContent, native: [canvas.width, canvas.height], css: { width: box.width, height: box.height }, viewport: [innerWidth, innerHeight],
          treeRenders: (window as unknown as { timbersArtProbe: { mapTreeRenders: number } }).timbersArtProbe.mapTreeRenders };
      });
      expect(map.treeRenders).toBeGreaterThan(0);
      const mapPath = info.outputPath('map-css.png'); await page.locator('#game').screenshot({ path: mapPath });
      const metadata = info.outputPath('map.json'); writeFileSync(metadata, JSON.stringify({ ...map, cssSha256: hash(readFileSync(mapPath)) }, null, 2));
      await info.attach('map', { path: mapPath, contentType: 'image/png' });
      await info.attach('map-metadata', { path: metadata, contentType: 'application/json' });
      capturedMap = true;
    }
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
    await route('tree-base', [{ kind: 'walk', x: 400 }]); await capture(page, info, 'tree-base', width);
    await route('tree-base-return', [{ kind: 'walk', x: 100 }]);
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
    await start();
    await route('lower-bough', TIMBER_ASCENT_RIGHT.slice(0, 2)); await capture(page, info, 'lower-bough', width, 'timber-low-1');
    await route('fork', TIMBER_ASCENT_RIGHT.slice(2, 5)); await capture(page, info, 'fork', width, 'timber-fork');
    await route('right-fork', TIMBER_ASCENT_RIGHT.slice(5, 8)); await capture(page, info, 'right-fork', width, 'timber-fork-right-2');
    await route('canopy', TIMBER_ASCENT_RIGHT.slice(8, 15)); await capture(page, info, 'canopy', width, 'timber-canopy');
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeVisible();
    const paused = info.outputPath('pause.png'); await page.screenshot({ path: paused });
    await info.attach('pause', { path: paused, contentType: 'image/png' });
    const pauseMetadata = info.outputPath('pause.json');
    writeFileSync(pauseMetadata, JSON.stringify({ status: await page.locator('#status').textContent(), sha256: hash(readFileSync(paused)), reducedMotion: width === 320 }, null, 2));
    await info.attach('pause-metadata', { path: pauseMetadata, contentType: 'application/json' });
    await page.getByRole('button', { name: 'Resume', exact: true }).click();
    await expect(page.locator('#status')).toContainText('Playing');
    await route('full-ascent', TIMBER_ASCENT_RIGHT.slice(15));
    await page.getByRole('button', { name: 'Build your word', exact: true }).click();
    await page.getByRole('button', { name: 'Find more letters', exact: true }).click();
    await expect(page.locator('#status')).toContainText('Playing');
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    await capture(page, info, 'lookout', width, 'timber-lookout');
    await route('upper-return', TIMBER_DESCENT_ALL.slice(0, 3)); await capture(page, info, 'upper-return', width, 'timber-return-240');
    await route('canopy-return', TIMBER_DESCENT_ALL.slice(3, 9)); await capture(page, info, 'canopy-return', width, 'timber-return-480');
    await route('middle-edge', TIMBER_DESCENT_ALL.slice(9, 14)); await capture(page, info, 'return-middle-edge', width, 'timber-middle');
    await route('return720', TIMBER_DESCENT_ALL.slice(14, 15)); await capture(page, info, 'return720', width, 'timber-return-720');
    await route('return780', TIMBER_DESCENT_ALL.slice(15, 16)); await capture(page, info, 'return780', width, 'timber-return-780');
    await route('lower-return', TIMBER_DESCENT_ALL.slice(16, 21)); await capture(page, info, 'lower-return', width, 'timber-return-960');
    await route('returned-roots', TIMBER_DESCENT_ALL.slice(21)); await capture(page, info, 'returned-roots', width);
    await expect(page.locator('#status')).toContainText('Letter bag: 4/4');
    await Promise.all(pending);
    for (const file of new Set(['manifest.json', 'ground.png', ...Object.keys(timbersPlatformWidths()).map(id => manifest.platforms[id].image)])) {
      const delivered = responses.filter(response => response.path === `/assets/timbers/terrain-kit-v1/${file}` && response.status === 200 && response.sha256);
      expect(delivered.length, String(file)).toBeGreaterThan(0);
      for (const response of delivered) expect(response.sha256).toBe(response.buildSha256);
    }
    for (const file of ['manifest.json', 'tree.png']) {
      const delivered = responses.filter(response => response.path === `/assets/timbers/tree-v1/${file}` && response.status === 200 && response.sha256);
      expect(delivered.length, file).toBeGreaterThan(0);
      for (const response of delivered) expect(response.sha256).toBe(response.buildSha256);
    }
    expect(errors).toEqual([]);
  } finally {
    await Promise.all(pending);
    const path = info.outputPath('journey.json');
    const files = ['src/world/renderer.ts', 'src/world/assets.ts', 'src/world/timbers-terrain.ts', 'src/world/timbers-tree.ts', 'src/world/treetop-timbers.ts',
      'src/game/education.ts', 'dist/index.html', 'assets/source/timbers/illustrated-v1/preparation.json', 'assets/source/timbers/tree-v1/preparation.json', 'tests/timbers-art.spec.ts', 'tests/timbers-browser-pilot.ts', 'public/assets/timbers/terrain-kit-v1/manifest.json',
      'assets/source/timbers/rollout-v1/preparation.json', 'scripts/prepare-timbers-rollout.mjs'];
    writeFileSync(path, JSON.stringify({ sourceRevision: process.env.BROWSER_REPORT_SOURCE_SHA ?? null,
      browser: browser.browserType().name(), version: browser.version(), width, errors, responses, histories,
      files: Object.fromEntries(files.map(file => [file, hash(readFileSync(new URL(`../${file}`, import.meta.url)))])) }, null, 2));
    await info.attach('journey', { path, contentType: 'application/json' });
  }
});

for (const file of ['manifest.json', 'ground.png', 'branch-580.png', 'branch-170.png', 'branch-200.png', 'branch-210.png', 'branch-250.png', 'branch-340.png', 'branch-440.png', 'branch-450.png']) test(`Timbers required ${file} fails visibly and recovers with ordinary Retry`, async ({ page }, info) => {
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

for (const resource of ['manifest.json', 'tree.png', 'declaration']) test(`Timbers tree required ${resource} fails visibly and recovers with ordinary Retry`, async ({ page }, info) => {
  let fail = true;
  const url = resource === 'declaration' ? '**/assets/timbers/manifest.json' : `**/assets/timbers/tree-v1/${resource}`;
  await page.route(url, async route => {
    if (!fail) { await route.continue(); return; }
    if (resource === 'declaration') {
      const response = await route.fetch(), metadata = await response.json();
      delete metadata.timbersTree; await route.fulfill({ response, json: metadata });
    } else await route.fulfill({ status: 503, body: 'intentional required-tree-resource test' });
  });
  await page.goto('/?scene=adventure');
  await expect(page.getByRole('button', { name: 'Retry loading', exact: true })).toBeVisible();
  await expect(page.locator('#status')).toHaveText('Artwork could not load. Reload to retry.');
  const failed = info.outputPath('tree-required-failed.png'); await page.screenshot({ path: failed });
  await info.attach('tree-required-failed', { path: failed, contentType: 'image/png' });
  fail = false; await page.getByRole('button', { name: 'Retry loading', exact: true }).click();
  await page.getByRole('button', { name: 'TREETOP TIMBERS', exact: true }).click();
  await page.getByRole('button', { name: 'Play TREETOP TIMBERS', exact: true }).click();
  await expect(page.locator('#status')).toContainText('Playing');
  const recovered = info.outputPath('tree-required-recovered.png'); await page.locator('#game').screenshot({ path: recovered });
  await info.attach('tree-required-recovered', { path: recovered, contentType: 'image/png' });
});

for (const width of [426, 320]) test(`Timbers rollout left-fork artwork and wrong-end catch at ${width}px`, async ({ page, browser }, info) => {
  test.setTimeout(120_000);
  const errors: string[] = [], histories: { name: string; result: object }[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const responses: { path: string; status: number; sha256?: string; buildSha256?: string; error?: string }[] = [], pending: Promise<void>[] = [];
  page.on('response', response => {
    const path = new URL(response.url()).pathname;
    if (!path.startsWith('/assets/timbers/terrain-kit-v1/') && !path.startsWith('/assets/timbers/tree-v1/')) return;
    pending.push((async () => {
      const entry: typeof responses[number] = { path, status: response.status() }; responses.push(entry);
      try { entry.sha256 = hash(await response.body()); entry.buildSha256 = hash(readFileSync(new URL(`../dist${path}`, import.meta.url))); }
      catch (error) { entry.error = String(error); }
    })());
  });

  await page.setViewportSize({ width, height: width === 426 ? 300 : 240 });
  await page.emulateMedia({ reducedMotion: width === 320 ? 'reduce' : 'no-preference' });
  await installTimberKeyboardPilot(page); await installArtObserver(page);
  const route = async (name: string, stages: Parameters<typeof runTimberStages>[1]) => {
    const result = await runTimberStages(page, stages); histories.push({ name, result });
    expect(result, name).toMatchObject({ done: true, error: '' });
  };
  try {
    await page.goto('/?scene=adventure&debug=1');
    await page.getByRole('button', { name: 'TREETOP TIMBERS', exact: true }).click();
    await page.getByRole('button', { name: 'Play TREETOP TIMBERS', exact: true }).click();
    await route('low-star', TIMBER_LEFT_STARS_ASCENT.slice(0, 5)); await capture(page, info, 'low-star', width, 'timber-star-1');
    await route('left-fork-lower', TIMBER_LEFT_STARS_ASCENT.slice(5, 11)); await capture(page, info, 'left-fork-lower', width, 'timber-fork-left-1');
    await route('left-fork-upper', TIMBER_LEFT_STARS_ASCENT.slice(11, 12)); await capture(page, info, 'left-fork-upper', width, 'timber-fork-left-2');
    await route('upper-star', TIMBER_LEFT_STARS_ASCENT.slice(12, 25)); await capture(page, info, 'upper-star', width, 'timber-star-3');
    await route('wrong-end', [{ kind: 'walk', x: 40 }]);
    // A completed horizontal walk can still be airborne. Observe the actual landing before freezing the capture.
    await expect.poll(async () => Number((await page.locator('#status').textContent())!.match(/Y (-?\d+)/)![1]))
      .toBe(support('timber-star-3-catch').from.y - DEFAULT_MOVEMENT.height);
    await capture(page, info, 'wrong-end-catch', width, 'timber-star-3-catch');
    await route('rejoin', [{ kind: 'walk', x: 180 }, ...TIMBER_LEFT_STARS_ASCENT.slice(26)]);
    await expect(page.locator('#status')).toContainText('Finish');
    const finished = info.outputPath('finish.png'); await page.screenshot({ path: finished });
    await info.attach('finish', { path: finished, contentType: 'image/png' });
    await Promise.all(pending);
    const paths = [...new Set(['manifest.json', 'ground.png', ...Object.values(manifest.platforms).map(piece => (piece as { image: string }).image)])]
      .map(file => `/assets/timbers/terrain-kit-v1/${file}`);
    paths.push('/assets/timbers/tree-v1/manifest.json', '/assets/timbers/tree-v1/tree.png');
    for (const path of paths) {
      const delivered = responses.filter(response => response.path === path && response.status === 200 && response.sha256);
      expect(delivered.length, path).toBeGreaterThan(0);
      for (const response of delivered) expect(response.sha256).toBe(response.buildSha256);
    }
    expect(errors).toEqual([]);
  } finally {
    await Promise.all(pending);
    const files = ['src/world/renderer.ts', 'src/world/assets.ts', 'src/world/timbers-terrain.ts', 'src/world/timbers-tree.ts',
      'src/world/treetop-timbers.ts', 'tests/timbers-art.spec.ts', 'tests/timbers-browser-pilot.ts', 'dist/index.html',
      'public/assets/timbers/terrain-kit-v1/manifest.json', 'assets/source/timbers/rollout-v1/preparation.json'];
    const record = info.outputPath('left-journey.json');
    writeFileSync(record, JSON.stringify({ sourceRevision: process.env.BROWSER_REPORT_SOURCE_SHA ?? null,
      browser: browser.browserType().name(), version: browser.version(), width, errors, histories, responses,
      files: Object.fromEntries(files.map(file => [file, hash(readFileSync(new URL(`../${file}`, import.meta.url)))])) }, null, 2));
    await info.attach('left-journey', { path: record, contentType: 'application/json' });
  }
});

test('Timbers complete terrain declaration is required and ordinary Retry recovers it', async ({ page }, info) => {
  let fail = true;
  await page.route('**/assets/timbers/manifest.json', async route => {
    if (!fail) { await route.continue(); return; }
    const response = await route.fetch(), metadata = await response.json();
    delete metadata.timbersKit; await route.fulfill({ response, json: metadata });
  });
  await page.goto('/?scene=adventure');
  await expect(page.getByRole('button', { name: 'Retry loading', exact: true })).toBeVisible();
  await expect(page.locator('#status')).toHaveText('Artwork could not load. Reload to retry.');
  const failed = info.outputPath('terrain-declaration-failed.png'); await page.screenshot({ path: failed });
  await info.attach('terrain-declaration-failed', { path: failed, contentType: 'image/png' });
  fail = false; await page.getByRole('button', { name: 'Retry loading', exact: true }).click();
  await page.getByRole('button', { name: 'TREETOP TIMBERS', exact: true }).click();
  await page.getByRole('button', { name: 'Play TREETOP TIMBERS', exact: true }).click();
  await expect(page.locator('#status')).toContainText('Playing');
  const recovered = info.outputPath('terrain-declaration-recovered.png'); await page.screenshot({ path: recovered });
  await info.attach('terrain-declaration-recovered', { path: recovered, contentType: 'image/png' });
});
