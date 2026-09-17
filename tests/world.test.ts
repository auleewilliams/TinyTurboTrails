import { expect, it } from 'vitest';
import { PLAINS_LEVEL, validateLevel } from '../src/world/level';
import { DEFAULT_LEVEL, LEVELS, levelById } from '../src/world/levels';
import { surfaceY } from '../src/game/movement';
import { Camera } from '../src/world/camera';

const ACTIVATION_WINDOW = 28;

it('has stable unique entity IDs and traversable terrain data', () => {
  expect(() => validateLevel(PLAINS_LEVEL)).not.toThrow();
  const ids = PLAINS_LEVEL.entities.map((entity) => entity.id);
  expect(new Set(ids).size).toBe(ids.length);
  expect(PLAINS_LEVEL.checkpoints.length).toBeGreaterThanOrEqual(1);
  expect(PLAINS_LEVEL.finish.x).toBeGreaterThan(PLAINS_LEVEL.start.x);
});
it('registers Plains as the default runtime level', () => {
  expect(DEFAULT_LEVEL).toBe(PLAINS_LEVEL);
  expect(LEVELS).toContain(PLAINS_LEVEL);
  expect(levelById('plains')).toBe(PLAINS_LEVEL);
  expect(levelById('missing')).toBeUndefined();
});
it.each(LEVELS)('$id satisfies generic level invariants', (level) => {
  expect(() => validateLevel(level)).not.toThrow();
  for (let index = 1; index < level.surfaces.length; index++) {
    expect(level.surfaces[index - 1].x2).toBe(level.surfaces[index].x1);
    expect(level.surfaces[index - 1].y2).toBe(level.surfaces[index].y1);
  }
  for (const checkpoint of level.checkpoints) {
    expect(checkpoint.y).toBeCloseTo(surfaceY(level, checkpoint.x), 5);
    expect(checkpoint.x).toBeLessThan(level.finish.x);
  }
});
it('rejects non-contiguous surfaces and unplanted checkpoints', () => {
  expect(() => validateLevel({ ...PLAINS_LEVEL, surfaces: [
    { x1: 0, x2: 10, y1: 198, y2: 198 },
    { x1: 11, x2: PLAINS_LEVEL.maxX, y1: 198, y2: 198 },
  ] })).toThrow(/contiguous/);
  expect(() => validateLevel({ ...PLAINS_LEVEL, checkpoints: [
    { id: 'checkpoint-meadow', x: 100, y: surfaceY(PLAINS_LEVEL, 100) },
  ] })).toThrow(/checkpoint/);
});
it('keeps gems, hazards, slimes and springs reachable while walking, aside from optional elevated bonus gems', () => {
  const terrain = { minX: PLAINS_LEVEL.minX, maxX: PLAINS_LEVEL.maxX, surfaces: PLAINS_LEVEL.surfaces };
  const gems = PLAINS_LEVEL.entities.filter((entity) => entity.kind === 'gem');
  const walkableGems = gems.filter((gem) => Math.abs(gem.y - surfaceY(terrain, gem.x)) <= ACTIVATION_WINDOW);
  const elevatedGems = gems.filter((gem) => Math.abs(gem.y - surfaceY(terrain, gem.x)) > ACTIVATION_WINDOW);
  expect(walkableGems.length).toBeGreaterThan(elevatedGems.length);
  expect(elevatedGems.length).toBeGreaterThan(0);
  for (const entity of PLAINS_LEVEL.entities) {
    if (entity.kind !== 'hazard' && entity.kind !== 'slime' && entity.kind !== 'spring') continue;
    expect(Math.abs(entity.y - surfaceY(terrain, entity.x))).toBeLessThanOrEqual(ACTIVATION_WINDOW);
  }
});
it('follows a player inside a bounded dead zone without jitter', () => {
  const camera = new Camera({ width: 426, height: 240, worldWidth: 2400, worldHeight: 240 });
  camera.update(100, 90);
  const settled = camera.position;
  camera.update(108, 92);
  expect(camera.position).toEqual(settled);
  camera.update(900, 92);
  expect(camera.position.x).toBeGreaterThan(settled.x);
  expect(camera.position.x).toBeLessThanOrEqual(2400 - 426);
});
it('keeps camera at both world bounds', () => {
  const camera = new Camera({ width: 426, height: 240, worldWidth: 800, worldHeight: 400 });
  camera.update(-100, -100);
  expect(camera.position).toEqual({ x: 0, y: 0 });
  camera.update(1000, 1000);
  expect(camera.position).toEqual({ x: 374, y: 160 });
});

it.each(PLAINS_LEVEL.checkpoints)('plants $id and its recovery point on the terrain', (checkpoint) => {
  const ground = surfaceY(PLAINS_LEVEL, checkpoint.x);
  expect(checkpoint.y).toBe(ground);
  expect(PLAINS_LEVEL.entities.find((entity) => entity.id === checkpoint.id)).toMatchObject({
    kind: 'checkpoint', x: checkpoint.x, y: ground,
  });
});

it.each(PLAINS_LEVEL.entities.filter((entity) => entity.kind === 'decoration' || entity.kind === 'slime'))(
  'plants $id on the terrain beneath its visible base', (entity) => {
    expect(entity.y).toBe(surfaceY(PLAINS_LEVEL, entity.x));
  },
);
