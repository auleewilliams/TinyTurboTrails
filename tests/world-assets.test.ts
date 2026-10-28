import { afterEach, expect, it, vi } from 'vitest';
import { loadWorldAssetMap, loadWorldAssets, WORLD_ASSETS } from '../src/world/assets';
import { readFileSync } from 'node:fs';

afterEach(() => {
  vi.unstubAllGlobals();
});

it('ships a complete grounded construction atlas for Sunset Site', () => {
  const site = JSON.parse(readFileSync(new URL('../public/assets/site/manifest.json', import.meta.url), 'utf8'));
  expect(site.image).toBe('environment.png');
  expect(site.cellSize).toBe(48);
  expect(Object.keys(site.assets).sort()).toEqual([...WORLD_ASSETS].sort());
  expect(Object.values(site.assets).sort((a, b) => Number(a) - Number(b))).toEqual(
    Array.from({ length: 16 }, (_, index) => index),
  );
  expect(site).not.toHaveProperty('terrainTops');
  for (const asset of ['stone', 'cave', 'tree', 'flowers', 'spring', 'slime', 'checkpoint', 'finish-arch', 'bush']) {
    expect(site.anchors[asset], asset).toEqual({ x: 24, y: 44 });
  }
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
    '/assets/trails/materials.png', '/assets/trails/backdrops.webp', '/assets/slimes/slimes.png', '/assets/gems/gems.png',
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
  expect(worlds.plains.gems).toBe(worlds.timbers.gems);
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

it('treats shared decorative sheets as optional while keeping the atlas required', async () => {
  vi.resetModules();
  const { loadWorldAssets: loadFreshWorldAssets } = await import('../src/world/assets');
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({
    image: 'environment.png', cellSize: 48,
    assets: Object.fromEntries(WORLD_ASSETS.map((asset, index) => [asset, index])),
  }) })));
  class FakeImage {
    onload = (): void => {};
    onerror = (): void => {};
    set src(url: string) { queueMicrotask(url.includes('/trails/') ? this.onerror : this.onload); }
  }
  vi.stubGlobal('Image', FakeImage);
  const loaded = await loadFreshWorldAssets('optional-presentation');
  expect(loaded.atlas).toBeInstanceOf(FakeImage);
  expect(loaded.slimes).toBeInstanceOf(FakeImage);
  expect(loaded.gems).toBeInstanceOf(FakeImage);
  expect(loaded.materials).toBeUndefined();
  expect(loaded.backdrops).toBeUndefined();
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

it.each(['site', 'frost', 'cove'])('loads the %s panorama and can retry a failed image', async (directory) => {
  const world = JSON.parse(readFileSync(new URL(`../public/assets/${directory}/manifest.json`, import.meta.url), 'utf8'));
  const bytes = readFileSync(new URL(`../public/assets/${directory}/${world.panorama}`, import.meta.url));
  expect([bytes.readUInt32BE(16), bytes.readUInt32BE(20)]).toEqual([720, 240]);
  const requests: string[] = [];
  let fail = true;
  vi.stubGlobal('fetch', vi.fn(async (url: string) => ({ ok: true, json: async () => url.endsWith('/materials/manifest.json')
    ? JSON.parse(readFileSync(new URL('../public/assets/cove/materials/manifest.json', import.meta.url), 'utf8')) : url.endsWith('/terrain-kit/manifest.json')
    ? JSON.parse(readFileSync(new URL('../public/assets/cove/terrain-kit/manifest.json', import.meta.url), 'utf8')) : world })));
  class FakeImage {
    naturalWidth = 512;
    naturalHeight = 256;
    onload = (): void => {};
    onerror = (): void => {};
    set src(url: string) {
      requests.push(url);
      if (url.endsWith('/materials/atlas.png')) this.naturalHeight = 160;
      if (url.endsWith('/terrain-kit/ground.png')) { this.naturalWidth = 4200; this.naturalHeight = 480; }
      queueMicrotask(fail && url.endsWith('/background.png') ? this.onerror : this.onload);
    }
  }
  vi.stubGlobal('Image', FakeImage);
  await expect(loadWorldAssets(directory)).rejects.toThrow('Could not load trail panorama');
  fail = false;
  const loaded = await loadWorldAssets(directory);
  expect(loaded.panorama).toBeInstanceOf(FakeImage);
  expect(requests.filter(url => url === `/assets/${directory}/background.png`)).toHaveLength(2);
});

