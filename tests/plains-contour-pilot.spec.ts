import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { writeFile } from 'node:fs/promises';
import { PLAINS_LEVEL } from '../src/world/level';
import { surfaceY, DEFAULT_MOVEMENT } from '../src/game/movement';
import { plainsContourColumns } from '../src/world/plains-contour';
import { createContourObserver, type ContourObserverConfig } from './plains-contour-observer';
import { createContourControllerKernel, type ControllerGoal } from './plains-contour-controller';
import { installContourController, type ControllerBridge } from './plains-contour-controller-browser';
import { contourProvenance } from './plains-contour-provenance';
import { createContourResponseObserver } from './plains-contour-response';

type Witness = ReturnType<ReturnType<typeof createContourObserver>['snapshot']>;
interface Probe {
  soilDraws: number[][]; soil: HTMLImageElement | null;
  sourceDraws: number[][]; ribbon: HTMLCanvasElement | null; source: HTMLImageElement | null;
  ribbonDrawCount: number; history: Witness[]; snapshot(status: string): Witness;
}
const henryManifest = JSON.parse(readFileSync(new URL('../public/assets/henry/manifest.json', import.meta.url), 'utf8'));
const { decodePng } = createRequire(import.meta.url)('../scripts/spelling-stickers.mjs') as { decodePng(b: Uint8Array): { data: Uint8Array } };
const expectedGrass = Array.from(decodePng(readFileSync(new URL('../public/assets/plains/contour-prototype-v1/grass.png', import.meta.url))).data);
const expectedSoil = Array.from(decodePng(readFileSync(new URL('../public/assets/plains/contour-prototype-v1/soil.png', import.meta.url))).data);
const columns = plainsContourColumns(PLAINS_LEVEL);
const ribbonTop = Math.min(...columns.map(c => c.pixelContactY)) - 2;
const config: ContourObserverConfig & { image: string } = { image: henryManifest.image, sky: PLAINS_LEVEL.theme.sky, width: 426, height: 240,
  anchor: henryManifest.anchor, logicalSize: henryManifest.logicalSize };
