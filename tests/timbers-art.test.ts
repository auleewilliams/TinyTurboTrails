import { afterEach, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { TREETOP_TIMBERS } from '../src/world/treetop-timbers';
import { platformBodiesAt } from '../src/game/platforms';
import { timbersPreviewIds, timbersPlatformWidths, validateTimbersTerrain, loadTimbersTerrain, drawTimbersGround, drawTimbersPlatform,
  type TimbersTerrainAssets } from '../src/world/timbers-terrain';
import { loadWorldAssets, WORLD_ASSETS } from '../src/world/assets';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url));
const manifest = JSON.parse(read('public/assets/timbers/terrain-kit-v1/manifest.json').toString());
afterEach(() => vi.unstubAllGlobals());

it('binds all 44 platform mappings and ground to unique unchanged authored supports', () => {
  validateTimbersTerrain(manifest);
  expect(timbersPreviewIds()).toHaveLength(12);
  expect(Object.keys(timbersPlatformWidths())).toHaveLength(44);
  for (const id of Object.keys(timbersPlatformWidths())) {
    const supports = TREETOP_TIMBERS.platforms!.filter(support => support.id === id);
    expect(supports).toHaveLength(1);
    expect(manifest.platforms[id].width).toBe(supports[0].width);
    expect(supports[0].from).toEqual(supports[0].to);
  }
  expect(TREETOP_TIMBERS.surfaces).toEqual([{ x1: manifest.ground.x, x2: manifest.ground.x + manifest.ground.width,
    y1: manifest.ground.y, y2: manifest.ground.y }]);
  const pins = JSON.parse(read('docs/evidence/issue-241/baseline/report.json').toString()).files;
  for (const path of ['src/world/treetop-timbers.ts', 'src/game/education.ts', 'src/world/camera.ts', 'src/game/movement.ts', 'src/game/platforms.ts']) {
    expect(createHash('sha256').update(read(path)).digest('hex'), path).toBe(pins[path]);
  }
});

it('rejects missing, extra, resized and redirected platform pieces', () => {
  for (const mutate of [
    (m: typeof manifest) => { delete m.platforms['timber-middle']; },
    (m: typeof manifest) => { m.platforms['timber-extra'] = m.platforms['timber-middle']; },
    (m: typeof manifest) => { m.platforms['timber-middle'].width = 570; m.platforms['timber-middle'].image = 'branch-570.png'; },
    (m: typeof manifest) => { m.platforms['timber-middle'].image = '../environment.png'; },
    (m: typeof manifest) => { m.ground.y++; },
  ]) { const changed = structuredClone(manifest); mutate(changed); expect(() => validateTimbersTerrain(changed)).toThrow(); }
});

it('draws one native bitmap on every authored support at fractional camera offsets without fallback', () => {
  const image = {} as HTMLImageElement, drawImage = vi.fn();
  const kit: TimbersTerrainAssets = { manifest, ground: image, platforms: Object.fromEntries(Object.keys(timbersPlatformWidths()).map(id => [id, image])) };
  const ctx = { drawImage } as unknown as CanvasRenderingContext2D;
  for (const body of platformBodiesAt(TREETOP_TIMBERS.platforms, 0)) {
    drawImage.mockClear();
    expect(drawTimbersPlatform(ctx, kit, body, { x: 20.25, y: 15.75 })).toBe(true);
    expect(drawImage.mock.calls).toEqual([[image, body.x - 20.25, body.y - 15.75]]);
  }
  drawImage.mockClear(); drawTimbersGround(ctx, kit, TREETOP_TIMBERS, { x: 20.25, y: 940.5 });
  expect(drawImage).toHaveBeenCalledExactlyOnceWith(image, manifest.ground.x - 20.25, manifest.ground.y - 940.5);
  const body = platformBodiesAt(TREETOP_TIMBERS.platforms, 0).find(body => body.id === 'timber-middle')!;
  expect(() => drawTimbersPlatform(ctx, kit, { ...body, width: body.width + 1 }, { x: 0, y: 0 })).toThrow();
  expect(() => drawTimbersPlatform(ctx, { ...kit, platforms: {} }, body, { x: 0, y: 0 })).toThrow();
});

it('requires declared images, checks dimensions, shares repeated widths and reloads after an ordinary failure', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => manifest })));
  const paths: string[] = []; let fail = true, wrongSize = false;
  class FakeImage {
    onload = (): void => {}; onerror = (): void => {};
    naturalWidth = 0; naturalHeight = 0;
    set src(path: string) {
      paths.push(path);
      this.naturalWidth = path.endsWith('ground.png') ? 780 : Number(path.match(/branch-(\d+)/)![1]);
      this.naturalHeight = path.endsWith('ground.png') ? 100 : 17;
      if (wrongSize) this.naturalWidth++;
      queueMicrotask(fail && path.endsWith('ground.png') ? this.onerror : this.onload);
    }
  }
  vi.stubGlobal('Image', FakeImage);
  await expect(loadTimbersTerrain('/assets/timbers/', 'terrain-kit-v1/manifest.json')).rejects.toThrow('Could not load');
  fail = false; paths.length = 0;
  const loaded = await loadTimbersTerrain('/assets/timbers/', 'terrain-kit-v1/manifest.json');
  expect(loaded!.platforms['timber-spring']).toBe(loaded!.platforms['timber-spring-catch']);
  expect(new Set(paths).size).toBe(paths.length);
  wrongSize = true;
  await expect(loadTimbersTerrain('/assets/timbers/', 'terrain-kit-v1/manifest.json')).rejects.toThrow('dimensions');
});

it('does not let another world declare the Timbers kit', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ timbersKit: 'terrain-kit-v1/manifest.json',
    assets: Object.fromEntries(WORLD_ASSETS.map((asset, index) => [asset, index])) }) })));
  await expect(loadWorldAssets('plains')).rejects.toThrow('Timbers terrain declared by another world');
});

it('rejects every omitted support and a missing required terrain declaration', async () => {
  for (const id of Object.keys(timbersPlatformWidths())) {
    const changed = structuredClone(manifest); delete changed.platforms[id];
    expect(() => validateTimbersTerrain(changed), id).toThrow();
  }
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({
    timbersTree: 'tree-v1/manifest.json', assets: Object.fromEntries(WORLD_ASSETS.map((asset, index) => [asset, index])),
  }) })));
  await expect(loadWorldAssets('timbers')).rejects.toThrow('Missing required Timbers terrain declaration');
});
