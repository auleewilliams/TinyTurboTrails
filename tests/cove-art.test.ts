import { expect, it, vi } from 'vitest';
import { drawPlatforms } from '../src/world/renderer';
import { SANDY_COVE } from '../src/world/sandy-cove';
import { platformBodiesAt } from '../src/game/platforms';
import type { WorldAssets } from '../src/world/assets';

it('uses generated kit pixels for all seven fixed Cove supports instead of slab rectangles', () => {
  const drawImage = vi.fn();
  const ctx = { drawImage, save() {}, restore() {}, beginPath() {}, rect() {}, clip() {}, fillRect() {},
    translate() {}, scale() {}, fillStyle: '' } as unknown as CanvasRenderingContext2D;
  const image = {} as HTMLImageElement;
  const pieces = Object.fromEntries(['thin', 'regular'].flatMap(kind => ['left', 'repeat', 'right', 'repeat-alt'].map((part, index) =>
    [`stone-${kind}-${part}`, { x: index * 34, y: kind === 'thin' ? 0 : 16, width: part.startsWith('repeat') ? 32 : 16, height: kind === 'thin' ? 6 : 12 }])));
  const assets = { coveTerrain: { image, manifest: { version: 1, image: 'atlas.png', width: 256, height: 128, pieces } } } as unknown as WorldAssets;
  for (const body of platformBodiesAt(SANDY_COVE.platforms, 0)) {
    drawImage.mockClear();
    drawPlatforms(ctx, SANDY_COVE, { x: 0, y: 0 }, [body], assets);
    expect(drawImage.mock.calls.length, body.id).toBeGreaterThan(0);
    expect(drawImage.mock.calls.every(call => call[0] === image)).toBe(true);
  }
});
