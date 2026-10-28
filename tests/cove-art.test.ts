import { readFileSync } from 'node:fs';
import { expect, it, vi } from 'vitest';
import { drawCoveGround, drawCovePlatform } from '../src/world/cove-terrain';
import { drawPlatforms } from '../src/world/renderer';
import { SANDY_COVE } from '../src/world/sandy-cove';
import { platformBodiesAt } from '../src/game/platforms';
import type { WorldAssets } from '../src/world/assets';

it('uses generated kit pixels for all seven fixed Cove supports instead of slab rectangles', () => {
  const drawImage = vi.fn();
  const ctx = { drawImage, save() {}, restore() {}, beginPath() {}, rect() {}, clip() {}, fillRect() {},
    translate() {}, scale() {}, fillStyle: '' } as unknown as CanvasRenderingContext2D;
  const image = {} as HTMLImageElement;
  const manifest = JSON.parse(readFileSync(new URL('../public/assets/cove/terrain-kit/manifest.json', import.meta.url), 'utf8'));
  const assets = { coveTerrain: { image, ground: image, manifest } } as unknown as WorldAssets;
  for (const body of platformBodiesAt(SANDY_COVE.platforms, 0)) {
    drawImage.mockClear();
    drawPlatforms(ctx, SANDY_COVE, { x: 0, y: 0 }, [body], assets);
    expect(drawImage.mock.calls.length, body.id).toBe(1);
    expect(drawImage.mock.calls.every(call => call[0] === image)).toBe(true);
  }
});

it('restores canvas state when native terrain image drawing throws', () => {
  const manifest = JSON.parse(readFileSync(new URL('../public/assets/cove/terrain-kit/manifest.json', import.meta.url), 'utf8'));
  const image = {} as HTMLImageElement, kit = { image, ground: image, manifest };
  let depth = 0;
  const ctx = { save() { depth++; }, restore() { depth--; }, drawImage() { throw new Error('diagnostic image failure'); } } as unknown as CanvasRenderingContext2D;
  expect(() => drawCoveGround(ctx, kit, SANDY_COVE, { x: .5, y: .5 }, 0, 4200)).toThrow('diagnostic image failure');
  expect(depth).toBe(0);
  expect(() => drawCovePlatform(ctx, kit, SANDY_COVE, platformBodiesAt(SANDY_COVE.platforms, 0)[0], { x: .5, y: .5 })).toThrow('diagnostic image failure');
  expect(depth).toBe(0);
});
