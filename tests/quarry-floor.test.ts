import { afterEach, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { validateQuarryFloor, loadQuarryFloor, drawQuarryFloor } from '../src/world/quarry-floor';
import { QUARRY_RUN } from '../src/world/quarry-run';
import { drawWorld } from '../src/world/renderer';
const manifest = JSON.parse(readFileSync('public/assets/quarry/floor-v1/manifest.json', 'utf8'));
afterEach(() => vi.unstubAllGlobals());
it('rejects every altered metadata field', () => {
  validateQuarryFloor(manifest);
  for (const [key, value] of Object.entries(manifest)) expect(() => validateQuarryFloor({ ...manifest, [key]: typeof value === 'number' ? value + 1 : 'wrong' })).toThrow();
});
it('required resources reject metadata, image and dimensions, then ordinary retry refetches both', async () => {
  let mode = 'metadata'; const requests: string[] = [];
  vi.stubGlobal('fetch', async (url: string) => { requests.push(url); return { ok: mode !== 'metadata', json: async () => manifest }; });
  vi.stubGlobal('Image', class { naturalWidth = 820; naturalHeight = 107; onload = () => {}; onerror = () => {};
    set src(url: string) { requests.push(url); if (mode === 'dimensions') this.naturalHeight = 100; queueMicrotask(() => mode === 'image' ? this.onerror() : this.onload()); }
  });
  for (mode of ['metadata', 'image', 'dimensions']) await expect(loadQuarryFloor('/assets/quarry/')).rejects.toThrow();
  mode = 'good'; requests.length = 0;
  const kit = await loadQuarryFloor('/assets/quarry/'); expect(kit.image.naturalHeight).toBe(107);
  expect(requests).toEqual(['/assets/quarry/floor-v1/manifest.json', '/assets/quarry/floor-v1/floor-820.png']);
});
it('actual ground dispatch draws one native floor before entities and removes generic cap/material', () => {
  const image = { naturalWidth: 820, naturalHeight: 107 } as HTMLImageElement;
  const kit = { manifest, image }, calls: unknown[][] = [], fills: unknown[] = [];
  const ctx = new Proxy({ drawImage: (...args: unknown[]) => calls.push(args), fill: () => fills.push('polygon') }, { get: (t, k) => k in t ? t[k as keyof typeof t] : () => {}, set: () => true }) as unknown as CanvasRenderingContext2D;
  const assets = { atlas: {} as HTMLImageElement, gems: {} as HTMLImageElement, manifest: { cellSize: 48, image: '', assets: {} }, quarryFloor: kit };
  drawWorld(ctx, assets as never, QUARRY_RUN, { position: { x: .25, y: 840 } } as never, () => false, undefined, [], 0, true);
  expect(calls.filter(c => c[0] === image)).toEqual([[image, -.25, 140]]);
  expect(fills).toEqual([]); expect(calls.indexOf(calls.find(c => c[0] === image)!)).toBeLessThan(calls.length - 1);
  expect(() => drawQuarryFloor(ctx, undefined, QUARRY_RUN, { x: 0, y: 840 })).toThrow();
  expect(() => drawQuarryFloor(ctx, kit, { ...QUARRY_RUN, height: 1087 }, { x: 0, y: 840 })).toThrow();
});
