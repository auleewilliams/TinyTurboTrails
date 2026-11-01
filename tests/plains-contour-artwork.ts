import type { Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { PLAINS_LEVEL } from '../src/world/level';
import { plainsContourColumns, plainsContourRange } from '../src/world/plains-contour';
import { createContourObserver, type ContourObserverConfig } from './plains-contour-observer';
type Witness = ReturnType<ReturnType<typeof createContourObserver>['snapshot']>;
export interface Probe {
  soilDraws: number[][]; soil: HTMLImageElement | null;
  sourceDraws: number[][]; ribbon: HTMLCanvasElement | null; source: HTMLImageElement | null;
  ribbonDrawCount: number; history: Witness[]; snapshot(status: string): Witness;
}
const henryManifest = JSON.parse(readFileSync(new URL('../public/assets/henry/manifest.json', import.meta.url), 'utf8'));
const { decodePng } = createRequire(import.meta.url)('../scripts/spelling-stickers.mjs') as { decodePng(b: Uint8Array): { data: Uint8Array } };
const expectedGrass = Array.from(decodePng(readFileSync(new URL('../public/assets/plains/contour-prototype-v1/grass.png', import.meta.url))).data);
const expectedSoil = Array.from(decodePng(readFileSync(new URL('../public/assets/plains/contour-prototype-v1/soil.png', import.meta.url))).data);
export const contourColumns = plainsContourColumns(PLAINS_LEVEL);
export const contourRibbonTop = Math.min(...contourColumns.map(c => c.pixelContactY)) - 2;
export const contourArtworkConfig: ContourObserverConfig & { image: string } = { ribbonReferenceOffsetX: 580 - plainsContourRange(PLAINS_LEVEL)!.from, image: henryManifest.image, sky: PLAINS_LEVEL.theme.sky, width: 426, height: 240,
  anchor: henryManifest.anchor, logicalSize: henryManifest.logicalSize };
export function observeContour(configuration: ContourObserverConfig & { image: string }, factory: typeof createContourObserver): void {
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

export async function installContourArtworkObserver(page: Page): Promise<void> {
  await page.addInitScript({ content: `(${observeContour.toString()})(${JSON.stringify(contourArtworkConfig)}, ${createContourObserver.toString()});` });
}

export async function readContourCache(page: Page) {
  const raster = await page.evaluate(({ columns, expectedGrass, expectedSoil, from }) => {
    const p = (window as unknown as { contourProbe: Probe }).contourProbe, ctx = p.ribbon!.getContext('2d')!;
    const top = Math.min(...columns.map(c => c.pixelContactY)) - 2, failures: object[] = [];
    for (const c of columns) { const rgba = ctx.getImageData(c.x - from, c.pixelContactY - top, 1, 8).data;
      if (Array.from({ length: 8 }, (_, y) => rgba[y * 4 + 3]).some(a => a !== 255)) failures.push({ x: c.x }); }
    const cachePixels = ctx.getImageData(0, 0, p.ribbon!.width, p.ribbon!.height).data;
    const pixelFailures: object[] = []; let bodyPixelsCompared = 0;
    for (const c of columns) for (let y = c.pixelContactY; y < 240; y++) {
      const ay = y - c.pixelContactY + 2, ai = (ay * 80 + c.sourceX) * 4;
      const ci = (((y - c.pixelContactY - 8) % 64) * 64 + ((c.x - 580) % 64 + 64) % 64) * 4;
      const expected = ay < 16 && expectedGrass[ai + 3] ? expectedGrass.slice(ai, ai + 4) : expectedSoil.slice(ci, ci + 4);
      const at = ((y - top) * p.ribbon!.width + c.x - from) * 4;
      const actual = cachePixels.subarray(at, at + 4);
      if (actual.some((v, i) => v !== expected[i]) && pixelFailures.length < 20) pixelFailures.push({ x: c.x, y, actual: Array.from(actual), expected });
      if (y >= c.pixelContactY + 8) bodyPixelsCompared++;
    }
    // Encode the independent raw readback, not the canvas PNG; keep native byte order.
    const chunks: string[] = [];
    for (let at = 0; at < cachePixels.length; at += 32768) {
      chunks.push(String.fromCharCode(...cachePixels.subarray(at, at + 32768)));
    }
    return { pixelFailures, bodyPixelsCompared, soilDraws: p.soilDraws, soilURL: p.soil!.src, soilSize: [p.soil!.naturalWidth, p.soil!.naturalHeight],
      ribbonPNG: p.ribbon!.toDataURL('image/png'), ribbonPixels: btoa(chunks.join('')), failures, columns: columns.length, sourceURL: p.source!.src, sourceSize: [p.source!.naturalWidth, p.source!.naturalHeight],
      sourceDraws: p.sourceDraws, ribbonSize: [p.ribbon!.width, p.ribbon!.height], ribbonDrawCount: p.ribbonDrawCount, history: p.history };
  }, { columns: contourColumns, expectedGrass, expectedSoil, from: plainsContourRange(PLAINS_LEVEL)!.from });
  const dimensions: unknown = raster?.ribbonSize, payload: unknown = raster?.ribbonPixels;
  if (!Array.isArray(dimensions) || dimensions.length !== 2
    || !dimensions.every(value => Number.isSafeInteger(value) && value > 0)) throw new Error('Invalid contour raw dimensions');
  const byteLength = dimensions[0] * dimensions[1] * 4;
  if (!Number.isSafeInteger(byteLength) || typeof payload !== 'string' || !payload.length
    || payload.length !== Math.ceil(byteLength / 3) * 4 || !/^[A-Za-z0-9+/]*={0,2}$/.test(payload)) throw new Error('Invalid contour raw transport');
  const bytes = Buffer.from(payload, 'base64');
  if (bytes.length !== byteLength || bytes.toString('base64') !== payload) throw new Error('Invalid contour raw canonical bytes');
  return { ...raster, ribbonPixels: Array.from(bytes) };
}
