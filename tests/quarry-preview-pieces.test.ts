import { afterEach, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { drawQuarryPreviewPiece, loadQuarryPreviewPieces, quarryPreviewPieces, validateQuarryPreviewPieces } from '../src/world/quarry-preview-pieces';
import { drawPlatforms } from '../src/world/renderer';
import { QUARRY_RUN } from '../src/world/levels';
import { platformBodyAt } from '../src/game/platforms';
const manifest = () => JSON.parse(readFileSync('public/assets/quarry/representative-v1/manifest.json', 'utf8'));
afterEach(() => vi.unstubAllGlobals());
it('requires exactly twelve additions, their fixed geometry and unchanged B motion; rejects missing/extra/duplicate sources', () => {
  const m = manifest(); validateQuarryPreviewPieces(m);
  expect(Object.keys(m.platforms)).toHaveLength(12);
  expect(m.platforms).not.toHaveProperty('quarry-right-inner-654');
  for (const [id, piece] of Object.entries(quarryPreviewPieces())) {
    const authored = QUARRY_RUN.platforms!.find(p => p.id === id)!;
    expect(piece.from).toEqual(authored.from); expect(piece.to).toEqual(authored.to);
    expect(piece.width).toBe(authored.width); expect(piece.seconds).toBe(authored.seconds);
    expect(piece.pause).toBe(authored.pause ?? 0);
    for (const mutate of [(x: typeof m) => { delete x.platforms[id]; }, (x: typeof m) => { x.platforms[id].width++; }, (x: typeof m) => { x.platforms[id].from.y++; }, (x: typeof m) => { x.platforms[id].seconds++; }, (x: typeof m) => { x.platforms[id].to.y++; }, (x: typeof m) => { x.platforms[id].pause++; }, (x: typeof m) => { x.platforms[id].image = 'carriage-96.png'; }]) {
      const bad = structuredClone(m); mutate(bad); if (JSON.stringify(bad) !== JSON.stringify(m)) expect(() => validateQuarryPreviewPieces(bad)).toThrow();
    }
  }
  const extra = structuredClone(m); extra.platforms['quarry-lift-a'] = extra.platforms['quarry-lift-b']; expect(() => validateQuarryPreviewPieces(extra)).toThrow();
});
it('dispatches only these twelve whole images at actual body coordinates; retains the same lift on both catch directions', () => {
  const m = manifest(), images = Object.fromEntries(Object.keys(m.platforms).map(id => [id, {}])), calls: unknown[][] = [];
  const ctx = { drawImage: (...a: unknown[]) => calls.push(a), beginPath() {}, moveTo() {}, lineTo() {}, stroke() {}, setLineDash() {}, save() {}, restore() {}, fillRect() {} };
  for (const [id] of Object.entries(quarryPreviewPieces())) {
    const p = QUARRY_RUN.platforms!.find(p => p.id === id)!;
    for (const t of id === 'quarry-lift-b' ? [0, 2, 4, 6, 8, 10] : [0]) {
      const b = platformBodyAt(p, t); calls.length = 0;
      drawPlatforms(ctx as never, { ...QUARRY_RUN, platforms: [p] }, { x: .25, y: .5 }, [b], { quarryPreview: { manifest: m, images } } as never);
      expect(calls).toEqual([[images[id], b.x - .25, b.y - .5]]);
      expect(() => drawQuarryPreviewPiece(ctx as never, { manifest: m, images } as never, { ...b, width: b.width + 1 }, { x: 0, y: 0 })).toThrow();
    }
  }
  expect(drawQuarryPreviewPiece(ctx as never, {} as never, { id: 'quarry-upper' } as never, { x: 0, y: 0 })).toBe(false);
});
it('required loading failures reject and ordinary fresh loading retries; shared immutable sources load once', async () => {
  let mode = 'metadata'; const requests: string[] = [];
  vi.stubGlobal('fetch', async () => ({ ok: mode !== 'metadata', json: async () => manifest() }));
  class FakeImage {
    naturalWidth = 0; naturalHeight = 0; onload = () => {}; onerror = () => {};
    set src(url: string) { requests.push(url); const p = Object.values(quarryPreviewPieces()).find(p => url.endsWith(p.image))!; this.naturalWidth = mode === 'dimension' ? 1 : p.width; this.naturalHeight = p.height; queueMicrotask(() => mode === 'image' ? this.onerror() : this.onload()); }
  }
  vi.stubGlobal('Image', FakeImage);
  for (mode of ['metadata', 'image', 'dimension']) await expect(loadQuarryPreviewPieces('/assets/quarry/')).rejects.toThrow(/Quarry/);
  mode = 'good'; requests.length = 0; const kit = await loadQuarryPreviewPieces('/assets/quarry/');
  expect(requests).toHaveLength(4); expect(kit.images['quarry-b-upper-dock']).toBe(kit.images['quarry-b-lower-dock']);
  expect(kit.images['quarry-right-inner-444']).toBe(kit.images['quarry-right-inner-724']);
});