function observeContour(configuration: ContourObserverConfig & { image: string }, factory: typeof createContourObserver): void {
  const rules = factory(configuration);
  const probe: Probe = { soilDraws: [], soil: null, sourceDraws: [], ribbon: null, source: null, ribbonDrawCount: 0, history: [], snapshot: rules.snapshot };
  Object.assign(window, { contourProbe: probe });
  const fill = CanvasRenderingContext2D.prototype.fillRect;
  CanvasRenderingContext2D.prototype.fillRect = function (x, y, w, h) {
    if (this.canvas.id === 'game' && x === 0 && y === 0 && w === configuration.width && h === configuration.height) {
      const before = rules.snapshot(document.querySelector('#status')?.textContent ?? '');
      rules.fill(true, [x, y, w, h], String(this.fillStyle), this.globalAlpha, this.getTransform());
      if (rules.snapshot('').frame > before.frame && before.coherent) probe.history.push(before);
    }
    Reflect.apply(fill, this, [x, y, w, h]);
  };
  const draw = CanvasRenderingContext2D.prototype.drawImage;
  CanvasRenderingContext2D.prototype.drawImage = function (this: CanvasRenderingContext2D, image: CanvasImageSource, ...args: number[]) {
    if (image instanceof HTMLImageElement && image.src.endsWith('/contour-prototype-v1/soil.png')) { probe.soil = image; probe.soilDraws.push(args); }
    if (image instanceof HTMLImageElement && image.src.endsWith('/contour-prototype-v1/grass.png')) {
      probe.source = image; probe.ribbon = this.canvas as HTMLCanvasElement; probe.sourceDraws.push(args);
    }
    if (this.canvas.id === 'game') {
      const m = this.getTransform(), matrix = { a: m.a, b: m.b, c: m.c, d: m.d, e: m.e, f: m.f };
      if (image === probe.ribbon) { rules.ribbon(args, matrix); probe.ribbonDrawCount++; }
      if (image instanceof HTMLImageElement && image.src.endsWith(`/${configuration.image}`)) {
        rules.actor(args, matrix);
      }
    }
    Reflect.apply(draw, this, [image, ...args]);
  } as typeof draw;
}
async function install(page: Page) {
  // One init script: real observation helpers, no scene/world/clock injection.
  await page.addInitScript({ content: `(${observeContour.toString()})(${JSON.stringify(config)}, ${createContourObserver.toString()});\n(${installContourController.toString()})(${JSON.stringify({ top: ribbonTop, surfaces: PLAINS_LEVEL.surfaces })}, ${createContourControllerKernel.toString()});` });
}
async function pose(page: Page) {
  return page.evaluate(() => {
    const p = (window as unknown as { contourProbe: Probe }).contourProbe;
    const status = document.querySelector('#status')?.textContent ?? '';
    return { ...p.snapshot(status), status, x: status.match(/X (\d+)/) ? Number(status.match(/X (\d+)/)![1]) : null,
      y: status.match(/Y (-?\d+)/) ? Number(status.match(/Y (-?\d+)/)![1]) : null, v: status.match(/V (-?\d+)/) ? Number(status.match(/V (-?\d+)/)![1]) : null, ribbonDrawCount: p.ribbonDrawCount };
  });
}
function world(w: Witness) {
  if (!w.coherent || !w.henry || !w.ribbon) throw new Error('Missing same-world-frame Henry/ribbon witnesses');
  return { x: w.henry.x + 580 - w.ribbon.x, feet: w.henry.feet + ribbonTop - w.ribbon.y };
}
async function release(page: Page) {
  await page.evaluate(() => (window as unknown as { contourController?: ControllerBridge }).contourController?.stop());
}
async function driveGoal(page: Page, goal: ControllerGoal) {
  const id = await page.evaluate(goal => (window as unknown as { contourController: ControllerBridge }).contourController.start(goal), goal);
  // Use the same original mode budget as the shared controller: jump5s, other goals20s, including physical/readback acknowledgement.
  await expect.poll(async () => page.evaluate(id => {
    const c = (window as unknown as { contourController: ControllerBridge }).contourController;
    if (c.error) throw new Error(c.error);
    return c.results.some(r => r.id === id);
  }, id), { timeout: createContourControllerKernel().goalBudget(goal.mode) }).toBe(true);
  return { id };
}
async function walkToFlat(page: Page, target: number) {
  const margin = DEFAULT_MOVEMENT.width / 2 + 8, support = surfaceY(PLAINS_LEVEL, target);
  for (const s of PLAINS_LEVEL.surfaces.filter(s => s.x2 >= target - margin && s.x1 <= target + margin)) {
    expect(s.y1).toBe(support); expect(s.y2).toBe(support);
  }
  await driveGoal(page, { mode: 'park', target, direction: 1 });
}
async function traverseTo(page: Page, target: number, direction: 1 | -1) {
  return driveGoal(page, { mode: 'capture', target, direction });
}
async function saveRawHistory(page: Page, info: TestInfo) {
  try {
    const raw = await page.evaluate(() => {
      const p = (window as unknown as { contourProbe?: Probe }).contourProbe;
      if (!p) return { available: false, reason: 'observer unavailable' };
      const status = document.querySelector('#status')?.textContent ?? '';
      return { available: true, history: p.history, current: p.snapshot(status), status, soilDraws: p.soilDraws, soilURL: p.soil?.src ?? null, soilSize: p.soil ? [p.soil.naturalWidth, p.soil.naturalHeight] : null, sourceDraws: p.sourceDraws,
        sourceURL: p.source?.src ?? null, sourceSize: p.source ? [p.source.naturalWidth, p.source.naturalHeight] : null,
        ribbonSize: p.ribbon ? [p.ribbon.width, p.ribbon.height] : null, ribbonDrawCount: p.ribbonDrawCount,
        controller: (() => { const c = (window as unknown as { contourController?: ControllerBridge }).contourController; return c ? { records: c.records, results: c.results, error: c.error } : null; })() };
    });
    const contact = raw.history?.map(w => { try { const v = world(w); return { frame: w.frame, ...v, gap: v.feet - surfaceY(PLAINS_LEVEL, v.x), facing: w.henry!.transform.a }; } catch (error) { return { frame: w.frame, unavailable: String(error) }; } });
    await writeFile(info.outputPath('raw-frame-contact-input-history.json'), JSON.stringify({ ...raw, contact: contact ?? null,
      ...contourProvenance(info.config.metadata) }, null, 2));
    return null;
  } catch (error) { return String(error); }
}

