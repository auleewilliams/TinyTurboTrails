import { afterEach, expect, it, vi } from 'vitest';
import { loadWorldAssets } from '../src/world/assets';

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

it('reports generic metadata errors without naming Plains', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false })));

  await expect(loadWorldAssets('quarry')).rejects.toThrow('world asset metadata');
  await expect(loadWorldAssets('quarry')).rejects.not.toThrow(/Plains/);
});
