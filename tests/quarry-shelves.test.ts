import { afterEach, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { drawQuarryShelf, loadQuarryShelves, quarryShelfPieces, validateQuarryShelves } from '../src/world/quarry-shelves';
import { drawPlatforms } from '../src/world/renderer';
import { QUARRY_RUN } from '../src/world/levels';
import { platformBodyAt } from '../src/game/platforms';

const manifest = () => JSON.parse(readFileSync('public/assets/quarry/whole-ledges-v1/manifest.json', 'utf8'));
afterEach(() => vi.unstubAllGlobals());
it('requires the exact four preview IDs and complete dimensions, never a fake full-trail kit', () => {
  const m = manifest(); validateQuarryShelves(m);
  expect(Object.keys(m.platforms).sort()).toEqual(['quarry-mine', 'quarry-terrace-4', 'quarry-terrace-5', 'quarry-upper']);
  for (const id of Object.keys(m.platforms)) {
    const missing = structuredClone(m); delete missing.platforms[id];
    expect(() => validateQuarryShelves(missing)).toThrow();
    const wrong = structuredClone(m); wrong.platforms[id].width++;
    expect(() => validateQuarryShelves(wrong)).toThrow();
  }
  const extra = structuredClone(m); extra.platforms['quarry-rim'] = m.platforms['quarry-upper'];
  expect(() => validateQuarryShelves(extra)).toThrow();
});
it('dispatches approved four shelves once at native size including fractional camera offsets; other IDs remain legacy', () => {
  const m = manifest(); const images = Object.fromEntries(Object.keys(m.platforms).map(id => [id, {}]));
  const calls: unknown[][] = [];
  const ctx = { drawImage: (...a: unknown[]) => calls.push(a), beginPath() {}, moveTo() {}, lineTo() {}, stroke() {}, setLineDash() {}, save() {}, restore() {}, fillRect() {} };
  const kit = { manifest: m, images } as never;
  for (const id of Object.keys(quarryShelfPieces())) {
    const p = QUARRY_RUN.platforms!.find(p => p.id === id)!; const b = platformBodyAt(p, 0);
    calls.length = 0;
    drawPlatforms(ctx as never, { ...QUARRY_RUN, platforms: [p] }, { x: .25, y: .5 }, [b], { quarryShelves: kit } as never);
    expect(calls).toEqual([[images[id], b.x - .25, b.y - .5]]);
    expect(() => drawQuarryShelf(ctx as never, kit, { ...b, width: b.width + 1 }, { x: 0, y: 0 })).toThrow();
  }
  expect(drawQuarryShelf(ctx as never, kit, { id: 'quarry-rim' } as never, { x: 0, y: 0 })).toBe(false);
  expect(() => drawQuarryShelf(ctx as never, { manifest: m, images: {} } as never, platformBodyAt(QUARRY_RUN.platforms!.find(p => p.id === 'quarry-upper')!, 0), { x: 0, y: 0 })).toThrow();
});
it('rejects required metadata/image failures and dimension mismatch; a new call retries fresh requests', async () => {
  let mode = 'metadata'; const requests: string[] = [];
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: mode !== 'metadata', json: async () => manifest() })));
  class FakeImage {
    naturalWidth = 400; naturalHeight = 45; onload = () => {}; onerror = () => {};
    set src(url: string) { requests.push(url); const width = Number(url.match(/shelf-(\d+)/)![1]); this.naturalWidth = mode === 'dimension' ? 1 : width; this.naturalHeight = width === 400 ? 45 : width === 240 ? 37 : 32; queueMicrotask(() => mode === 'image' ? this.onerror() : this.onload()); }
  }
  vi.stubGlobal('Image', FakeImage);
  for (mode of ['metadata', 'image', 'dimension']) await expect(loadQuarryShelves('/assets/quarry/')).rejects.toThrow(/Quarry/);
  mode = 'good'; const kit = await loadQuarryShelves('/assets/quarry/');
  expect(kit.images['quarry-upper']).toBe(kit.images['quarry-mine']);
  expect(requests.length).toBeGreaterThan(3);
});
