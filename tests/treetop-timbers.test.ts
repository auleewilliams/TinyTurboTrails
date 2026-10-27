import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { hasFixedSupport, validateLevel, type WorldEntity } from '../src/world/level';
import { LEVELS, TREETOP_TIMBERS, levelById } from '../src/world/levels';

const ofKind = (kind: WorldEntity['kind']) => TREETOP_TIMBERS.entities.filter(entity => entity.kind === kind);

it('registers Treetop Timbers with its own atlas and valid level data', () => {
  expect(levelById('timbers')).toBe(TREETOP_TIMBERS);
  expect(LEVELS).toContain(TREETOP_TIMBERS);
  expect(() => validateLevel(TREETOP_TIMBERS)).not.toThrow();
  expect(TREETOP_TIMBERS.name).toBe('TREETOP TIMBERS');
  expect(TREETOP_TIMBERS.atlas).toBe('timbers');
});

it('replaces the former long contour with three resting checkpoints and permanent wood branches', () => {
  const level = TREETOP_TIMBERS;
  expect(level.width).toBe(820);
  expect(level.start.y - level.finish.y).toBe(900);
  expect(level.checkpoints.map(point => point.y)).toEqual([900, 660, 420]);
  expect(ofKind('checkpoint')).toHaveLength(3);
  expect(ofKind('spring')).toHaveLength(1);
  expect(ofKind('hazard')).toHaveLength(0);
  expect(ofKind('slime')).toHaveLength(0);
  expect(ofKind('gem')).toHaveLength(33);
  expect(ofKind('special')).toHaveLength(3);
  expect(level.theme.material).toBe('wood');
  expect(level.platforms?.every(platform => platform.from.x === platform.to.x && platform.from.y === platform.to.y)).toBe(true);
});

it('seats every checkpoint, spring and finish on a whole fixed footprint', () => {
  const level = TREETOP_TIMBERS;
  for (const point of [...level.checkpoints, level.finish, level.retrace!, ...ofKind('spring')]) {
    expect(hasFixedSupport(level, point), JSON.stringify(point)).toBe(true);
  }
});

it('ships a complete 4 by 4 timber atlas contract', () => {
  const manifest = JSON.parse(readFileSync(
    new URL('../public/assets/timbers/manifest.json', import.meta.url), 'utf8',
  )) as { image: string; cellSize: number; assets: Record<string, number>;
    terrainTops: Record<string, { left: number; right: number }> };
  expect(manifest.image).toBe('environment.png');
  expect(manifest.cellSize).toBe(48);
  expect(Object.values(manifest.assets).sort((a, b) => a - b)).toEqual(
    Array.from({ length: 16 }, (_, index) => index),
  );
  expect(manifest.terrainTops).toEqual({
    'terrain-flat': { left: 24, right: 24 },
    'terrain-left': { left: 9, right: 9 },
    'terrain-right': { left: 4, right: 4 },
    'terrain-ramp': { left: 30, right: 11 },
  });
});
