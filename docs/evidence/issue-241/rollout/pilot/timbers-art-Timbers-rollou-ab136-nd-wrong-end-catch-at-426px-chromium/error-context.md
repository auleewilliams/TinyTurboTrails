# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: timbers-art.spec.ts >> Timbers rollout left-fork artwork and wrong-end catch at 426px
- Location: tests/timbers-art.spec.ts:254:33

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 360
Received: 319
```

# Page snapshot

```yaml
- main [ref=e1]:
  - 'generic "Letter bag: 0/4" [ref=e2]': This game requires a browser with Canvas 2D support.
  - status [ref=e3]: "Adventure preview · Playing · Letter bag: 0/4 · X 42 Y 285 V 0 F -1 · Escape to pause · M to mute"
  - button "Pause" [ref=e5] [cursor=pointer]: Ⅱ Pause
  - navigation "Trail navigation"
```

# Test source

```ts
  1   | import { test, expect, type Page, type TestInfo } from '@playwright/test';
  2   | import { readFileSync, writeFileSync } from 'node:fs';
  3   | import { createHash } from 'node:crypto';
  4   | import { TREETOP_TIMBERS } from '../src/world/treetop-timbers';
  5   | import { DEFAULT_MOVEMENT } from '../src/game/movement';
  6   | import { timbersPlatformWidths } from '../src/world/timbers-terrain';
  7   | import { installTimberKeyboardPilot, runTimberStages, TIMBER_ASCENT_RIGHT, TIMBER_TO_MIDDLE,
  8   |   TIMBER_SPRING_RETRY, TIMBER_DESCENT_ALL, TIMBER_LEFT_STARS_ASCENT } from './timbers-browser-pilot';
  9   | 
  10  | const hash = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
  11  | const manifest = JSON.parse(readFileSync(new URL('../public/assets/timbers/terrain-kit-v1/manifest.json', import.meta.url), 'utf8'));
  12  | const treeManifest = JSON.parse(readFileSync(new URL('../public/assets/timbers/tree-v1/manifest.json', import.meta.url), 'utf8'));
  13  | const support = (id: string) => {
  14  |   const matches = TREETOP_TIMBERS.platforms!.filter(platform => platform.id === id);
  15  |   expect(matches).toHaveLength(1); return matches[0];
  16  | };
  17  | 
  18  | async function installArtObserver(page: Page): Promise<void> {
  19  |   await page.addInitScript(() => {
  20  |     type Draw = { source: string; x: number; y: number; width: number; height: number };
  21  |     const state = { mapTreeRenders: 0, draws: [] as Draw[], actor: null as null | { feet: { x: number; y: number }; bounds: { left: number; right: number; top: number; bottom: number } }, frameDraws: [] as Draw[], seen: [] as string[] };
  22  |     Object.assign(window, { timbersArtProbe: state });
  23  |     const fill = CanvasRenderingContext2D.prototype.fillRect, draw = CanvasRenderingContext2D.prototype.drawImage;
  24  |     const decoded = new WeakMap<HTMLImageElement, ImageData>();
  25  |     CanvasRenderingContext2D.prototype.fillRect = function (x, y, width, height) {
  26  |       if (this.canvas.id === 'game' && x === 0 && y === 0 && width === 426 && height === 240) state.draws = [];
  27  |       return fill.call(this, x, y, width, height);
  28  |     };
  29  |     CanvasRenderingContext2D.prototype.drawImage = function (image: CanvasImageSource, ...values: number[]) {
  30  |       if (image instanceof HTMLImageElement && image.src.endsWith('/timbers/tree-v1/tree.png') && this.canvas.id !== 'game') state.mapTreeRenders++;
  31  |       if (this.canvas.id === 'game' && image instanceof HTMLImageElement) {
  32  |         if ((image.src.includes('/timbers/terrain-kit-v1/') || image.src.includes('/timbers/tree-v1/')) && values.length === 2) {
  33  |           state.draws.push({ source: image.src, x: values[0], y: values[1], width: image.naturalWidth, height: image.naturalHeight });
  34  |           if (!state.seen.includes(image.src)) state.seen.push(image.src);
  35  |         }
  36  |         if (image.src.includes('/henry/henry-celebration.png') && values.length === 8) {
  37  |           if (!decoded.has(image)) {
  38  |             const canvas = document.createElement('canvas'); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
  39  |             const ctx = canvas.getContext('2d')!; draw.call(ctx, image, 0, 0, image.naturalWidth, image.naturalHeight, 0, 0, image.naturalWidth, image.naturalHeight);
  40  |             decoded.set(image, ctx.getImageData(0, 0, canvas.width, canvas.height));
  41  |           }
  42  |           const pixels = decoded.get(image)!;
  43  |           const [sx, sy, sw, sh, dx, dy, dw, dh] = values, transform = this.getTransform();
  44  |           let left = Infinity, right = -Infinity, top = Infinity, bottom = -Infinity;
  45  |           for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
  46  |             if (!pixels.data[((sy + y) * pixels.width + sx + x) * 4 + 3]) continue;
  47  |             const p = transform.transformPoint({ x: dx + x * dw / sw, y: dy + y * dh / sh });
  48  |             const q = transform.transformPoint({ x: dx + (x + 1) * dw / sw, y: dy + (y + 1) * dh / sh });
  49  |             left = Math.min(left, p.x, q.x); right = Math.max(right, p.x, q.x); top = Math.min(top, p.y, q.y); bottom = Math.max(bottom, p.y, q.y);
  50  |           }
  51  |           const feet = transform.transformPoint({ x: dx + 24, y: dy + 44 });
  52  |           state.actor = { feet: { x: feet.x, y: feet.y }, bounds: { left, right, top, bottom } };
  53  |           state.frameDraws = [...state.draws];
  54  |         }
  55  |       }
  56  |       return draw.apply(this, [image, ...values] as Parameters<typeof draw>);
  57  |     };
  58  |   });
  59  | }
  60  | 
  61  | async function capture(page: Page, info: TestInfo, name: string, width: number, supportId?: string) {
  62  |   await page.evaluate(() => { (window as unknown as { timberKeyboardPilot: { frozen: boolean } }).timberKeyboardPilot.frozen = true; });
  63  |   const sample = await page.evaluate(() => {
  64  |     const canvas = document.querySelector<HTMLCanvasElement>('#game')!, box = canvas.getBoundingClientRect();
  65  |     const probe = (window as unknown as { timbersArtProbe: { actor: { feet: { x: number; y: number }; bounds: { left: number; right: number; top: number; bottom: number } }; frameDraws: { source: string; x: number; y: number; width: number; height: number }[]; seen: string[] } }).timbersArtProbe;
  66  |     return { status: document.querySelector('#status')!.textContent!, native: [canvas.width, canvas.height],
  67  |       css: { width: box.width, height: box.height }, viewport: [innerWidth, innerHeight], probe,
  68  |       png: canvas.toDataURL('image/png') };
  69  |   });
  70  |   const native = Buffer.from(sample.png.split(',')[1], 'base64');
  71  |   const nativePath = info.outputPath(`${name}-native.png`), cssPath = info.outputPath(`${name}-css.png`);
  72  |   writeFileSync(nativePath, native); await page.locator('#game').screenshot({ path: cssPath });
  73  |   await info.attach(`${name}-native`, { path: nativePath, contentType: 'image/png' });
  74  |   await info.attach(`${name}-css`, { path: cssPath, contentType: 'image/png' });
  75  |   const { png: _png, ...metadata } = sample;
  76  |   const metaPath = info.outputPath(`${name}.json`);
  77  |   writeFileSync(metaPath, JSON.stringify({ ...metadata, nativeSha256: hash(native), cssSha256: hash(readFileSync(cssPath)) }, null, 2));
  78  |   await info.attach(`${name}-metadata`, { path: metaPath, contentType: 'application/json' });
  79  |   expect(sample.native).toEqual([426, 240]); expect(sample.css.width).toBe(width);
  80  |   const treeDraws = sample.probe.frameDraws.filter(draw => draw.source.endsWith('/timbers/tree-v1/tree.png'));
  81  |   expect(treeDraws).toHaveLength(1);
  82  |   expect([treeDraws[0].width, treeDraws[0].height]).toEqual([treeManifest.width, treeManifest.height]);
  83  |   expect(sample.probe.frameDraws.indexOf(treeDraws[0])).toBeLessThan(sample.probe.frameDraws.findIndex(draw => draw.source.includes('/timbers/terrain-kit-v1/')));
  84  |   if (name === 'roots' || name === 'returned-roots' || name === 'tree-base') expect(treeDraws[0].y + treeManifest.basePlane).toBeCloseTo(sample.probe.actor.feet.y, 5);
  85  |   const platformDraws = sample.probe.frameDraws.filter(draw => /\/branch-\d+\.png$/.test(draw.source));
  86  |   expect(platformDraws).toHaveLength(44);
  87  |   const groundDraw = sample.probe.frameDraws.find(draw => draw.source.endsWith('/terrain-kit-v1/ground.png'))!;
  88  |   const camera = { x: manifest.ground.x - groundDraw.x, y: manifest.ground.y - groundDraw.y };
  89  |   for (const platform of TREETOP_TIMBERS.platforms!) {
  90  |     const matching = platformDraws.filter(draw => draw.source.endsWith('/' + manifest.platforms[platform.id].image)
  91  |       && Math.abs(draw.x - (platform.from.x - camera.x)) < 1e-6 && Math.abs(draw.y - (platform.from.y - camera.y)) < 1e-6);
  92  |     expect(matching, platform.id).toHaveLength(1);
  93  |     expect([matching[0].width, matching[0].height]).toEqual([platform.width, 17]);
  94  |   }
> 95  |   if (supportId) expect(Number(sample.status.match(/Y (-?\d+)/)![1]) + DEFAULT_MOVEMENT.height).toBe(support(supportId).from.y);
      |                                                                                                 ^ Error: expect(received).toBe(expected) // Object.is equality
  96  |   await page.evaluate(() => { (window as unknown as { timberKeyboardPilot: { frozen: boolean } }).timberKeyboardPilot.frozen = false; });
  97  |   return metadata;
  98  | }
  99  | 
  100 | for (const width of [426, 320]) test(`Timbers illustrated preview input journey and actual silhouette clearance at ${width}px`, async ({ page, browser }, info) => {
  101 |   test.setTimeout(180_000);
  102 |   const errors: string[] = [], responses: { path: string; status: number; sha256?: string; buildSha256?: string; error?: string }[] = [], pending: Promise<void>[] = [];
  103 |   page.on('pageerror', error => errors.push(error.message));
  104 |   page.on('response', response => {
  105 |     if (!response.url().includes('/assets/timbers/terrain-kit-v1/') && !response.url().includes('/assets/timbers/tree-v1/')) return;
  106 |     pending.push((async () => {
  107 |       const path = new URL(response.url()).pathname;
  108 |       const entry: typeof responses[number] = { path, status: response.status() }; responses.push(entry);
  109 |       try { entry.sha256 = hash(await response.body()); entry.buildSha256 = hash(readFileSync(new URL(`../dist${path}`, import.meta.url))); }
  110 |       catch (error) { entry.error = String(error); }
  111 |     })());
  112 |   });
  113 |   await page.setViewportSize({ width, height: width === 426 ? 300 : 240 });
  114 |   await page.emulateMedia({ reducedMotion: width === 320 ? 'reduce' : 'no-preference' });
  115 |   await installTimberKeyboardPilot(page); await installArtObserver(page);
  116 |   let capturedMap = false;
  117 |   const start = async () => {
  118 |     await page.goto('/?scene=adventure&debug=1');
  119 |     await page.getByRole('button', { name: 'TREETOP TIMBERS', exact: true }).click();
  120 |     if (!capturedMap) {
  121 |       await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  122 |       const map = await page.evaluate(() => {
  123 |         const canvas = document.querySelector<HTMLCanvasElement>('#game')!, box = canvas.getBoundingClientRect();
  124 |         return { status: document.querySelector('#status')!.textContent, native: [canvas.width, canvas.height], css: { width: box.width, height: box.height }, viewport: [innerWidth, innerHeight],
  125 |           treeRenders: (window as unknown as { timbersArtProbe: { mapTreeRenders: number } }).timbersArtProbe.mapTreeRenders };
  126 |       });
  127 |       expect(map.treeRenders).toBeGreaterThan(0);
  128 |       const mapPath = info.outputPath('map-css.png'); await page.locator('#game').screenshot({ path: mapPath });
  129 |       const metadata = info.outputPath('map.json'); writeFileSync(metadata, JSON.stringify({ ...map, cssSha256: hash(readFileSync(mapPath)) }, null, 2));
  130 |       await info.attach('map', { path: mapPath, contentType: 'image/png' });
  131 |       await info.attach('map-metadata', { path: metadata, contentType: 'application/json' });
  132 |       capturedMap = true;
  133 |     }
  134 |     await page.getByRole('button', { name: 'Play TREETOP TIMBERS', exact: true }).click();
  135 |     await expect(page.locator('#status')).toContainText('X 100 Y 1046');
  136 |   };
  137 |   const histories: { name: string; result: object }[] = [];
  138 |   const route = async (name: string, stages: Parameters<typeof runTimberStages>[1]) => {
  139 |     const result = await runTimberStages(page, stages); histories.push({ name, result });
  140 |     expect(result, name).toMatchObject({ done: true, error: '' });
  141 |   };
  142 |   try {
  143 |     await start(); await capture(page, info, 'roots', width);
  144 |     await route('tree-base', [{ kind: 'walk', x: 400 }]); await capture(page, info, 'tree-base', width);
  145 |     await route('tree-base-return', [{ kind: 'walk', x: 100 }]);
  146 |     await route('middle', TIMBER_TO_MIDDLE); await capture(page, info, 'middle', width, 'timber-middle');
  147 |     await route('under-spring', [{ kind: 'walk', x: 100 }]);
  148 |     const under = await capture(page, info, 'under-spring', width, 'timber-middle');
  149 |     const actor = under.probe.actor, worldX = Number(under.status.match(/X (-?\d+)/)![1]);
  150 |     const camera = { x: worldX - actor.feet.x, y: support('timber-middle').from.y - actor.feet.y };
  151 |     const spring = support('timber-spring');
  152 |     const springDraws = under.probe.frameDraws.filter(draw => draw.width === spring.width
  153 |       && Math.abs(draw.x - (spring.from.x - camera.x)) < 1 && Math.abs(draw.y - (spring.from.y - camera.y)) < 1);
  154 |     expect(springDraws).toHaveLength(1);
  155 |     expect(actor.bounds.top - springDraws[0].y - springDraws[0].height).toBeGreaterThanOrEqual(2);
  156 |     await route('spring-reward', TIMBER_SPRING_RETRY.slice(1, 2)); await capture(page, info, 'spring-reward', width, 'timber-spring-reward');
  157 |     await route('spring-catch', TIMBER_SPRING_RETRY.slice(2, 4));
  158 |     const caught = await capture(page, info, 'spring-catch', width, 'timber-spring-catch');
  159 |     const catchCameraX = Number(caught.status.match(/X (-?\d+)/)![1]) - caught.probe.actor.feet.x;
  160 |     const reward = support('timber-spring-reward');
  161 |     expect(caught.probe.actor.bounds.left + catchCameraX).toBeGreaterThan(reward.from.x + reward.width);
  162 |     await route('spring-repeat', TIMBER_SPRING_RETRY.slice(4)); await capture(page, info, 'spring-repeat', width, 'timber-spring-reward');
  163 |     await start();
  164 |     await route('lower-bough', TIMBER_ASCENT_RIGHT.slice(0, 2)); await capture(page, info, 'lower-bough', width, 'timber-low-1');
  165 |     await route('fork', TIMBER_ASCENT_RIGHT.slice(2, 5)); await capture(page, info, 'fork', width, 'timber-fork');
  166 |     await route('right-fork', TIMBER_ASCENT_RIGHT.slice(5, 8)); await capture(page, info, 'right-fork', width, 'timber-fork-right-2');
  167 |     await route('canopy', TIMBER_ASCENT_RIGHT.slice(8, 15)); await capture(page, info, 'canopy', width, 'timber-canopy');
  168 |     await page.getByRole('button', { name: 'Pause', exact: true }).click();
  169 |     await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeVisible();
  170 |     const paused = info.outputPath('pause.png'); await page.screenshot({ path: paused });
  171 |     await info.attach('pause', { path: paused, contentType: 'image/png' });
  172 |     const pauseMetadata = info.outputPath('pause.json');
  173 |     writeFileSync(pauseMetadata, JSON.stringify({ status: await page.locator('#status').textContent(), sha256: hash(readFileSync(paused)), reducedMotion: width === 320 }, null, 2));
  174 |     await info.attach('pause-metadata', { path: pauseMetadata, contentType: 'application/json' });
  175 |     await page.getByRole('button', { name: 'Resume', exact: true }).click();
  176 |     await expect(page.locator('#status')).toContainText('Playing');
  177 |     await route('full-ascent', TIMBER_ASCENT_RIGHT.slice(15));
  178 |     await page.getByRole('button', { name: 'Build your word', exact: true }).click();
  179 |     await page.getByRole('button', { name: 'Find more letters', exact: true }).click();
  180 |     await expect(page.locator('#status')).toContainText('Playing');
  181 |     await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  182 |     await capture(page, info, 'lookout', width, 'timber-lookout');
  183 |     await route('upper-return', TIMBER_DESCENT_ALL.slice(0, 3)); await capture(page, info, 'upper-return', width, 'timber-return-240');
  184 |     await route('canopy-return', TIMBER_DESCENT_ALL.slice(3, 9)); await capture(page, info, 'canopy-return', width, 'timber-return-480');
  185 |     await route('middle-edge', TIMBER_DESCENT_ALL.slice(9, 14)); await capture(page, info, 'return-middle-edge', width, 'timber-middle');
  186 |     await route('return720', TIMBER_DESCENT_ALL.slice(14, 15)); await capture(page, info, 'return720', width, 'timber-return-720');
  187 |     await route('return780', TIMBER_DESCENT_ALL.slice(15, 16)); await capture(page, info, 'return780', width, 'timber-return-780');
  188 |     await route('lower-return', TIMBER_DESCENT_ALL.slice(16, 21)); await capture(page, info, 'lower-return', width, 'timber-return-960');
  189 |     await route('returned-roots', TIMBER_DESCENT_ALL.slice(21)); await capture(page, info, 'returned-roots', width);
  190 |     await expect(page.locator('#status')).toContainText('Letter bag: 4/4');
  191 |     await Promise.all(pending);
  192 |     for (const file of new Set(['manifest.json', 'ground.png', ...Object.keys(timbersPlatformWidths()).map(id => manifest.platforms[id].image)])) {
  193 |       const delivered = responses.filter(response => response.path.endsWith('/' + file) && response.status === 200 && response.sha256);
  194 |       expect(delivered.length, String(file)).toBeGreaterThan(0);
  195 |       for (const response of delivered) expect(response.sha256).toBe(response.buildSha256);
```