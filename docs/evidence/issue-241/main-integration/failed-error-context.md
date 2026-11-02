# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: plains-contour-pilot.spec.ts >> Plains required contour soil error offers ordinary Retry loading
- Location: tests/plains-contour-pilot.spec.ts:184:52

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false

Call Log:
- Timeout 20000ms exceeded while waiting on the predicate
```

# Page snapshot

```yaml
- main [ref=f1e1]:
  - 'generic "Letter bag: 0/4" [ref=f1e2]': This game requires a browser with Canvas 2D support.
  - status [ref=f1e3]: "Adventure preview · Playing · Letter bag: 0/4 · Escape to pause · M to mute"
  - button "Pause" [ref=f1e5] [cursor=pointer]: Ⅱ Pause
  - navigation "Trail navigation"
```

# Test source

```ts
  1   | import { test, expect, type Page, type TestInfo } from '@playwright/test';
  2   | import { createHash } from 'node:crypto';
  3   | import { readFileSync } from 'node:fs';
  4   | import { writeFile } from 'node:fs/promises';
  5   | import { PLAINS_LEVEL } from '../src/world/level';
  6   | import { surfaceY, DEFAULT_MOVEMENT } from '../src/game/movement';
  7   | import { createContourObserver } from './plains-contour-observer';
  8   | import { createContourControllerKernel, type ControllerGoal } from './plains-contour-controller';
  9   | import { installContourController, type ControllerBridge } from './plains-contour-controller-browser';
  10  | import { contourProvenance } from './plains-contour-provenance';
  11  | import { createContourResponseObserver } from './plains-contour-response';
  12  | 
  13  | import { contourArtworkConfig as config, contourColumns as columns, contourRibbonTop as ribbonTop, observeContour, readContourCache, type Probe } from './plains-contour-artwork';
  14  | import { createContourEvidence, retainContourCache } from './plains-contour-evidence';
  15  | 
  16  | type Witness = ReturnType<ReturnType<typeof createContourObserver>['snapshot']>;
  17  | async function install(page: Page) {
  18  |   // One init script: real observation helpers, no scene/world/clock injection.
  19  |   await page.addInitScript({ content: `(${observeContour.toString()})(${JSON.stringify(config)}, ${createContourObserver.toString()});\n(${installContourController.toString()})(${JSON.stringify({ top: ribbonTop, surfaces: PLAINS_LEVEL.surfaces })}, ${createContourControllerKernel.toString()});` });
  20  | }
  21  | async function pose(page: Page) {
  22  |   return page.evaluate(() => {
  23  |     const p = (window as unknown as { contourProbe: Probe }).contourProbe;
  24  |     const status = document.querySelector('#status')?.textContent ?? '';
  25  |     return { ...p.snapshot(status), status, x: status.match(/X (\d+)/) ? Number(status.match(/X (\d+)/)![1]) : null,
  26  |       y: status.match(/Y (-?\d+)/) ? Number(status.match(/Y (-?\d+)/)![1]) : null, v: status.match(/V (-?\d+)/) ? Number(status.match(/V (-?\d+)/)![1]) : null, ribbonDrawCount: p.ribbonDrawCount };
  27  |   });
  28  | }
  29  | function world(w: Witness) {
  30  |   if (!w.coherent || !w.henry || !w.ribbon) throw new Error('Missing same-world-frame Henry/ribbon witnesses');
  31  |   return { x: w.henry.x + 580 - w.ribbon.x, feet: w.henry.feet + ribbonTop - w.ribbon.y };
  32  | }
  33  | async function release(page: Page) {
  34  |   await page.evaluate(() => (window as unknown as { contourController?: ControllerBridge }).contourController?.stop());
  35  | }
  36  | async function driveGoal(page: Page, goal: ControllerGoal) {
  37  |   const id = await page.evaluate(goal => (window as unknown as { contourController: ControllerBridge }).contourController.start(goal), goal);
  38  |   // Use the same original mode budget as the shared controller: jump5s, other goals20s, including physical/readback acknowledgement.
  39  |   await expect.poll(async () => page.evaluate(id => {
  40  |     const c = (window as unknown as { contourController: ControllerBridge }).contourController;
  41  |     if (c.error) throw new Error(c.error);
  42  |     return c.results.some(r => r.id === id);
> 43  |   }, id), { timeout: createContourControllerKernel().goalBudget(goal.mode) }).toBe(true);
      |                                                                               ^ Error: expect(received).toBe(expected) // Object.is equality
  44  |   return { id };
  45  | }
  46  | async function walkToFlat(page: Page, target: number) {
  47  |   const margin = DEFAULT_MOVEMENT.width / 2 + 8, support = surfaceY(PLAINS_LEVEL, target);
  48  |   for (const s of PLAINS_LEVEL.surfaces.filter(s => s.x2 >= target - margin && s.x1 <= target + margin)) {
  49  |     expect(s.y1).toBe(support); expect(s.y2).toBe(support);
  50  |   }
  51  |   await driveGoal(page, { mode: 'park', target, direction: 1 });
  52  | }
  53  | async function traverseTo(page: Page, target: number, direction: 1 | -1) {
  54  |   return driveGoal(page, { mode: 'capture', target, direction });
  55  | }
  56  | async function saveRawHistory(page: Page, info: TestInfo) {
  57  |   const evidence = createContourEvidence(info);
  58  |   try {
  59  |     const raw = await page.evaluate(() => {
  60  |       const p = (window as unknown as { contourProbe?: Probe }).contourProbe;
  61  |       if (!p) return { available: false, reason: 'observer unavailable' };
  62  |       const status = document.querySelector('#status')?.textContent ?? '';
  63  |       return { available: true, history: p.history, current: p.snapshot(status), status, soilDraws: p.soilDraws, soilURL: p.soil?.src ?? null, soilSize: p.soil ? [p.soil.naturalWidth, p.soil.naturalHeight] : null, sourceDraws: p.sourceDraws,
  64  |         sourceURL: p.source?.src ?? null, sourceSize: p.source ? [p.source.naturalWidth, p.source.naturalHeight] : null,
  65  |         ribbonSize: p.ribbon ? [p.ribbon.width, p.ribbon.height] : null, ribbonDrawCount: p.ribbonDrawCount,
  66  |         controller: (() => { const c = (window as unknown as { contourController?: ControllerBridge }).contourController; return c ? { records: c.records, results: c.results, error: c.error } : null; })() };
  67  |     });
  68  |     const contact = raw.history?.map(w => { try { const v = world(w); return { frame: w.frame, ...v, gap: v.feet - surfaceY(PLAINS_LEVEL, v.x), facing: w.henry!.transform.a }; } catch (error) { return { frame: w.frame, unavailable: String(error) }; } });
  69  |     await evidence.observe('raw-frame-contact-input-history', { ...raw, contact: contact ?? null, ...contourProvenance(info.config.metadata) });
  70  |     await evidence.assertIntegrity();
  71  |     return null;
  72  |   } catch (error) { return String(error); }
  73  | }
  74  | 
  75  | const responseSourceHashes = Object.fromEntries(['tests/plains-contour-pilot.spec.ts', 'tests/plains-contour-response.ts', 'tests/hud-response-observation.ts'].map(path =>
  76  |   [path, createHash('sha256').update(readFileSync(new URL(`../${path}`, import.meta.url))).digest('hex')]));
  77  | const diskDigest = (path: string) => createHash('sha256').update(readFileSync(new URL(`../dist${path}`, import.meta.url))).digest('hex');
  78  | function bindResponses(page: Page, accept: (path: string) => boolean, recovering: () => boolean, blocked = new Set<object>()) {
  79  |   const observer = createContourResponseObserver();
  80  |   const requests: { id: number; url: string; path: string; recoveryAtEmission: boolean; blocked: boolean; failure?: string }[] = [];
  81  |   const byRequest = new Map<object, typeof requests[number]>();
  82  |   page.on('request', request => {
  83  |     const path = new URL(request.url()).pathname;
  84  |     if (!accept(path)) return;
  85  |     const row = { id: requests.length + 1, url: request.url(), path, recoveryAtEmission: recovering(), blocked: blocked.has(request) };
  86  |     requests.push(row); byRequest.set(request, row);
  87  |   });
  88  |   page.on('requestfailed', request => { const row = byRequest.get(request); if (row) row.failure = request.failure()?.errorText; });
  89  |   page.on('response', response => {
  90  |     if (!accept(new URL(response.url()).pathname)) return;
  91  |     const row = byRequest.get(response.request());
  92  |     observer.observe(response, { requestId: row?.id ?? null, recoveryAtEmission: row?.recoveryAtEmission ?? null });
  93  |   });
  94  |   return { observer, requests, byRequest };
  95  | }
  96  | 
  97  | for (const width of [426, 320]) test(`Plains contour ordinary input ${width}: rest jump joins and return`, async ({ page }, info) => {
  98  |   test.setTimeout(120_000);
  99  |   const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  100 |   const { observer: responseObserver, requests: transportRequests } = bindResponses(page,
  101 |     path => path.includes('/build-assets/') || path === '/assets/plains/manifest.json' || path.endsWith('/contour-prototype-v1/grass.png') || path.endsWith('/contour-prototype-v1/soil.png'), () => false);
  102 |   const served = responseObserver.records;
  103 |   await page.setViewportSize({ width, height: width === 426 ? 300 : 240 }); await install(page);
  104 |   const captures: object[] = [];
  105 |   const evidence = createContourEvidence(info);
  106 |   const sourceHashes = Object.fromEntries(['src/world/plains-contour.ts', 'src/world/renderer.ts', 'src/world/trail-presentation.ts',
  107 |     'src/world/assets.ts', 'src/world/level.ts', 'public/assets/plains/contour-prototype-v1/grass.png',
  108 |     'public/assets/plains/contour-prototype-v1/soil.png', 'public/assets/plains/manifest.json', 'public/assets/henry/manifest.json', 'tests/plains-contour-pilot.spec.ts', 'tests/plains-contour-observer.ts', 'tests/plains-contour-controller.ts', 'tests/plains-contour-controller-browser.ts', 'tests/plains-contour-provenance.ts', 'tests/plains-contour-artwork.ts', 'tests/plains-contour-evidence.ts', 'tests/cove-rollout-evidence.ts'].map(name =>
  109 |     [name, createHash('sha256').update(readFileSync(new URL(`../${name}`, import.meta.url))).digest('hex')]));
  110 |   const capture = async (name: string, kind: 'rest' | 'traversal' | 'airborne', intent?: { id: number }) => {
  111 |     if (kind === 'airborne') intent = await driveGoal(page, { mode: 'jump', target: 790, direction: 1 });
  112 |     const raw = await page.evaluate(id => {
  113 |       const c = (window as unknown as { contourController: ControllerBridge }).contourController;
  114 |       const result = id === undefined ? c.results.at(-1) : c.results.find(r => r.id === id);
  115 |       if (!result) throw new Error('No physically acknowledged same-frame controller readback');
  116 |       return result;
  117 |     }, intent?.id);
  118 |     const canvasPath = info.outputPath(`${name}-logical426-canvas.png`), viewportPath = info.outputPath(`${name}-viewport.png`);
  119 |     const canvasBytes = Buffer.from(raw.png!.split(',')[1], 'base64');
  120 |     // The controller already exported this physically acknowledged logical pose; its sole actuator continues during file/viewport latency.
  121 |     await writeFile(canvasPath, canvasBytes);
  122 |     const laterViewport = async () => {
  123 |       const before = await pose(page), bytes = await page.screenshot({ path: viewportPath }), after = await pose(page);
  124 |       return { bytes, before, after };
  125 |     };
  126 |     const viewport = await laterViewport(); // The single render-driven owner remains active throughout screenshot latency.
  127 |     const viewportBytes = viewport.bytes;
  128 |     captures.push({ name, kind, captureIntent: intent ?? null, accepted: raw.accepted, viewportBefore: viewport.before, viewportAfter: viewport.after, witness: raw.witness, status: raw.status, box: raw.box, logical: raw.logical, canvasPath, viewportPath, canvasSHA256: createHash('sha256').update(canvasBytes).digest('hex'), viewportSHA256: createHash('sha256').update(viewportBytes).digest('hex'),
  129 |       note: 'logical PNG is actual426x240 canvas export; viewport is a separate later display screenshot bracketed by observations, NOT the logical capture pose; controller resumes during screenshot latency' });
  130 |     expect(raw.logical).toEqual([426, 240]);
  131 |     const w = world(raw.witness);
  132 |     if (kind === 'airborne') expect(surfaceY(PLAINS_LEVEL, w.x) - w.feet).toBeGreaterThan(6);
  133 |     else expect(Math.abs(w.feet - surfaceY(PLAINS_LEVEL, w.x))).toBeLessThan(1);
  134 |     if (kind === 'rest') expect(Number(raw.status.match(/V (-?\d+)/)?.[1])).toBe(0);
  135 |     if (name.startsWith('return-')) expect(raw.witness.henry!.transform.a).toBeLessThan(0);
  136 |     await info.attach(`${name}-canvas`, { path: canvasPath, contentType: 'image/png' });
  137 |   };
  138 |   let primary: unknown;
  139 |   try {
  140 |     await page.goto('/?debug=1'); await page.getByRole('button', { name: 'Play PLAINS', exact: true }).click();
  141 |     await expect(page.locator('#status')).toContainText('Playing');
  142 |     for (const x of [620, 660, 700]) { const intent = await traverseTo(page, x, 1); await capture(`outward-contact-${x}`, 'traversal', intent); }
  143 |     await walkToFlat(page, 760); await capture('flat-rest-760', 'rest');
```