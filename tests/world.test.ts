import { expect, it } from 'vitest';
import { PLAINS_LEVEL, validateLevel } from '../src/world/level';
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
it('keeps terrain segments joined and lands every checkpoint on the ground beneath it', () => {
  for (let index = 1; index < PLAINS_LEVEL.surfaces.length; index++) {
    expect(PLAINS_LEVEL.surfaces[index - 1].x2).toBe(PLAINS_LEVEL.surfaces[index].x1);
    expect(PLAINS_LEVEL.surfaces[index - 1].y2).toBe(PLAINS_LEVEL.surfaces[index].y1);
  }
  const terrain = { minX: PLAINS_LEVEL.minX, maxX: PLAINS_LEVEL.maxX, surfaces: PLAINS_LEVEL.surfaces };
  for (const checkpoint of PLAINS_LEVEL.checkpoints) {
    expect(checkpoint.y).toBeCloseTo(surfaceY(terrain, checkpoint.x), 5);
    expect(checkpoint.x).toBeLessThan(PLAINS_LEVEL.finish.x);
  }
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