it('requires declared Cove kit metadata and pixels, validates dimensions and retries failures', async () => {
  const world = JSON.parse(readFileSync(new URL('../public/assets/cove/manifest.json', import.meta.url), 'utf8'));
  world.terrainKit = 'terrain-kit/manifest.json';
  const kit = JSON.parse(readFileSync(new URL('../public/assets/cove/terrain-kit/manifest.json', import.meta.url), 'utf8'));
  let failImage = true, failGround = false, failMetadata = false, wrongSize = false;
  vi.stubGlobal('fetch', vi.fn(async (url: string) => ({
    ok: !(failMetadata && url.endsWith('/terrain-kit/manifest.json')),
    json: async () => url.endsWith('/materials/manifest.json') ? JSON.parse(readFileSync(new URL('../public/assets/cove/materials/manifest.json', import.meta.url), 'utf8')) : url.endsWith('/terrain-kit/manifest.json') ? kit : world,
  })));
  class FakeImage {
    naturalWidth = 512;
    naturalHeight = 256;
    onload = (): void => {};
    onerror = (): void => {};
    set src(url: string) {
      if (url.endsWith('/materials/atlas.png')) this.naturalHeight = 160;
      if (url.endsWith('/terrain-kit/ground.png')) { this.naturalWidth = 4200; this.naturalHeight = 480; }
      if (wrongSize && url.endsWith('/terrain-kit/atlas.png')) this.naturalWidth = 255;
      queueMicrotask(() => ((failImage && url.endsWith('/terrain-kit/atlas.png')) || (failGround && url.endsWith('/terrain-kit/ground.png'))) ? this.onerror() : this.onload());
    }
  }
  vi.stubGlobal('Image', FakeImage);
  await expect(loadWorldAssets('cove')).rejects.toThrow(/Cove terrain/i);
  failImage = false; failGround = true;
  await expect(loadWorldAssets('cove')).rejects.toThrow(/Cove terrain/i);
  failGround = false; failMetadata = true;
  await expect(loadWorldAssets('cove')).rejects.toThrow(/Cove terrain/i);
  failMetadata = false; wrongSize = true;
  await expect(loadWorldAssets('cove')).rejects.toThrow(/Cove terrain/i);
  wrongSize = false;
  expect(await loadWorldAssets('cove')).toHaveProperty('coveTerrain.manifest.pieces.stone-thin-left');
  kit.pieces['stone-thin-left'].height = 12;
  await expect(loadWorldAssets('cove')).rejects.toThrow(/Cove terrain/i);
});

it('requires declared Cove material metadata and image, rejects bad rectangles/dimensions and retries without stale failures', async () => {
  const world = JSON.parse(readFileSync(new URL('../public/assets/cove/manifest.json', import.meta.url), 'utf8'));
  const terrain = JSON.parse(readFileSync(new URL('../public/assets/cove/terrain-kit/manifest.json', import.meta.url), 'utf8'));
  const original = JSON.parse(readFileSync(new URL('../public/assets/cove/materials/manifest.json', import.meta.url), 'utf8'));
  let mode = 'metadata', attempts = 0, kit = structuredClone(original);
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    if (url.endsWith('/materials/manifest.json')) attempts++;
    return { ok: !(mode === 'metadata' && url.endsWith('/materials/manifest.json')), json: async () =>
      url.endsWith('/materials/manifest.json') ? kit : url.endsWith('/terrain-kit/manifest.json') ? terrain : world };
  }));
  class FakeImage {
    naturalWidth = 512; naturalHeight = 256;
    onload = (): void => {}; onerror = (): void => {};
    set src(url: string) {
      if (url.endsWith('/terrain-kit/ground.png')) { this.naturalWidth = 4200; this.naturalHeight = 480; }
      if (url.endsWith('/materials/atlas.png')) { this.naturalWidth = mode === 'size' ? 511 : 512; this.naturalHeight = 160; }
      queueMicrotask(() => mode === 'image' && url.endsWith('/materials/atlas.png') ? this.onerror() : this.onload());
    }
  }
  vi.stubGlobal('Image', FakeImage);
  for (const fail of ['metadata', 'image', 'size', 'rect', 'extra']) {
    mode = fail; kit = structuredClone(original);
    if (fail === 'rect') kit.bands[0].base.width++;
    if (fail === 'extra') kit.extra = true;
    await expect(loadWorldAssets('cove')).rejects.toThrow(/Cove material/i);
    mode = 'ok'; kit = structuredClone(original);
    const loaded = await loadWorldAssets('cove');
    expect(loaded.coveMaterials?.manifest).toEqual(original);
    expect(loaded.coveMaterials?.image).toBeInstanceOf(FakeImage);
  }
  expect(attempts).toBe(10);
});
