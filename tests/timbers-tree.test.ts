import { afterEach, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { TREETOP_TIMBERS } from '../src/world/treetop-timbers';
import { loadWorldAssets, WORLD_ASSETS, type WorldAssets } from '../src/world/assets';
import { validateTimbersTree, loadTimbersTree, drawTimbersTree } from '../src/world/timbers-tree';
import { drawTimberTrunk } from '../src/world/renderer';

const manifest = JSON.parse(readFileSync(new URL('../public/assets/timbers/tree-v1/manifest.json', import.meta.url), 'utf8'));
afterEach(() => vi.unstubAllGlobals());

it('grounds the whole substantial tree base on one unchanged authored surface', () => {
  validateTimbersTree(manifest);
  const left = manifest.x + manifest.baseLeft, right = manifest.x + manifest.baseRight;
  const matches = TREETOP_TIMBERS.surfaces.filter(surface => surface.x1 <= left && surface.x2 >= right
    && surface.y1 === manifest.groundY && surface.y2 === manifest.groundY);
  expect(matches).toHaveLength(1);
  expect(manifest.y + manifest.basePlane).toBe(matches[0].y1);
  expect(right - left).toBe(210);
  for (const change of [{ y: manifest.y + 1 }, { basePlane: 939 }, { width: 575 }, { image: '../environment.png' }]) {
    expect(() => validateTimbersTree({ ...manifest, ...change })).toThrow();
  }
});

it('draws one whole native tree with original alpha and bypasses the legacy trunk', () => {
  const image = {} as HTMLImageElement, drawImage = vi.fn();
  const ctx = { drawImage } as unknown as CanvasRenderingContext2D;
  const tree = { manifest, image };
  drawTimbersTree(ctx, tree, { x: 490.25, y: 600.5 });
  expect(drawImage.mock.calls).toEqual([[image, 32 - 490.25, 140 - 600.5]]);
  drawImage.mockClear();
  // Even with the old central-trunk bounds offscreen, the complete right limbs must render.
  drawTimberTrunk(ctx, { timbersTree: tree } as WorldAssets, { x: 490.25, y: 600.5 });
  expect(drawImage.mock.calls).toEqual([[image, 32 - 490.25, 140 - 600.5]]);
});

it('requires tree metadata and pixels, validates dimensions and retries a failed load', async () => {
  let failMetadata = true, failImage = false, wrongSize = false;
  const requests: string[] = [];
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: !failMetadata, json: async () => manifest })));
  class FakeImage {
    naturalWidth = 576; naturalHeight = 960;
    onload = (): void => {}; onerror = (): void => {};
    set src(path: string) {
      requests.push(path); if (wrongSize) this.naturalWidth--;
      queueMicrotask(failImage ? this.onerror : this.onload);
    }
  }
  vi.stubGlobal('Image', FakeImage);
  const load = () => loadTimbersTree('/assets/timbers/', 'tree-v1/manifest.json');
  await expect(load()).rejects.toThrow('metadata');
  failMetadata = false; failImage = true; await expect(load()).rejects.toThrow('image');
  failImage = false; wrongSize = true; await expect(load()).rejects.toThrow('dimensions');
  wrongSize = false; expect((await load())?.manifest).toEqual(manifest);
  expect(requests).toEqual(Array(3).fill('/assets/timbers/tree-v1/tree.png'));
});

it('rejects a missing Timbers tree declaration and a tree declared by another world', async () => {
  const data = { image: 'environment.png', assets: Object.fromEntries(WORLD_ASSETS.map((asset, index) => [asset, index])) };
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => data })));
  await expect(loadWorldAssets('timbers')).rejects.toThrow('Missing required Timbers tree declaration');
  Object.assign(data, { timbersTree: 'tree-v1/manifest.json' });
  await expect(loadWorldAssets('plains')).rejects.toThrow('Timbers tree declared by another world');
});
