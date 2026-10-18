import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { expect, it, vi } from 'vitest';
import { LEVELS } from '../src/world/levels';
import { surfaceY } from '../src/game/movement';
import { drawAsset } from '../src/world/renderer';
import type { WorldAssets } from '../src/world/assets';

// Decode the shipped pixels, not a duplicated assumption about transparent padding.
const bottoms = JSON.parse(execFileSync(process.platform === 'win32' ? 'python' : 'python3', ['-B', '-c', `
import json
from pathlib import Path
from scripts.process_sprite_atlas import read_png
result = {}
for directory in ['plains', 'timbers', 'site', 'frost', 'cove']:
    base = Path('public/assets') / directory
    manifest = json.loads((base / 'manifest.json').read_text())
    width, _, pixels = read_png(base / manifest['image'])
    cell = manifest['cellSize']
    index = manifest['assets']['finish-arch']
    sx, sy = index % 4 * cell, index // 4 * cell
    result[directory] = [max(y + 1 for y in range(cell) for x in range(start, start + cell // 2)
        if pixels[(sy + y) * width + sx + x][3] >= 128) for start in [0, cell // 2]]
print(json.dumps(result))
`], { encoding: 'utf8' })) as Record<string, number[]>;

it.each(LEVELS)('$name plants both visible finish feet on the collision surface, excluding PNG padding', level => {
  const manifest = JSON.parse(readFileSync(new URL(`../public/assets/${level.atlas}/manifest.json`, import.meta.url), 'utf8'));
  const assets = { atlas: {}, manifest } as WorldAssets;
  expect(level.finish.y).toBe(surfaceY(level, level.finish.x));
  for (const scale of [1, 2]) for (const offset of [0, 0.25]) {
    const drawImage = vi.fn();
    drawAsset({ drawImage } as unknown as CanvasRenderingContext2D, assets, 'finish-arch',
      level.finish.x - offset, level.finish.y - offset, scale);
    const destinationY = Number(drawImage.mock.calls[0][6]);
    for (const bottom of bottoms[level.atlas]) {
      // Cove's left foot has one extra opaque source row. Seat the shorter
      // foot; the longer one overlaps the ground rather than leaving a gap.
      expect(destinationY + Math.min(...bottoms[level.atlas]) * scale).toBe(level.finish.y - offset);
      expect(destinationY + bottom * scale).toBeGreaterThanOrEqual(level.finish.y - offset);
      expect(destinationY + bottom * scale).toBeLessThanOrEqual(level.finish.y - offset + scale);
    }
  }
});

it('keeps the finish pillars vertical while seating both feet along a slope', () => {
  const manifest = JSON.parse(readFileSync(new URL('../public/assets/cove/manifest.json', import.meta.url), 'utf8'));
  const assets = { atlas: {}, manifest } as WorldAssets;
  const transform = vi.fn(), drawImage = vi.fn(), restore = vi.fn();
  const ctx = { save: vi.fn(), transform, drawImage, restore } as unknown as CanvasRenderingContext2D;
  drawAsset(ctx, assets, 'finish-arch', 200, 190, 2, 1 / 15);
  expect(transform).toHaveBeenCalledWith(1, 1 / 15, 0, 1, 200, 190);
  expect(drawImage.mock.calls[0].slice(5)).toEqual([-48, -74, 96, 96]);
  expect(restore).toHaveBeenCalledOnce();
});
