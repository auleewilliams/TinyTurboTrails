import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { expect, it, vi } from 'vitest';
import { validateFrostLedges, drawFrostLedge, loadFrostLedges, type FrostLedgeAssets } from '../src/world/frost-ledges';
import { FROST_RIDGE } from '../src/world/frost-ridge';
import { platformBodiesAt } from '../src/game/platforms';
const metadata = () => JSON.parse(readFileSync('public/assets/frost/ledge-trial-v1/manifest.json', 'utf8'));
it('accepts exactly the ten assigned variants and rejects extra supports, missing images and altered dimensions', () => {
  validateFrostLedges(metadata());
  expect(Object.keys(metadata().platforms).sort()).toEqual(FROST_RIDGE.platforms!.map(p => p.id).sort());
  for (const change of [
    (m: ReturnType<typeof metadata>) => { delete m.platforms['frost-return-4']; },
    ...[1, 2, 3, 6, 7, 8].map(id => (m: ReturnType<typeof metadata>) => { delete m.platforms[`frost-return-${id}`]; }),
    (m: ReturnType<typeof metadata>) => { m.platforms['frost-return-11'] = m.platforms['frost-return-5']; },
    (m: ReturnType<typeof metadata>) => { m.platforms['frost-return-2'].height = 32; },
    (m: ReturnType<typeof metadata>) => { m.platforms['frost-return-1'] = m.platforms['frost-return-4']; },
    (m: ReturnType<typeof metadata>) => { m.platforms['frost-return-9'].width++; },
    (m: ReturnType<typeof metadata>) => { m.platforms['frost-return-10'].image = '../other.png'; },
  ]) { const m = metadata(); change(m); expect(() => validateFrostLedges(m)).toThrow(); }
});
it('draws one native image at the exact collider top and width with fractional camera offsets', () => {
  const manifest = metadata(), platforms = Object.fromEntries(Object.keys(manifest.platforms).map(id => [id, {} as HTMLImageElement]));
  const kit: FrostLedgeAssets = { manifest, platforms }, drawImage = vi.fn();
  for (const body of platformBodiesAt(FROST_RIDGE.platforms, 0)) {
    drawImage.mockClear();
    const drawn = drawFrostLedge({ drawImage } as unknown as CanvasRenderingContext2D, kit, body, { x: .25, y: .5 });
    expect(drawn).toBe(Boolean(platforms[body.id]));
    if (drawn) expect(drawImage.mock.calls).toEqual([[platforms[body.id], body.x - .25, body.y - .5]]);
    else expect(drawImage).not.toHaveBeenCalled();
  }
  const body = platformBodiesAt(FROST_RIDGE.platforms, 0).find(p => p.id === 'frost-return-10')!;
  expect(body).toMatchObject({ x: 3416, y: 372, width: 200 });
  expect(() => drawFrostLedge({ drawImage } as unknown as CanvasRenderingContext2D, kit, { ...body, width: 199 }, { x: 0, y: 0 })).toThrow();
});
it('does not cache a failed required manifest and retries through the ordinary loader', async () => {
  const fetchMock = vi.fn().mockResolvedValueOnce({ ok: false }).mockResolvedValueOnce({ ok: true, json: async () => metadata() });
  class LoadedImage {
    naturalWidth = 0; naturalHeight = 0; onload = () => {}; onerror = () => {};
    set src(url: string) {
      const bytes = readFileSync('public' + url);
      this.naturalWidth = bytes.readUInt32BE(16); this.naturalHeight = bytes.readUInt32BE(20);
      queueMicrotask(() => this.onload());
    }
  }
  vi.stubGlobal('fetch', fetchMock); vi.stubGlobal('Image', LoadedImage);
  try {
    await expect(loadFrostLedges('/assets/frost/', 'ledge-trial-v1/manifest.json')).rejects.toThrow();
    const loaded = await loadFrostLedges('/assets/frost/', 'ledge-trial-v1/manifest.json');
    expect(Object.keys(loaded!.platforms)).toHaveLength(10); expect(fetchMock).toHaveBeenCalledTimes(2);
  } finally { vi.unstubAllGlobals(); }
});

it('preserves the complete accepted geometry and pickup projection', () => {
  const slimes = FROST_RIDGE.entities.filter(e => e.kind === 'slime');
  expect(slimes).toEqual([
    { id: 'frost-slime-1', kind: 'slime', asset: 'slime', layer: 'world', x: 1475, y: 380,
      patrol: { minX: 1430, maxX: 1490, speed: 36 } },
    { id: 'frost-slime-2', kind: 'slime', asset: 'slime', layer: 'world', x: 2900, y: 540,
      patrol: { minX: 2840, maxX: 2960, speed: 36 } },
    { id: 'frost-slime-3', kind: 'slime', asset: 'slime', layer: 'world', x: 4520, y: 432,
      patrol: { minX: 4490, maxX: 4550, speed: 36 } },
  ]);
  const accepted = { ...FROST_RIDGE, entities: FROST_RIDGE.entities.filter(e => !slimes.includes(e)) };
  const digest = createHash('sha256').update(JSON.stringify(accepted)).digest('hex');
  expect(digest).toBe('9489be2c950ad2f4ecf9e88abccf2309611c38566b0e2978a31d3f19e9599db2');
});

it('rejects required new images with wrong dimensions or failed decode', async () => {
  let mode: 'size' | 'decode' = 'size';
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => metadata() })));
  class InvalidImage {
    naturalWidth = 0; naturalHeight = 0; onload = () => {}; onerror = () => {};
    set src(url: string) {
      const bytes = readFileSync('public' + url);
      this.naturalWidth = bytes.readUInt32BE(16); this.naturalHeight = bytes.readUInt32BE(20);
      if (url.endsWith('ledge-v3-190.png')) {
        if (mode === 'size') this.naturalHeight--;
        else { queueMicrotask(() => this.onerror()); return; }
      }
      queueMicrotask(() => this.onload());
    }
  }
  vi.stubGlobal('Image', InvalidImage);
  try {
    await expect(loadFrostLedges('/assets/frost/', 'ledge-trial-v1/manifest.json')).rejects.toThrow('Invalid Frost ledge dimensions: frost-return-2');
    mode = 'decode';
    await expect(loadFrostLedges('/assets/frost/', 'ledge-trial-v1/manifest.json')).rejects.toThrow('Could not load Frost ledge: frost-return-2');
  } finally { vi.unstubAllGlobals(); }
});