const responseSourceHashes = Object.fromEntries(['tests/plains-contour-pilot.spec.ts', 'tests/plains-contour-response.ts', 'tests/hud-response-observation.ts'].map(path =>
  [path, createHash('sha256').update(readFileSync(new URL(`../${path}`, import.meta.url))).digest('hex')]));
const diskDigest = (path: string) => createHash('sha256').update(readFileSync(new URL(`../dist${path}`, import.meta.url))).digest('hex');
function bindResponses(page: Page, accept: (path: string) => boolean, recovering: () => boolean, blocked = new Set<object>()) {
  const observer = createContourResponseObserver();
  const requests: { id: number; url: string; path: string; recoveryAtEmission: boolean; blocked: boolean; failure?: string }[] = [];
  const byRequest = new Map<object, typeof requests[number]>();
  page.on('request', request => {
    const path = new URL(request.url()).pathname;
    if (!accept(path)) return;
    const row = { id: requests.length + 1, url: request.url(), path, recoveryAtEmission: recovering(), blocked: blocked.has(request) };
    requests.push(row); byRequest.set(request, row);
  });
  page.on('requestfailed', request => { const row = byRequest.get(request); if (row) row.failure = request.failure()?.errorText; });
  page.on('response', response => {
    if (!accept(new URL(response.url()).pathname)) return;
    const row = byRequest.get(response.request());
    observer.observe(response, { requestId: row?.id ?? null, recoveryAtEmission: row?.recoveryAtEmission ?? null });
  });
  return { observer, requests, byRequest };
}

