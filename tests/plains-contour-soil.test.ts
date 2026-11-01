import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runInNewContext } from 'node:vm';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { expect, it, vi } from 'vitest';
import { drawPlainsContourGround, plainsContourColumns } from '../src/world/plains-contour';
import { PLAINS_LEVEL } from '../src/world/level';
import { QUARRY_RUN } from '../src/world/levels';
import { loadWorldAssets, type WorldAssets } from '../src/world/assets';
const require = createRequire(import.meta.url);
const { decodePng, encodePng } = require('../scripts/spelling-stickers.mjs') as {
  decodePng(b: Uint8Array): { width: number; height: number; data: Uint8Array };
  encodePng(im: { width: number; height: number; data: Uint8Array }): Buffer;
};
const { preparePlainsSoil, verifyPlainsSoil } = require('../scripts/plains-soil.mjs') as {
  preparePlainsSoil(b: Uint8Array): { width: number; height: number; data: Uint8Array };
  verifyPlainsSoil(b: Uint8Array, c: Uint8Array): unknown;
};
const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url));
const hash = (p: Uint8Array) => createHash('sha256').update(p).digest('hex');
const grass = { ...decodePng(read('public/assets/plains/contour-prototype-v1/grass.png')), naturalWidth: 80, naturalHeight: 16 };
const soilBytes = read('public/assets/plains/contour-prototype-v1/soil.png');
const soil = { ...decodePng(soilBytes), naturalWidth: 64, naturalHeight: 64 };
it('reproduces all4096 whole-field source samples, rejects source/native mutations and preserves exact C/A bytes', () => {
  const source = read('assets/source/plains/contour-prototype-v1/soil/original-C-R2.png'), decoded = decodePng(source), native = preparePlainsSoil(source);
  expect(hash(soilBytes)).toBe('57aa4e04a67ec0a79c26a14b4c6a8baf63dbf06fed84e35a09204c3a4e064c85');
  expect(hash(native.data)).toBe('9107d72ea692c52ab641d4b51c32807a58cc0049eb0614c17197ba0f18f61ada');
  const expected = new Uint8Array(16384);
  for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
    const i = (Math.floor((y + 0.5) * 1254 / 64) * 1254 + Math.floor((x + 0.5) * 1254 / 64)) * 4;
    expected.set(decoded.data.subarray(i, i + 4), (y * 64 + x) * 4);
  }
  expect(native.data).toEqual(expected); verifyPlainsSoil(source, soilBytes);
  const badSource = Buffer.from(source); badSource[100] ^= 1;
  expect(() => preparePlainsSoil(badSource)).toThrow(/immutable source changed/);
  const bad = { ...soil, data: soil.data.slice() }; bad.data[0] ^= 1;
  expect(() => verifyPlainsSoil(source, encodePng(bad))).toThrow(/canonical PNG changed/);
  expect(hash(read('public/assets/plains/contour-prototype-v1/grass.png'))).toBe('618ea1e53cb017b5dfdb649fb48fd47eea7cea02b4abef165681e50da1e4a654');
});
class PixelCanvas {
  width = 0; height = 0; pixels = new Map<string, number[]>(); draws: unknown[][] = []; imageSmoothingEnabled = true;
  globalAlpha = 1; stack: boolean[] = [];
  getContext() { return this; } save() { this.stack.push(this.imageSmoothingEnabled); } restore() { this.imageSmoothingEnabled = this.stack.pop()!; }
  drawImage(image: unknown, ...args: number[]) {
    this.draws.push([image, ...args]);
    const src = image as PixelCanvas & { data?: Uint8Array };
    const at = (x: number, y: number) => src.data ? Array.from(src.data.subarray((y * src.width + x) * 4, (y * src.width + x) * 4 + 4)) : src.pixels.get(`${x},${y}`);
    if (args.length === 8) {
      const [sx, sy, sw, sh, dx, dy, dw, dh] = args;
      for (let y = 0; y < dh; y++) for (let x = 0; x < dw; x++) { const p = at(Math.floor(sx + (x + 0.5) * sw / dw), Math.floor(sy + (y + 0.5) * sh / dh)); if (p?.[3]) this.pixels.set(`${dx + x},${dy + y}`, p); }
    } else {
      const [dx, dy] = args;
      for (let y = 0; y < this.height; y++) for (let x = 0; x < this.width; x++) { const p = at(Math.floor(x + 0.5 - dx), Math.floor(y + 0.5 - dy)); if (p?.[3]) this.pixels.set(`${x},${y}`, p); }
    }
  }
}
it('uses actual cached A+C pixels through bottom, joins and fractional cameras; preserves A and outside cutoffs', () => {
  const kit = { image: grass, soil }; const canvases: PixelCanvas[] = [];
  vi.stubGlobal('document', { createElement: () => { const c = new PixelCanvas(); canvases.push(c); return c; } });
  try {
    const columns = plainsContourColumns(PLAINS_LEVEL), errors: object[] = [];
    for (const cameraX of [-1, 0, 0.25, 570, 600.25, 659.5, 760.75, 1040.25, 1180.25, 2300.75, 2750.5, 3874, 4290.25]) {
      const target = new PixelCanvas(); target.width = 426; target.height = 240;
      drawPlainsContourGround(target as unknown as CanvasRenderingContext2D, { plainsContour: kit } as unknown as WorldAssets, PLAINS_LEVEL, { x: cameraX, y: 0 });
      expect(target.draws).toHaveLength(1); expect(target.imageSmoothingEnabled).toBe(true); expect(target.stack).toHaveLength(0);
      for (let x = 0; x < 426; x++) {
        const wx = 580 + Math.floor(x + 0.5 - (580 - cameraX));
        if (wx < 0 || wx >= 4300) { if (target.pixels.has(`${x},239`)) errors.push({ outside: wx }); continue; }
        const col = columns[wx];
        for (let y = col.pixelContactY; y < 240; y++) {
          const ay = y - col.pixelContactY + 2, ai = (ay * 80 + col.sourceX) * 4;
          const a = ay < 16 ? grass.data.slice(ai, ai + 4) : null;
          const ci = (((y - (col.pixelContactY + 8)) % 64) * 64 + ((wx - 580) % 64 + 64) % 64) * 4;
          const expected = a?.[3] ? a : soil.data.slice(ci, ci + 4), actual = target.pixels.get(`${x},${y}`);
          if (!actual || actual.some((v, i) => v !== expected[i]) || actual[3] !== 255) { if (errors.length < 8) errors.push({ x: wx, y, actual, expected: [...expected] }); }
        }
      }
    }
    expect(errors).toEqual([]); expect(canvases).toHaveLength(1);
    expect(canvases[0].draws.filter(d => d[0] === grass)).toHaveLength(4300);
    const shifted = new PixelCanvas(); shifted.width = 426; shifted.height = 240;
    drawPlainsContourGround(shifted as unknown as CanvasRenderingContext2D, { plainsContour: kit } as unknown as WorldAssets, PLAINS_LEVEL, { x: 600.25, y: 5.25 });
    expect(canvases).toHaveLength(2); expect(canvases[1].height).toBe(120);
    const wx = 580 + Math.floor(100.5 - (580 - 600.25)), col = columns[wx], wy = 126 + Math.floor(239.5 - (126 - 5.25));
    const ci = (((wy - col.pixelContactY - 8) % 64) * 64 + ((wx - 580) % 64 + 64) % 64) * 4;
    expect(shifted.pixels.get('100,239')).toEqual(Array.from(soil.data.slice(ci, ci + 4)));
    expect(() => drawPlainsContourGround(shifted as unknown as CanvasRenderingContext2D, { plainsContour: { image: grass, soil: { ...soil, naturalWidth: 63 } } } as unknown as WorldAssets, PLAINS_LEVEL, { x: 0, y: 0 })).toThrow(/soil image dimensions/);
    const untouched = new PixelCanvas();
    expect(drawPlainsContourGround(untouched as unknown as CanvasRenderingContext2D, { plainsContour: kit } as unknown as WorldAssets, QUARRY_RUN, { x: 0, y: 0 })).toBe(false);
    expect(untouched.draws).toHaveLength(0);
    const refreshed = { plainsContour: kit } as unknown as WorldAssets;
    drawPlainsContourGround(untouched as unknown as CanvasRenderingContext2D, refreshed, { ...PLAINS_LEVEL }, { x: 0, y: 0 });
    expect(canvases).toHaveLength(3); // A different level object cannot reuse stale geometry.
    kit.soil = { ...soil };
    drawPlainsContourGround(untouched as unknown as CanvasRenderingContext2D, refreshed, PLAINS_LEVEL, { x: 0, y: 0 });
    expect(canvases).toHaveLength(4); // Same-sized source replacement still invalidates soil cache.
    expect(canvases[3].draws.some(d => d[0] === kit.soil)).toBe(true);
  } finally { vi.unstubAllGlobals(); }
});
it('requires declared C dimensions/path/grass and propagates missing-image errors while undeclared grass-only remains valid', async () => {
  const original = JSON.parse(read('public/assets/plains/manifest.json').toString()); delete original.scenery; delete original.plainsContourSoil;
  let manifest = { ...original, plainsContourSoil: 'contour-prototype-v1/soil.png' }, mode = 'ok';
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => manifest })));
  class ImageProbe {
    naturalWidth = 80; naturalHeight = 16; onload = () => {}; onerror = () => {};
    set src(url: string) { if (url.endsWith('/soil.png')) { this.naturalWidth = mode === 'size' ? 63 : 64; this.naturalHeight = 64; if (mode === 'missing') { queueMicrotask(this.onerror); return; } } queueMicrotask(this.onload); }
  }
  vi.stubGlobal('Image', ImageProbe);
  try {
    mode = 'missing'; await expect(loadWorldAssets('plains')).rejects.toThrow(/Plains contour soil/);
    mode = 'size'; await expect(loadWorldAssets('plains')).rejects.toThrow(/soil image dimensions/);
    mode = 'ok'; expect((await loadWorldAssets('plains')).plainsContour).toHaveProperty('soil');
    manifest = { ...original, plainsContourSoil: 'wrong.png' }; await expect(loadWorldAssets('plains')).rejects.toThrow(/soil declaration/);
    manifest = { ...original, plainsContourSoil: 'contour-prototype-v1/soil.png' }; delete manifest.plainsContour;
    await expect(loadWorldAssets('plains')).rejects.toThrow(/soil declaration/);
    manifest = original; const legacy = await loadWorldAssets('plains'); expect(legacy.plainsContour?.image.naturalWidth).toBe(80); expect(legacy.plainsContour?.soil).toBeUndefined();
  } finally { vi.unstubAllGlobals(); }
});

