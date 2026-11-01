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
    for (const cameraX of [570, 600.25, 659.5, 760.75, 1040.25]) {
      const target = new PixelCanvas(); target.width = 426; target.height = 240;
      drawPlainsContourGround(target as unknown as CanvasRenderingContext2D, { plainsContour: kit } as unknown as WorldAssets, PLAINS_LEVEL, { x: cameraX, y: 0 });
      expect(target.draws).toHaveLength(1); expect(target.imageSmoothingEnabled).toBe(true); expect(target.stack).toHaveLength(0);
      for (let x = 0; x < 426; x++) {
        const wx = 580 + Math.floor(x + 0.5 - (580 - cameraX));
        if (wx < 580 || wx >= 1060) { if (target.pixels.has(`${x},239`)) errors.push({ outside: wx }); continue; }
        const col = columns[wx - 580];
        for (let y = col.pixelContactY; y < 240; y++) {
          const ay = y - col.pixelContactY + 2, ai = (ay * 80 + col.sourceX) * 4;
          const a = ay < 16 ? grass.data.slice(ai, ai + 4) : null;
          const ci = (((y - (col.pixelContactY + 8)) % 64) * 64 + (wx - 580) % 64) * 4;
          const expected = a?.[3] ? a : soil.data.slice(ci, ci + 4), actual = target.pixels.get(`${x},${y}`);
          if (!actual || actual.some((v, i) => v !== expected[i]) || actual[3] !== 255) { if (errors.length < 8) errors.push({ x: wx, y, actual, expected: [...expected] }); }
        }
      }
    }
    expect(errors).toEqual([]); expect(canvases).toHaveLength(1);
    expect(canvases[0].draws.filter(d => d[0] === grass)).toHaveLength(480);
    const shifted = new PixelCanvas(); shifted.width = 426; shifted.height = 240;
    drawPlainsContourGround(shifted as unknown as CanvasRenderingContext2D, { plainsContour: kit } as unknown as WorldAssets, PLAINS_LEVEL, { x: 600.25, y: 5.25 });
    expect(canvases).toHaveLength(2); expect(canvases[1].height).toBe(106);
    const wx = 580 + Math.floor(100.5 - (580 - 600.25)), col = columns[wx - 580], wy = 140 + Math.floor(239.5 - (140 - 5.25));
    const ci = (((wy - col.pixelContactY - 8) % 64) * 64 + (wx - 580) % 64) * 4;
    expect(shifted.pixels.get('100,239')).toEqual(Array.from(soil.data.slice(ci, ci + 4)));
    expect(() => drawPlainsContourGround(shifted as unknown as CanvasRenderingContext2D, { plainsContour: { image: grass, soil: { ...soil, naturalWidth: 63 } } } as unknown as WorldAssets, PLAINS_LEVEL, { x: 0, y: 0 })).toThrow(/soil image dimensions/);
    const untouched = new PixelCanvas();
    expect(drawPlainsContourGround(untouched as unknown as CanvasRenderingContext2D, { plainsContour: kit } as unknown as WorldAssets, QUARRY_RUN, { x: 0, y: 0 })).toBe(false);
    expect(untouched.draws).toHaveLength(0);
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