for (const width of [426, 320]) test(`Plains contour ordinary input ${width}: rest jump joins and return`, async ({ page }, info) => {
  test.setTimeout(120_000);
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  const { observer: responseObserver, requests: transportRequests } = bindResponses(page,
    path => path.includes('/build-assets/') || path === '/assets/plains/manifest.json' || path.endsWith('/contour-prototype-v1/grass.png') || path.endsWith('/contour-prototype-v1/soil.png'), () => false);
  const served = responseObserver.records;
  await page.setViewportSize({ width, height: width === 426 ? 300 : 240 }); await install(page);
  const captures: object[] = [];
  const sourceHashes = Object.fromEntries(['src/world/plains-contour.ts', 'src/world/renderer.ts', 'src/world/trail-presentation.ts',
    'src/world/assets.ts', 'src/world/level.ts', 'public/assets/plains/contour-prototype-v1/grass.png',
    'public/assets/plains/contour-prototype-v1/soil.png', 'public/assets/plains/manifest.json', 'public/assets/henry/manifest.json', 'tests/plains-contour-pilot.spec.ts', 'tests/plains-contour-observer.ts', 'tests/plains-contour-controller.ts', 'tests/plains-contour-controller-browser.ts', 'tests/plains-contour-provenance.ts'].map(name =>
    [name, createHash('sha256').update(readFileSync(new URL(`../${name}`, import.meta.url))).digest('hex')]));
  const capture = async (name: string, kind: 'rest' | 'traversal' | 'airborne', intent?: { id: number }) => {
    if (kind === 'airborne') intent = await driveGoal(page, { mode: 'jump', target: 790, direction: 1 });
    const raw = await page.evaluate(id => {
      const c = (window as unknown as { contourController: ControllerBridge }).contourController;
      const result = id === undefined ? c.results.at(-1) : c.results.find(r => r.id === id);
      if (!result) throw new Error('No physically acknowledged same-frame controller readback');
      return result;
    }, intent?.id);
    const canvasPath = info.outputPath(`${name}-logical426-canvas.png`), viewportPath = info.outputPath(`${name}-viewport.png`);
    const canvasBytes = Buffer.from(raw.png!.split(',')[1], 'base64');
    // The controller already exported this physically acknowledged logical pose; its sole actuator continues during file/viewport latency.
    await writeFile(canvasPath, canvasBytes);
    const laterViewport = async () => {
      const before = await pose(page), bytes = await page.screenshot({ path: viewportPath }), after = await pose(page);
      return { bytes, before, after };
    };
    const viewport = await laterViewport(); // The single render-driven owner remains active throughout screenshot latency.
    const viewportBytes = viewport.bytes;
    captures.push({ name, kind, captureIntent: intent ?? null, accepted: raw.accepted, viewportBefore: viewport.before, viewportAfter: viewport.after, witness: raw.witness, status: raw.status, box: raw.box, logical: raw.logical, canvasPath, viewportPath, canvasSHA256: createHash('sha256').update(canvasBytes).digest('hex'), viewportSHA256: createHash('sha256').update(viewportBytes).digest('hex'),
      note: 'logical PNG is actual426x240 canvas export; viewport is a separate later display screenshot bracketed by observations, NOT the logical capture pose; controller resumes during screenshot latency' });
    expect(raw.logical).toEqual([426, 240]);
    const w = world(raw.witness);
    if (kind === 'airborne') expect(surfaceY(PLAINS_LEVEL, w.x) - w.feet).toBeGreaterThan(6);
    else expect(Math.abs(w.feet - surfaceY(PLAINS_LEVEL, w.x))).toBeLessThan(1);
    if (kind === 'rest') expect(Number(raw.status.match(/V (-?\d+)/)?.[1])).toBe(0);
    if (name.startsWith('return-')) expect(raw.witness.henry!.transform.a).toBeLessThan(0);
    await info.attach(`${name}-canvas`, { path: canvasPath, contentType: 'image/png' });
  };
  let primary: unknown;
  try {
    await page.goto('/?debug=1'); await page.getByRole('button', { name: 'Play PLAINS', exact: true }).click();
    await expect(page.locator('#status')).toContainText('Playing');
    for (const x of [620, 660, 700]) { const intent = await traverseTo(page, x, 1); await capture(`outward-contact-${x}`, 'traversal', intent); }
    await walkToFlat(page, 760); await capture('flat-rest-760', 'rest');
    for (const x of [950, 1035]) { const intent = await traverseTo(page, x, 1); await capture(`outward-contact-${x}`, 'traversal', intent); }
    for (const x of [900, 820, 660, 600]) { const intent = await traverseTo(page, x, -1); await capture(`return-contact-${x}`, 'traversal', intent); }
    await walkToFlat(page, 790); await capture('flat-rest-before-jump', 'rest');
    await capture('actual-jump', 'airborne');
    const postJumpIntent = await traverseTo(page, 950, 1); await capture('post-jump-grounded-950', 'traversal', postJumpIntent);
    for (const x of [820, 660]) { const intent = await traverseTo(page, x, -1); await capture(`return-after-jump-${x}`, 'traversal', intent); }
    await walkToFlat(page, 760); await capture('final-flat-rest', 'rest');
    const raster = await page.evaluate(({ columns, expectedGrass, expectedSoil }) => {
      const p = (window as unknown as { contourProbe: Probe }).contourProbe, ctx = p.ribbon!.getContext('2d')!;
      const top = Math.min(...columns.map(c => c.pixelContactY)) - 2, failures: object[] = [];
      for (const c of columns) { const rgba = ctx.getImageData(c.x - 580, c.pixelContactY - top, 1, 8).data;
        if (Array.from({ length: 8 }, (_, y) => rgba[y * 4 + 3]).some(a => a !== 255)) failures.push({ x: c.x }); }
      const cachePixels = ctx.getImageData(0, 0, p.ribbon!.width, p.ribbon!.height).data;
      const pixelFailures: object[] = []; let bodyPixelsCompared = 0;
      for (const c of columns) for (let y = c.pixelContactY; y < 240; y++) {
        const ay = y - c.pixelContactY + 2, ai = (ay * 80 + c.sourceX) * 4;
        const ci = (((y - c.pixelContactY - 8) % 64) * 64 + (c.x - 580) % 64) * 4;
        const expected = ay < 16 && expectedGrass[ai + 3] ? expectedGrass.slice(ai, ai + 4) : expectedSoil.slice(ci, ci + 4);
        const at = ((y - top) * p.ribbon!.width + c.x - 580) * 4;
        const actual = cachePixels.subarray(at, at + 4);
        if (actual.some((v, i) => v !== expected[i]) && pixelFailures.length < 20) pixelFailures.push({ x: c.x, y, actual: Array.from(actual), expected });
        if (y >= c.pixelContactY + 8) bodyPixelsCompared++;
      }
      return { pixelFailures, bodyPixelsCompared, soilDraws: p.soilDraws, soilURL: p.soil!.src, soilSize: [p.soil!.naturalWidth, p.soil!.naturalHeight],
        ribbonPNG: p.ribbon!.toDataURL('image/png'), ribbonPixels: Array.from(cachePixels), failures, columns: columns.length, sourceURL: p.source!.src, sourceSize: [p.source!.naturalWidth, p.source!.naturalHeight],
        sourceDraws: p.sourceDraws, ribbonSize: [p.ribbon!.width, p.ribbon!.height], ribbonDrawCount: p.ribbonDrawCount, history: p.history };
    }, { columns, expectedGrass, expectedSoil });
    await writeFile(info.outputPath('actual-ribbon-observer.json'), JSON.stringify(raster, null, 2));
    const ribbonBytes = Buffer.from(raster.ribbonPNG.split(',')[1], 'base64');
    await writeFile(info.outputPath('actual-A-C-cache.png'), ribbonBytes);
    await writeFile(info.outputPath('actual-A-C-cache-hashes.json'), JSON.stringify({ PNGsha256: createHash('sha256').update(ribbonBytes).digest('hex'), RGBAsha256: createHash('sha256').update(Buffer.from(raster.ribbonPixels)).digest('hex'), dimensions: raster.ribbonSize }, null, 2));
    expect(raster.pixelFailures).toEqual([]); expect(raster.soilSize).toEqual([64, 64]); expect(raster.soilDraws.length).toBeGreaterThanOrEqual(480); expect(raster.bodyPixelsCompared).toBeGreaterThan(0);
    expect(raster.failures).toEqual([]); expect(raster.columns).toBe(480); expect(raster.history.length).toBeGreaterThan(0);
    expect(raster.sourceDraws.length).toBeGreaterThanOrEqual(480); expect(raster.ribbonDrawCount).toBeGreaterThan(0);
    expect(raster.sourceSize).toEqual([80, 16]); expect(errors).toEqual([]);
    const grounded = raster.history.map((w, i) => ({ ...world(w), facing: w.henry!.transform.a, previous: i ? world(raster.history[i - 1]).x : world(w).x }));
    for (const join of [620, 660, 700, 760, 820, 880, 940, 980, 1020]) for (const direction of [1, -1]) for (const side of [-1, 1]) {
      expect(grounded.some(w => Math.sign(w.x - w.previous) === direction && (direction > 0 || w.facing < 0)
        && (side < 0 ? w.x >= join - 8 && w.x < join : w.x >= join && w.x <= join + 8)
        && Math.abs(w.feet - surfaceY(PLAINS_LEVEL, w.x)) < 1), `grounded join${join} side${side} direction${direction}`).toBe(true);
    }
    await responseObserver.settle(); responseObserver.assertComplete(['/assets/plains/manifest.json', '/assets/plains/contour-prototype-v1/grass.png', '/assets/plains/contour-prototype-v1/soil.png'], diskDigest);
    expect(served.length).toBeGreaterThan(1);
    expect(served.some(r => r.path.endsWith('/soil.png') && r.sha256 === '57aa4e04a67ec0a79c26a14b4c6a8baf63dbf06fed84e35a09204c3a4e064c85')).toBe(true);
    expect(served.some(r => r.path.endsWith('/grass.png') && r.sha256 === '618ea1e53cb017b5dfdb649fb48fd47eea7cea02b4abef165681e50da1e4a654')).toBe(true);
  } catch (error) { primary = error; throw error; } finally {
    const historyError = await saveRawHistory(page, info);
    const cleanup = await Promise.allSettled([release(page), responseObserver.settle()]);
    try {
      await writeFile(info.outputPath('pilot-evidence.json'), JSON.stringify({ kind: 'ordinary keyboard through real app; same-world-frame transform/manifest observations',
      ...contourProvenance(info.config.metadata), sourceHashes: { ...sourceHashes, ...responseSourceHashes }, transportRequests, project: info.project.name, width, captures, served, errors, historyError,
      cleanupErrors: cleanup.filter(r => r.status === 'rejected').map(r => String(r.reason)) }, null, 2));
    } catch (error) { if (!primary) throw error; console.error('Evidence write unavailable', String(error)); }
    if (historyError && !primary) throw new Error(`Raw history unavailable: ${historyError}`);
  }
});

