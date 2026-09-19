import { afterEach, expect, it, vi } from 'vitest';
import { loadWorldAssetMap, loadWorldAssets } from '../src/world/assets';
import { readFileSync } from 'node:fs';

afterEach(() => {
  vi.unstubAllGlobals();
});

it('loads world metadata and its atlas from the requested directory', async () => {
  const requests: string[] = [];
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    requests.push(url);
    return { ok: true, json: async () => ({
      image: 'environment.png', cellSize: 48,
      assets: Object.fromEntries([
        'terrain-flat', 'terrain-left', 'terrain-right', 'terrain-ramp', 'stone', 'cave', 'tree', 'flowers',
        'gem', 'spring', 'slime', 'checkpoint', 'finish-arch', 'dust', 'hills', 'bush',
      ].map((asset, index) => [asset, index])),
    }) };
  }));
  class FakeImage {
    onload = (): void => {};
    onerror = (): void => {};
    set src(url: string) { requests.push(url); queueMicrotask(this.onload); }
  }
  vi.stubGlobal('Image', FakeImage);

  await loadWorldAssets('quarry');

  expect(requests).toEqual([
    '/assets/quarry/manifest.json',
    '/assets/quarry/environment.png',
  ]);
});

it('loads each requested world atlas once', async () => {
  const requests: string[] = [];
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    requests.push(url);
    return { ok: true, json: async () => ({
      image: 'environment.png', cellSize: 48,
      assets: Object.fromEntries([
        'terrain-flat', 'terrain-left', 'terrain-right', 'terrain-ramp', 'stone', 'cave', 'tree', 'flowers',
        'gem', 'spring', 'slime', 'checkpoint', 'finish-arch', 'dust', 'hills', 'bush',
      ].map((asset, index) => [asset, index])),
    }) };
  }));
  class FakeImage {
    onload = (): void => {};
    onerror = (): void => {};
    set src(url: string) { requests.push(url); queueMicrotask(this.onload); }
  }
  vi.stubGlobal('Image', FakeImage);

  const worlds = await loadWorldAssetMap(['plains', 'timbers', 'plains']);

  expect(Object.keys(worlds)).toEqual(['plains', 'timbers']);
  expect(requests).toEqual([
    '/assets/plains/manifest.json', '/assets/timbers/manifest.json',
    '/assets/plains/environment.png', '/assets/timbers/environment.png',
  ]);
});

it('reports generic metadata errors without naming Plains', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false })));

  await expect(loadWorldAssets('quarry')).rejects.toThrow('world asset metadata');
  await expect(loadWorldAssets('quarry')).rejects.not.toThrow(/Plains/);
});

it('loads the optional scenery pack declared by the atlas and propagates image failures', async () => {
  const world = JSON.parse(readFileSync(new URL('../public/assets/plains/manifest.json', import.meta.url), 'utf8'));
  const scenery = JSON.parse(readFileSync(new URL('../public/assets/plains/scenery/manifest.json', import.meta.url), 'utf8'));
  world.scenery = 'scenery/manifest.json';
  vi.stubGlobal('fetch', vi.fn(async (url: string) => ({ ok: true, json: async () =>
    url.endsWith('/scenery/manifest.json') ? scenery : world })));
  let fail = false;
  class FakeImage {
    onload = (): void => {};
    onerror = (): void => {};
    set src(url: string) { queueMicrotask(fail && url.endsWith('/foreground.png') ? this.onerror : this.onload); }
  }
  vi.stubGlobal('Image', FakeImage);
  const loaded = await loadWorldAssets();
  expect(loaded).toHaveProperty('scenery.manifest.foreground.sprites.oak-round');
  fail = true;
  await expect(loadWorldAssets()).rejects.toThrow(/scenery/i);
});
