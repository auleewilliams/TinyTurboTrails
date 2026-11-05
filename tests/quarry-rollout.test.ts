import { expect, it, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { QUARRY_RUN } from '../src/world/quarry-run';
import { quarryRolloutPieces, validateQuarryRollout, loadQuarryRollout, drawQuarryRollout } from '../src/world/quarry-rollout';
import { quarryPreviewPieces } from '../src/world/quarry-preview-pieces';
import { quarryShelfPieces } from '../src/world/quarry-shelves';
import { platformBodyAt } from '../src/game/platforms';
const manifest = () => JSON.parse(readFileSync('public/assets/quarry/rollout-v1/manifest.json', 'utf8'));
afterEach(() => vi.unstubAllGlobals());
it('covers exactly the remaining29 and reconciles45 authored supports with G pending', () => {
  const m = manifest(); validateQuarryRollout(m);
  const ids = [...Object.keys(quarryRolloutPieces()), ...Object.keys(quarryPreviewPieces()), ...Object.keys(quarryShelfPieces())];
  expect(ids).toHaveLength(45); expect(new Set(ids).size).toBe(45);
  expect(ids.sort()).toEqual(QUARRY_RUN.platforms!.map(p => p.id).sort());
  expect(m.floorStatus).toBe('approved-native-floor'); expect(ids).not.toContain('quarry-right-inner-654');
  for (const id of Object.keys(m.platforms)) for (const field of ['image', 'width', 'height', 'from', 'to', 'seconds', 'pause']) {
    const bad = structuredClone(m), row = bad.platforms[id] as unknown as Record<string, unknown>; row[field] = typeof row[field] === 'number' ? -1 : 'mutated';
    expect(() => validateQuarryRollout(bad)).toThrow();
  }
  for (const bad of [{ ...m, floorStatus: 'complete' }, { ...m, platforms: {} }, { ...m, platforms: { ...m.platforms, phantom: {} } }]) expect(() => validateQuarryRollout(bad)).toThrow();
});
it('draws whole native images at authored moving and fixed bodies with no missing mapped fallback', () => {
  const m = manifest(), images = Object.fromEntries(Object.keys(m.platforms).map(id => [id, {}])), calls: unknown[][] = [];
  const ctx = { drawImage: (...args: unknown[]) => calls.push(args) };
  for (const id of Object.keys(m.platforms)) {
    const p = QUARRY_RUN.platforms!.find(p => p.id === id)!;
    for (const t of [0, 2, 5.5, 8, 11]) {
      const body = platformBodyAt(p, t); calls.length = 0;
      expect(drawQuarryRollout(ctx as never, { manifest: m, images } as never, body, { x: .25, y: .5 })).toBe(true);
      expect(calls).toEqual([[images[id], body.x - .25, body.y - .5]]);
      expect(() => drawQuarryRollout(ctx as never, { manifest: m, images: {} } as never, body, { x: 0, y: 0 })).toThrow();
      expect(() => drawQuarryRollout(ctx as never, { manifest: m, images } as never, { ...body, width: body.width + 1 }, { x: 0, y: 0 })).toThrow();
    }
  }
  expect(drawQuarryRollout(ctx as never, {} as never, { id: 'quarry-upper' } as never, { x: 0, y: 0 })).toBe(false);
});
it('rejects required metadata/image/dimension failures and supports fresh ordinary Retry loads', async () => {
  let mode = 'metadata'; const requests: string[] = [];
  vi.stubGlobal('fetch', async () => ({ ok: mode !== 'metadata', json: async () => manifest() }));
  class ImageStub { naturalWidth = 0; naturalHeight = 0; onload = () => {}; onerror = () => {}; set src(url: string) { requests.push(url); const p = Object.values(quarryRolloutPieces()).find(p => url.endsWith(p.image))!; this.naturalWidth = mode === 'dimension' ? 1 : p.width; this.naturalHeight = p.height; queueMicrotask(() => mode === 'image' ? this.onerror() : this.onload()); } }
  vi.stubGlobal('Image', ImageStub);
  for (mode of ['metadata', 'image', 'dimension']) await expect(loadQuarryRollout('/assets/quarry/')).rejects.toThrow(/Quarry/);
  mode = 'good'; requests.length = 0; const kit = await loadQuarryRollout('/assets/quarry/');
  expect(Object.keys(kit.images)).toHaveLength(29); expect(requests.length).toBe(new Set(Object.values(quarryRolloutPieces()).map(p => p.image)).size);
});
