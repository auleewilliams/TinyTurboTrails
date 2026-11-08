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
  const canvases: { width: number; height: number; calls: unknown[][]; samples: { get: (key: string) => number[] | undefined; set: (key: string, value: number[]) => unknown }; pixels: Uint8Array; paths: number[][][]; getContext: () => unknown }[] = [];
  vi.stubGlobal('document', { createElement: () => {
    const canvas = { width: 0, height: 0, calls: [] as unknown[][], pixels: new Uint8Array(), samples: { get: (key: string): number[] | undefined => { const [x, y] = key.split(',').map(Number); return [...canvas.pixels.slice((y * canvas.width + x) * 4, (y * canvas.width + x + 1) * 4)]; }, set: (key: string, value: number[]): void => { const [x, y] = key.split(',').map(Number); canvas.pixels.set(value, (y * canvas.width + x) * 4); } }, paths: [] as number[][][], getContext: () => ctx };
    let path: number[][] = [];
    const ctx = new Proxy({ beginPath: () => { path = []; }, moveTo: (x: number, y: number) => path.push([x, y]), lineTo: (x: number, y: number) => path.push([x, y]), clip: () => canvas.paths.push(path), drawImage: (...args: unknown[]) => {
      canvas.calls.push(args);
      if (!canvas.pixels.length) canvas.pixels = new Uint8Array(canvas.width * canvas.height * 4);
      const [img, sx, sy, width, height, dx, dy] = args as [HTMLImageElement & { pixels?: ReturnType<typeof decode> }, number, number, number, number, number, number];
      if (img.pixels && width === 1) for (let y = 0; y < height; y++) {
        const i = ((sy + y) * img.pixels.width + sx) * 4;
        canvas.pixels.set(img.pixels.data.subarray(i, i + 4), ((dy + y) * canvas.width + dx) * 4);
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
  expect(frostGroundWindows(FROST_RIDGE)).toEqual([[0, 5600]]);
  expect(frostGroundWindows(PLAINS_LEVEL)).toEqual([]);
  for (const [from, to] of frostGroundWindows(FROST_RIDGE)) for (let x = from; x < to; x++) {
    const s = FROST_RIDGE.surfaces.find(s => x >= s.x1 && x < s.x2)!;
    const y = (px: number): number => s.y1 + (s.y2 - s.y1) * (px - s.x1) / (s.x2 - s.x1);
    const c = frostGroundColumn(FROST_RIDGE, x), p = x % 16;
    expect(c).toEqual({ origin: Math.floor(Math.min(y(x), y(x + 1))), terrainX: x % 440, iceX: p < 8 ? p : 15 - p, ice: s.material === 'ice' });
    expect(680 - c.origin).toBeLessThanOrEqual(440);
  }
});

it('builds the continuous real ribbon once, preserves fractional camera and invalidates same-size image or source replacements', () => {
  const built = canvases(), k = kit(), calls: unknown[][] = [];
  const ctx = { save() {}, restore() {}, drawImage: (...args: unknown[]) => calls.push(args) } as unknown as CanvasRenderingContext2D;
  drawFrostGround(ctx, k, FROST_RIDGE, { x: 2100.25, y: 440.5 });
  expect(built).toHaveLength(1); expect(calls[0].slice(1)).toEqual([-2100.25, -200.5]);
  drawFrostGround(ctx, k, FROST_RIDGE, { x: 2100.75, y: 440.25 }); expect(built).toHaveLength(1);
  k.terrain = image('terrain'); drawFrostGround(ctx, k, FROST_RIDGE, { x: 0, y: 0 }); expect(built).toHaveLength(2);
  k.ice = image('ice'); drawFrostGround(ctx, k, FROST_RIDGE, { x: 0, y: 0 }); expect(built).toHaveLength(3);
  const before = frostGroundIdentity(k, FROST_RIDGE); k.terrain.src += '?replacement';
  expect(frostGroundIdentity(k, FROST_RIDGE)).not.toBe(before);
  drawFrostGround(ctx, k, FROST_RIDGE, { x: 0, y: 0 }); expect(built).toHaveLength(4);
  const changed = { ...FROST_RIDGE, surfaces: FROST_RIDGE.surfaces.map((s, i) => i === 13 ? { ...s, y2: s.y2 - .25 } : s) };
  drawFrostGround(ctx, k, changed, { x: 0, y: 0 }); expect(built).toHaveLength(5);
  drawFrostGround(ctx, undefined, PLAINS_LEVEL, { x: 0, y: 0 }); expect(built).toHaveLength(5);
  expect(() => drawFrostGround(ctx, undefined, FROST_RIDGE, { x: 0, y: 0 })).toThrow('required');
});

it('requires Terrain1/Ice1 source-object and RGBA witnesses from the actual drawWorld caller, including formerly exempt pilot floors', () => {
  const built = canvases(), k = kit(), calls: unknown[][] = [], clips: unknown[][] = [], groundPaths: number[][][] = [];
  let path: number[][] = [];
  const ctx = new Proxy({ beginPath: () => { path = []; }, moveTo: (x: number, y: number) => path.push([x, y]), lineTo: (x: number, y: number) => path.push([x, y]), clip: () => { if (path.length) groundPaths.push(path); }, drawImage: (...a: unknown[]) => calls.push(a), rect: (...a: unknown[]) => clips.push(a) }, { get: (t, n) => n in t ? t[n as keyof typeof t] : () => {}, set: () => true }) as unknown as CanvasRenderingContext2D;
  const assets = { manifest: { cellSize: 48, assets: {} }, atlas: {}, gems: {}, frostGround: k } as unknown as Parameters<typeof drawWorld>[1];
  const level = { ...FROST_RIDGE, entities: [], platforms: [], theme: { ...FROST_RIDGE.theme, parallax: [], scenery: false } };
  drawWorld(ctx, assets, level, { position: { x: 2100.25, y: 400.5 } } as Parameters<typeof drawWorld>[3]);
  expect(built).toHaveLength(1);
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
  expect(terrainCalls).toHaveLength(5600); expect(iceCalls).toHaveLength(1200);
  const sourcePixels = { terrain: decode(readFileSync(new URL('terrain.png', root))), ice: decode(readFileSync(new URL('ice.png', root))) };
  const witness = (x: number, depth: number, role: 'terrain' | 'ice'): void => {
    const wi = 0, from = 0, c = frostGroundColumn(level, x), expectedImage = k[role];
    const draws = built[wi].calls.filter(a => a[0] === expectedImage && a[5] === x - from);
    expect(draws).toHaveLength(1);
    const sourceX = role === 'ice' ? c.iceX : c.terrainX;
    expect(draws[0].slice(1)).toEqual([sourceX, 0, 1, role === 'ice' ? 8 : 680 - c.origin, x - from, c.origin - 240, 1, role === 'ice' ? 8 : 680 - c.origin]);
    const pixels = sourcePixels[role], i = (depth * pixels.width + sourceX) * 4;
    expect(built[wi].samples.get(`${x - from},${c.origin - 240 + depth}`)).toEqual([...pixels.data.slice(i, i + 4)]);
  };
  expect(level.surfaces).toHaveLength(35);
  for (const s of level.surfaces) {
    for (const x of [s.x1, Math.floor((s.x1 + s.x2) / 2), s.x2 - 1]) witness(x, 12, 'terrain');
    if (s.material === 'ice') for (let x = s.x1; x < s.x2; x++) witness(x, 3, 'ice');
  }
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
  const failures: number[] = [];
  let checkedTexels = 0;
  for (let x = 0; x < 5600; x++) {
    const c = frostGroundColumn(level, x), height = 680 - c.origin;
    expect(terrainCalls[x].slice(1)).toEqual([x % 440, 0, 1, height, x, c.origin - 240, 1, height]);
    for (let depth = c.ice ? 8 : 0; depth < height; depth++) {
      const actual = ((c.origin - 240 + depth) * 5600 + x) * 4;
      const expected = (depth * 440 + x % 440) * 4;
      if ([0, 1, 2, 3].some(ch => built[0].pixels[actual + ch] !== terrainPixels.data[expected + ch])) failures.push(x);
      checkedTexels++;
    }
  }
  expect(checkedTexels).toBeGreaterThan(1_000_000);
  expect(failures).toEqual([]);
  expect(() => frostGroundColumn(level, -1)).toThrow('gap');
  expect(() => frostGroundColumn(level, 5600)).toThrow('gap');
  expect(calls.some(a => a[0] === k.ribbon!.windows[0].canvas)).toBe(true);
  expect(clips).toContainEqual([-100000 - 2100.25, -100000, 100000, 200000]);
  expect(clips).toContainEqual([5600 - 2100.25, -100000, 94400, 200000]);
  expect(clips).toHaveLength(6);
  for (let x = 0; x < 5600; x++) {
    expect(clips.some(rect => x - 2100.25 >= Number(rect[0]) && x - 2100.25 < Number(rect[0]) + Number(rect[2]))).toBe(false);
  }
  // Missing source, wrong image identity, wrong phase and wrong texel cannot pass the witness.
  const original = built[0].calls.find(a => a[0] === k.terrain && a[5] === 2350)!;
  original[0] = undefined; expect(() => witness(2350, 12, 'terrain')).toThrow(); original[0] = k.terrain;
  original[1] = Number(original[1]) + 1; expect(() => witness(2350, 12, 'terrain')).toThrow(); original[1] = 2350 % 440;
  built[0].samples.set('2350,332', [0, 0, 0, 255]); expect(() => witness(2350, 12, 'terrain')).toThrow();
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

it('preserves both original pilot output regions byte for byte independently of global ribbon dimensions', () => {
  const record = JSON.parse(readFileSync(new URL('../assets/source/frost/ground-rollout-v1/presentation-delta.json', import.meta.url), 'utf8'));
  const original = record['src/world/frost-ground.ts'];
  expect(hash(Buffer.from(original.before))).toBe('97ee2ac8955540c9c41bb5b7d446f300f376c05d8f3d46e55d64c3ec6444362d');
  const code = transformSync('original.ts', original.before.replace(/^import .*;\n/gm, '').replace(/\bexport /g, ''), {}).code;
  const oldDraw = new Function(code + '\nreturn drawFrostGround;')() as typeof drawFrostGround;
  const built = canvases(), oldKit = kit(), newKit = kit();
  const calls: unknown[][] = [];
  const ctx = { save() {}, restore() {}, drawImage: (...a: unknown[]) => calls.push(a) } as unknown as CanvasRenderingContext2D;
  oldDraw(ctx, oldKit, FROST_RIDGE, { x: 2100.25, y: 440.5 });
  drawFrostGround(ctx, newKit, FROST_RIDGE, { x: 2100.25, y: 440.5 });
  expect(built).toHaveLength(3);
  const proof: { from: number; to: number; bytes: number; baselineRGBA: string; rolloutRGBA: string }[] = [];
  for (const [index, [from, to]] of [[2060, 2490], [3380, 3830]].entries()) {
    const prior = built[index], current = built[2], region = new Uint8Array((to - from) * 440 * 4);
    const bands = FROST_RIDGE.surfaces.filter(s => s.material === 'ice' && s.x1 < to && s.x2 > from);
    expect(prior.paths).toHaveLength(bands.length);
    for (const [bandIndex, s] of bands.entries()) {
      const left = Math.max(from, s.x1), right = Math.min(to, s.x2);
      const at = (x: number): number => s.y1 + (s.y2 - s.y1) * (x - s.x1) / (s.x2 - s.x1) - 240;
      const expected = [[left - from, at(left)], [right - from, at(right)], [right - from, at(right) + 8], [left - from, at(left) + 8]];
      expect(prior.paths[bandIndex]).toEqual(expected);
      expect(current.paths).toContainEqual([[s.x1, at(s.x1)], [s.x2, at(s.x2)], [s.x2, at(s.x2) + 8], [s.x1, at(s.x1) + 8]]);
    }
    for (let y = 0; y < 440; y++) region.set(current.pixels.subarray((y * 5600 + from) * 4, (y * 5600 + to) * 4), y * (to - from) * 4);
    expect(region.byteLength).toBe((to - from) * 440 * 4);
    expect(Buffer.from(region).equals(Buffer.from(prior.pixels))).toBe(true);
    expect(hash(region)).toBe(hash(prior.pixels));
    proof.push({ from, to, bytes: region.byteLength, baselineRGBA: hash(prior.pixels), rolloutRGBA: hash(region) });
    // Old and new ribbons land at the identical fractional world phase.
    expect(Number(calls[index][1]) - Number(calls[2][1])).toBe(from);
    expect(calls[index][2]).toBe(calls[2][2]);
  }
  console.info('FROST_PILOT_SOFTWARE_RGBA ' + JSON.stringify(proof));
});
