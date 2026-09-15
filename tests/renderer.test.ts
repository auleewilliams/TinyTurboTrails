import { readFileSync } from 'node:fs';
import { expect, it, vi } from 'vitest';
import { drawAsset } from '../src/world/renderer';
import type { WorldAssets } from '../src/world/assets';

const manifest = JSON.parse(readFileSync(new URL('../public/assets/plains/manifest.json', import.meta.url), 'utf8'));

it.each([1, 2])('anchors the checkpoint post and visible base at its world position at scale %s', (scale) => {
  const drawImage = vi.fn();
  const assets: WorldAssets = { atlas: {} as HTMLImageElement, manifest };
  drawAsset({ drawImage } as unknown as CanvasRenderingContext2D, assets, 'checkpoint', 570, 158, scale);
  // The post is centered at x=20; opaque artwork ends at y=44 in its 48px cell.
  expect(drawImage).toHaveBeenCalledWith(assets.atlas, 144, 96, 48, 48,
    570 - 20 * scale, 158 - 44 * scale, 48 * scale, 48 * scale);
});

it('keeps the bottom-center anchor for assets without an override', () => {
  const drawImage = vi.fn();
  const assets: WorldAssets = { atlas: {} as HTMLImageElement, manifest };
  drawAsset({ drawImage } as unknown as CanvasRenderingContext2D, assets, 'gem', 150, 150);
  expect(drawImage).toHaveBeenCalledWith(assets.atlas, 0, 96, 48, 48, 126, 102, 48, 48);
});