it('checks every full-cache source pixel, detects outside-pilot sabotage, and measures actual cache attachment transport', async () => {
  const { readContourCache } = await import('./plains-contour-artwork');
  const { createContourEvidence, retainContourCache } = await import('./plains-contour-evidence');
  const { mkdtempSync, writeFileSync } = await import('node:fs');
  const { join, dirname } = await import('node:path');
  const dir = mkdtempSync(join(tmpdir(), 'actual-contour-cache-software-'));
  const cache = new PixelCanvas();
  vi.stubGlobal('document', { createElement: () => cache });
  try {
    drawPlainsContourGround(new PixelCanvas() as unknown as CanvasRenderingContext2D, { plainsContour: { image: grass, soil } } as unknown as WorldAssets, PLAINS_LEVEL, { x: 0, y: 0 });
    const data = new Uint8Array(cache.width * cache.height * 4);
    for (const [position, rgba] of cache.pixels) { const [x, y] = position.split(',').map(Number); data.set(rgba, (y * cache.width + x) * 4); }
    const png = encodePng({ width: cache.width, height: cache.height, data });
    const context = { getImageData: (x: number, y: number, width: number, height: number) => {
      const out = new Uint8ClampedArray(width * height * 4);
      for (let row = 0; row < height; row++) out.set(data.subarray(((y + row) * cache.width + x) * 4, ((y + row) * cache.width + x + width) * 4), row * width * 4);
      return { data: out };
    } };
    vi.stubGlobal('window', { contourProbe: { ribbon: { width: cache.width, height: cache.height, getContext: () => context, toDataURL: () => 'data:image/png;base64,' + png.toString('base64') },
      source: grass, soil, sourceDraws: cache.draws.filter(d => d[0] === grass).map(d => d.slice(1)), soilDraws: cache.draws.filter(d => d[0] === soil).map(d => d.slice(1)), ribbonDrawCount: 1, history: [] } });
    const page = { evaluate: (fn: (v: unknown) => unknown, args: unknown) => fn(args) } as unknown as import('@playwright/test').Page;
    const raster = await readContourCache(page);
    expect(raster.pixelFailures).toEqual([]); expect(raster.failures).toEqual([]);
    expect(raster.ribbonSize).toEqual([4300, 114]); expect(raster.columns).toBe(4300);
    for (const wx of [0, 579, 580, 1059, 1180, 2342, 4299]) {
      const column = plainsContourColumns(PLAINS_LEVEL)[wx];
      const at = ((column.pixelContactY + 10 - 126) * cache.width + wx) * 4;
      data[at] ^= 1;
      const bad = await readContourCache(page);
      expect(bad.pixelFailures.some(f => (f as { x: number }).x === wx), `sabotage x${wx}`).toBe(true);
      data[at] ^= 1;
    }
    const rows: { name: string; path?: string; body?: string | Buffer; contentType: string }[] = [];
    const evidence = createContourEvidence({ outputPath: (...p) => join(dir, ...p), attach: async (name, options) => { rows.push({ name, ...options }); } });
    const stored = await retainContourCache(evidence, raster);
    await evidence.observe('actual-ribbon-observer', stored);
    await evidence.assertIntegrity();
    const reporterSource = readFileSync(join(dirname(require.resolve('playwright/package.json')), 'lib/runner/index.js'), 'utf8');
    const start = reporterSource.indexOf('var JSONReporter = class'), end = reporterSource.indexOf('async function outputReport(', start);
    expect(start).toBeGreaterThan(0);
    const Klass = new Function(reporterSource.slice(start, end) + ';return JSONReporter;')() as { prototype: { _serializeTestResult(r: unknown, t: unknown): { attachments: { body?: string; path?: string }[] } } };
    const reporter = Object.create(Klass.prototype) as typeof Klass.prototype;
    const serialize = (attachments: unknown[]) => reporter._serializeTestResult({ steps: [], errors: [], stdout: [], stderr: [], startTime: new Date('2000-01-01T00:00:00Z'), annotations: [], status: 'passed', attachments }, {});
    const fileReport = serialize(rows), inlineReport = serialize([{ name: 'prior-array-format', body: Buffer.from(JSON.stringify(raster, null, 2)), contentType: 'application/json' }]);
    expect(fileReport.attachments.every(a => a.path && !a.body)).toBe(true);
    const fileReporterBytes = Buffer.byteLength(JSON.stringify(fileReport)), priorArrayReporterBytes = Buffer.byteLength(JSON.stringify(inlineReport));
    expect(fileReporterBytes).toBeLessThan(priorArrayReporterBytes);
    writeFileSync(join(dir, 'attachment-measurement.json'), JSON.stringify({ kind: 'actual runtime full-width SOFTWARE cache through installed JSON reporter; NOT native or a full-CI report', dimensions: raster.ribbonSize,
      rgbaBytes: data.length, pngBytes: png.length, metadataBytes: readFileSync(join(dir, 'actual-ribbon-observer.json')).length,
      fileReporterBytes, priorArrayReporterBytes, previousActualFullCIReportBytes: 420999426, rawRGBAReconstructedAndVerified: true, allColumnsCompared: raster.columns, bodyPixelsCompared: raster.bodyPixelsCompared }, null, 2) + '\n');
  } finally { vi.unstubAllGlobals(); }
});

it.each([[0,"actual-contour-cache-software-"]] as const)('portable temp provider at callsite %s (%s), with synthetic missing/supplied environment', (index: number, prefix: string) => {
  const source = readFileSync(new URL(import.meta.url), 'utf8');
  const declarations = [...source.matchAll(/^ *const dir = mkdtempSync\(join\([^\n]+\);$/gm)].map(match => match[0].trim());
  expect(declarations).toHaveLength(1);
  // Execute the live callsite; erase only its old TypeScript non-null assertion.
  const declaration = declarations[index].replace('process.env.TMPDIR!', 'process.env.TMPDIR');
  for (const env of [{}, { TMPDIR: '/synthetic/supplied' }] as Record<string, string>[]) {
    const expected = env.TMPDIR ?? '/synthetic/os-temp', calls: string[] = [];
    const dir = runInNewContext('(() => { ' + declaration + ' return dir; })()', {
      process: { env }, tmpdir: () => expected, join,
      mkdtempSync: (value: string) => { calls.push(value); return value + 'case'; },
    });
    expect(calls).toEqual([join(expected, prefix)]);
    expect(dir).toBe(join(expected, prefix + 'case'));
  }
});
