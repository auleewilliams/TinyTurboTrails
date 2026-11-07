import { afterEach, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { transformSync } from 'rolldown/utils';
import { FROST_RIDGE } from '../src/world/frost-ridge';
import { PLAINS_LEVEL } from '../src/world/level';
import { drawWorld } from '../src/world/renderer';
import { loadWorldAssets, loadWorldAssetMap } from '../src/world/assets';
import { drawFrostGround, frostGroundColumn, frostGroundIdentity, frostGroundWindows, loadFrostGround, validateFrostGround, type FrostGroundAssets } from '../src/world/frost-ground';

const root = new URL('../public/assets/frost/ground-ice-v1/', import.meta.url);
const manifest = JSON.parse(readFileSync(new URL('manifest.json', root), 'utf8'));
const hash = (b: Uint8Array): string => createHash('sha256').update(b).digest('hex');
// Pure production PNG helper read as inert code; no preparation entry is imported.
const pngModule = readFileSync(new URL('../scripts/spelling-stickers.mjs', import.meta.url), 'utf8');
import { crc32, inflateSync } from 'node:zlib';
const decode = new Function('crc32', 'inflateSync', pngModule.replace(/^import .*;\n/gm, '').replace(/\bexport /g, '') + '\nreturn decodePng;')(crc32, inflateSync) as (bytes: Buffer) => { width: number; height: number; data: Uint8Array };

function image(role: string): HTMLImageElement {
  const bytes = readFileSync(new URL(`${role}.png`, root));
  return { src: `/assets/frost/ground-ice-v1/${role}.png`, naturalWidth: bytes.readUInt32BE(16), naturalHeight: bytes.readUInt32BE(20), pixels: decode(bytes) } as unknown as HTMLImageElement;
}
function kit(): FrostGroundAssets { return { manifest: structuredClone(manifest), terrain: image('terrain'), ice: image('ice') }; }

/** Minimal unit canvas records the actual production ribbon draws and copies actual texels.
 * It does not replace the renderer or certify browser antialiasing/compositor output. */
function canvases() {
  const canvases: { width: number; height: number; calls: unknown[][]; samples: Map<string, number[]>; paths: number[][][]; getContext: () => unknown }[] = [];
  vi.stubGlobal('document', { createElement: () => {
    const canvas = { width: 0, height: 0, calls: [] as unknown[][], samples: new Map<string, number[]>(), paths: [] as number[][][], getContext: () => ctx };
    let path: number[][] = [];
    const ctx = new Proxy({ beginPath: () => { path = []; }, moveTo: (x: number, y: number) => path.push([x, y]), lineTo: (x: number, y: number) => path.push([x, y]), clip: () => canvas.paths.push(path), drawImage: (...args: unknown[]) => {
      canvas.calls.push(args);
      const [img, sx, sy, width, height, dx, dy] = args as [HTMLImageElement & { pixels?: ReturnType<typeof decode> }, number, number, number, number, number, number];
      if (img.pixels && width === 1) for (let y = 0; y < height; y++) {
        const i = ((sy + y) * img.pixels.width + sx) * 4;
        canvas.samples.set(`${dx},${dy + y}`, [...img.pixels.data.slice(i, i + 4)]);
      }
    } }, { get: (t, n) => n in t ? t[n as keyof typeof t] : () => {}, set: () => true });
    canvases.push(canvas); return canvas;
  } });
  return canvases;
}
afterEach(() => vi.unstubAllGlobals());

it('binds actual whole canonical sources, prepared PNGs and metadata identities', () => {
  validateFrostGround(manifest);
  for (const role of ['terrain', 'ice'] as const) {
    const bytes = readFileSync(new URL(`${role}.png`, root));
    expect(hash(bytes)).toBe(manifest[role].pngSHA256);
    expect(bytes).toEqual(readFileSync(new URL(`../assets/source/frost/ground-ice-v1/${role}.png`, import.meta.url)));
    const pixels = decode(bytes).data;
    expect(pixels.filter((_, i) => i % 4 === 3).every(a => a === 255)).toBe(true);
    for (const key of ['image', 'width', 'height', 'sourceSHA256', 'pngSHA256']) {
      const bad = structuredClone(manifest) as unknown as Record<string, Record<string, unknown>>; delete bad[role][key]; expect(() => validateFrostGround(bad)).toThrow();
    }
  }
});

it('keeps the exact half-open scope, conservative column origin and global phases through joins', () => {
  expect(frostGroundWindows(FROST_RIDGE)).toEqual([[2060, 2490], [3380, 3830]]);
  expect(frostGroundWindows(PLAINS_LEVEL)).toEqual([]);
  for (const [from, to] of frostGroundWindows(FROST_RIDGE)) for (let x = from; x < to; x++) {
    const s = FROST_RIDGE.surfaces.find(s => x >= s.x1 && x < s.x2)!;
    const y = (px: number): number => s.y1 + (s.y2 - s.y1) * (px - s.x1) / (s.x2 - s.x1);
    const c = frostGroundColumn(FROST_RIDGE, x), p = x % 16;
    expect(c).toEqual({ origin: Math.floor(Math.min(y(x), y(x + 1))), terrainX: x % 440, iceX: p < 8 ? p : 15 - p, ice: s.material === 'ice' });
    expect(680 - c.origin).toBeLessThanOrEqual(440);
  }
});

it('builds both real ribbons once, preserves fractional camera and invalidates same-size image or source replacements', () => {
  const built = canvases(), k = kit(), calls: unknown[][] = [];
  const ctx = { save() {}, restore() {}, drawImage: (...args: unknown[]) => calls.push(args) } as unknown as CanvasRenderingContext2D;
  drawFrostGround(ctx, k, FROST_RIDGE, { x: 2100.25, y: 440.5 });
  expect(built).toHaveLength(2); expect(calls[0].slice(1)).toEqual([-40.25, -200.5]);
  drawFrostGround(ctx, k, FROST_RIDGE, { x: 2100.75, y: 440.25 }); expect(built).toHaveLength(2);
  k.terrain = image('terrain'); drawFrostGround(ctx, k, FROST_RIDGE, { x: 0, y: 0 }); expect(built).toHaveLength(4);
  k.ice = image('ice'); drawFrostGround(ctx, k, FROST_RIDGE, { x: 0, y: 0 }); expect(built).toHaveLength(6);
  const before = frostGroundIdentity(k, FROST_RIDGE); k.terrain.src += '?replacement';
  expect(frostGroundIdentity(k, FROST_RIDGE)).not.toBe(before);
  drawFrostGround(ctx, k, FROST_RIDGE, { x: 0, y: 0 }); expect(built).toHaveLength(8);
  const changed = { ...FROST_RIDGE, surfaces: FROST_RIDGE.surfaces.map((s, i) => i === 13 ? { ...s, y2: s.y2 - .25 } : s) };
  drawFrostGround(ctx, k, changed, { x: 0, y: 0 }); expect(built).toHaveLength(10);
  drawFrostGround(ctx, undefined, PLAINS_LEVEL, { x: 0, y: 0 }); expect(built).toHaveLength(10);
  expect(() => drawFrostGround(ctx, undefined, FROST_RIDGE, { x: 0, y: 0 })).toThrow('required');
});

it('requires Terrain1/Ice1 source-object and RGBA witnesses from the actual drawWorld caller, including formerly exempt pilot floors', () => {
  const built = canvases(), k = kit(), calls: unknown[][] = [], clips: unknown[][] = [], groundPaths: number[][][] = [];
  let path: number[][] = [];
  const ctx = new Proxy({ beginPath: () => { path = []; }, moveTo: (x: number, y: number) => path.push([x, y]), lineTo: (x: number, y: number) => path.push([x, y]), clip: () => { if (path.length) groundPaths.push(path); }, drawImage: (...a: unknown[]) => calls.push(a), rect: (...a: unknown[]) => clips.push(a) }, { get: (t, n) => n in t ? t[n as keyof typeof t] : () => {}, set: () => true }) as unknown as CanvasRenderingContext2D;
  const assets = { manifest: { cellSize: 48, assets: {} }, atlas: {}, gems: {}, frostGround: k } as unknown as Parameters<typeof drawWorld>[1];
  const level = { ...FROST_RIDGE, entities: [], platforms: [], theme: { ...FROST_RIDGE.theme, parallax: [], scenery: false } };
  drawWorld(ctx, assets, level, { position: { x: 2100.25, y: 400.5 } } as Parameters<typeof drawWorld>[3]);
  expect(built).toHaveLength(2);
  // The real caller clips one connected polygon with every frozen vertex and unchanged camera.
  const expectedGround = [[FROST_RIDGE.surfaces[0].x1 - 2100.25, FROST_RIDGE.surfaces[0].y1 - 400.5], ...FROST_RIDGE.surfaces.map(s => [s.x2 - 2100.25, s.y2 - 400.5]), [5600 - 2100.25, 240], [-2100.25, 240]];
  expect(groundPaths).toContainEqual(expectedGround);
  for (const [wi, [from, to]] of frostGroundWindows(level).entries()) {
    const expectedBands = level.surfaces.filter(s => s.material === 'ice' && s.x1 < to && s.x2 > from).map(s => {
      const a = Math.max(from, s.x1), b = Math.min(to, s.x2), y = (x: number): number => s.y1 + (s.y2 - s.y1) * (x - s.x1) / (s.x2 - s.x1) - 240;
      return [[a - from, y(a)], [b - from, y(b)], [b - from, y(b) + 8], [a - from, y(a) + 8]];
    });
    expect(built[wi].paths).toEqual(expectedBands);
  }
  const terrainCalls = built.flatMap(c => c.calls).filter(c => c[0] === k.terrain), iceCalls = built.flatMap(c => c.calls).filter(c => c[0] === k.ice);
  expect(terrainCalls).toHaveLength(880); expect(iceCalls).toHaveLength(490);
  const witness = (x: number, depth: number, role: 'terrain' | 'ice'): void => {
    const wi = x < 2490 ? 0 : 1, from = wi === 0 ? 2060 : 3380, c = frostGroundColumn(level, x), expectedImage = k[role];
    const draws = built[wi].calls.filter(a => a[0] === expectedImage && a[5] === x - from);
    expect(draws).toHaveLength(1);
    const sourceX = role === 'ice' ? c.iceX : c.terrainX;
    expect(draws[0].slice(1)).toEqual([sourceX, 0, 1, role === 'ice' ? 8 : 680 - c.origin, x - from, c.origin - 240, 1, role === 'ice' ? 8 : 680 - c.origin]);
    const pixels = decode(readFileSync(new URL(`${role}.png`, root))), i = (depth * pixels.width + sourceX) * 4;
    expect(built[wi].samples.get(`${x - from},${c.origin - 240 + depth}`)).toEqual([...pixels.data.slice(i, i + 4)]);
  };
  for (const x of [2060, 2189, 2190, 2349, 3450, 3649]) witness(x, 3, 'ice');
  for (const x of [2350, 2489, 3380, 3449, 3650, 3829]) witness(x, 12, 'terrain');
  for (const x of [2060, 2189, 2190, 2350, 2489, 3380, 3450, 3650, 3829]) witness(x, 679 - frostGroundColumn(level, x).origin, 'terrain');
  // Every production terrain column reaches world680 using an unchanged whole-source texel.
  const terrainPixels = decode(readFileSync(new URL('terrain.png', root)));
  for (const [wi, [from, to]] of frostGroundWindows(level).entries()) for (let x = from; x < to; x++) {
    const c = frostGroundColumn(level, x), pixels = terrainPixels;
    const i = ((679 - c.origin) * 440 + c.terrainX) * 4;
    expect(built[wi].samples.get(`${x - from},439`)).toEqual([...pixels.data.slice(i, i + 4)]);
  }
  expect(calls.some(a => a[0] === k.ribbon!.windows[0].canvas)).toBe(true);
  expect(clips).toContainEqual([-100000 - 2100.25, -100000, 102060, 200000]);
  expect(clips).toContainEqual([2490 - 2100.25, -100000, 890, 200000]);
  // Missing source, wrong image identity, wrong phase and wrong texel cannot pass the witness.
  const original = built[0].calls.find(a => a[0] === k.terrain && a[5] === 290)!;
  original[0] = undefined; expect(() => witness(2350, 12, 'terrain')).toThrow(); original[0] = k.terrain;
  original[1] = Number(original[1]) + 1; expect(() => witness(2350, 12, 'terrain')).toThrow(); original[1] = 2350 % 440;
  built[0].samples.set('290,332', [0, 0, 0, 255]); expect(() => witness(2350, 12, 'terrain')).toThrow();
});

it('requires fresh actual Frost metadata/images, rejects missing/size/error and recovers on ordinary loader Retry in both asset paths', async () => {
  let missingDeclaration = false, missingMetadata = false, badSize = false, failed = '', scenery = false;
  const requests: string[] = [];
  const world = JSON.parse(readFileSync(new URL('../public/assets/frost/manifest.json', import.meta.url), 'utf8'));
  vi.stubGlobal('fetch', async (url: string) => {
    requests.push(url);
    if (missingMetadata && url.endsWith('/ground-ice-v1/manifest.json')) return { ok: false };
    const value = JSON.parse(readFileSync(new URL('../public/' + url.replace(/^\//, ''), import.meta.url), 'utf8'));
    if (url === '/assets/frost/manifest.json') { if (missingDeclaration) delete value.frostGround; if (scenery) value.scenery = '../plains/scenery/manifest.json'; else delete value.scenery; }
    return { ok: true, json: async () => value };
  });
  class Image {
    naturalWidth = 1; naturalHeight = 1; onload = () => {}; onerror = () => {};
    set src(url: string) {
      requests.push(url);
      const b = readFileSync(new URL('../public/' + url.replace(/^\//, ''), import.meta.url));
      if (b.toString('ascii', 1, 4) === 'PNG') { this.naturalWidth = b.readUInt32BE(16); this.naturalHeight = b.readUInt32BE(20); }
      if (badSize && url.includes('/ground-ice-v1/')) this.naturalWidth++;
      queueMicrotask(failed && url.endsWith(failed) ? this.onerror : this.onload);
    }
  }
  vi.stubGlobal('Image', Image);
  missingDeclaration = true; await expect(loadWorldAssets('frost')).rejects.toThrow('required Frost ground'); missingDeclaration = false;
  missingMetadata = true; await expect(loadWorldAssets('frost')).rejects.toThrow('Frost ground metadata'); missingMetadata = false;
  badSize = true; await expect(loadWorldAssets('frost')).rejects.toThrow('dimensions'); badSize = false;
  for (const role of ['terrain.png', 'ice.png']) { failed = role; await expect(loadWorldAssets('frost')).rejects.toThrow('Could not load Frost'); failed = ''; expect((await loadWorldAssets('frost')).frostGround).toBeDefined(); }
  const first = await loadWorldAssets('frost'); scenery = true; const second = (await loadWorldAssetMap(['frost'])).frost;
  expect(first.frostGround).toBeDefined(); expect(second.frostGround).toBeDefined(); expect(second.scenery).toBeDefined();
  expect(first.frostGround!.terrain).not.toBe(second.frostGround!.terrain); expect(first.frostGround!.ice).not.toBe(second.frostGround!.ice);
  expect(requests.filter(p => p.endsWith('/ground-ice-v1/manifest.json')).length).toBeGreaterThan(5);
  expect(world.frostGround).toBe('ground-ice-v1/manifest.json');
  await expect(loadFrostGround('', 'bad')).rejects.toThrow('declaration');
});

it('serialized helper guards reject absent real Frost dependencies instead of falling back', () => {
  const text = readFileSync(new URL('../src/world/frost-ground.ts', import.meta.url), 'utf8');
  const code = transformSync('frost-ground.ts', text.replace(/^import .*;\n/gm, '').replace(/\bexport /g, ''), {}).code;
  for (const name of ['frostGroundWindows', 'frostGroundIdentity', 'validateFrostGround', 'frostGroundColumn']) {
    const broken = code.replace(`function ${name}(`, `function removed_${name}(`);
    const draw = new Function(broken + '\nreturn drawFrostGround;')();
    canvases(); expect(() => draw({ save() {}, restore() {}, drawImage() {} }, kit(), FROST_RIDGE, { x: 0, y: 0 })).toThrow(ReferenceError);
  }
});