for (const required of ['grass', 'soil'] as const) test(required === 'grass' ? 'Plains required contour image error offers ordinary Retry loading' : 'Plains required contour soil error offers ordinary Retry loading', async ({ page }, info) => {
  await install(page);
  let recovery = false;
  const blocked = new Set<object>();
  const { observer: responseObserver, requests, byRequest } = bindResponses(page, path => path.includes('/assets/plains/'), () => recovery, blocked);
  const responses = responseObserver.records;
  let recoveryWitnesses: ReturnType<typeof responseObserver.assertRecovery> | null = null;
  await page.route(`**/assets/plains/contour-prototype-v1/${required}.png`, async route => {
    blocked.add(route.request());
    const row = byRequest.get(route.request()); if (row) row.blocked = true;
    await route.abort();
  });
  let primary: unknown;
  try {
    await page.goto('/'); await expect(page.getByRole('button', { name: 'Retry loading', exact: true })).toBeVisible();
    expect(requests.some(r => r.path.endsWith(`/${required}.png`) && r.blocked && !!r.failure && !r.recoveryAtEmission)).toBe(true);
    await page.unroute(`**/assets/plains/contour-prototype-v1/${required}.png`); recovery = true;
    await page.getByRole('button', { name: 'Retry loading', exact: true }).click();
    await page.getByRole('button', { name: 'Play PLAINS', exact: true }).click();
    await expect(page.locator('#status')).toContainText('Playing');
    await driveGoal(page, { mode: 'traverse', target: 700, direction: 1 });
    const p = await pose(page); expect(p.coherent).toBe(true); expect(p.ribbonDrawCount).toBeGreaterThan(0);
    const sourceCount = await page.evaluate(() => (window as unknown as { contourProbe: Probe }).contourProbe.sourceDraws.length);
    expect(sourceCount).toBeGreaterThanOrEqual(480); await responseObserver.settle();
    const requiredPaths = ['/assets/plains/manifest.json', '/assets/plains/contour-prototype-v1/grass.png', '/assets/plains/contour-prototype-v1/soil.png'];
    recoveryWitnesses = responseObserver.assertRecovery(requiredPaths, `/assets/plains/contour-prototype-v1/${required}.png`, diskDigest);
    for (const witness of recoveryWitnesses) {
      expect(witness.body200.status).toBe(200); expect(witness.body200.bytes).toBeGreaterThan(0);
      expect(witness.body200.sha256).toBe(witness.body200.fileSha256);
    }
    const soilCount = await page.evaluate(() => (window as unknown as { contourProbe: Probe }).contourProbe.soilDraws.length); expect(soilCount).toBeGreaterThanOrEqual(480);
    expect(recoveryWitnesses.find(r => r.path.endsWith('/soil.png'))!.body200.sha256).toBe('57aa4e04a67ec0a79c26a14b4c6a8baf63dbf06fed84e35a09204c3a4e064c85');
    expect(recoveryWitnesses.find(r => r.path.endsWith('/grass.png'))!.body200.sha256).toBe('618ea1e53cb017b5dfdb649fb48fd47eea7cea02b4abef165681e50da1e4a654');
  } catch (error) { primary = error; throw error; } finally {
    const historyError = await saveRawHistory(page, info);
    const cleanup = await Promise.allSettled([release(page), responseObserver.settle()]);
    try {
      await writeFile(info.outputPath('retry-recovery-evidence.json'), JSON.stringify({ ...contourProvenance(info.config.metadata), sourceHashes: responseSourceHashes, required, requests, responses, recoveryWitnesses, historyError,
        cleanupErrors: cleanup.filter(r => r.status === 'rejected').map(r => String(r.reason)) }, null, 2));
    } catch (error) { if (!primary) throw error; console.error('Retry evidence write unavailable', String(error)); }
    if (historyError && !primary) throw new Error(`Raw retry history unavailable: ${historyError}`);
  }
});
