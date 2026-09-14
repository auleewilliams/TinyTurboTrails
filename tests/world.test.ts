import { expect, it } from 'vitest';
import { PLAINS_LEVEL, validateLevel } from '../src/world/level';
import { Camera } from '../src/world/camera';

it('has stable unique entity IDs and traversable terrain data', () => {
  expect(() => validateLevel(PLAINS_LEVEL)).not.toThrow();
  const ids = PLAINS_LEVEL.entities.map((entity) => entity.id);
  expect(new Set(ids).size).toBe(ids.length);
  expect(PLAINS_LEVEL.checkpoints).toHaveLength(3);
  expect(PLAINS_LEVEL.finish.x).toBeGreaterThan(PLAINS_LEVEL.start.x);
});
it('keeps terrain segments joined and provides elevated optional gem routes', () => {
  for (let index = 1; index < PLAINS_LEVEL.surfaces.length; index++) {
    expect(PLAINS_LEVEL.surfaces[index - 1].x2).toBe(PLAINS_LEVEL.surfaces[index].x1);
  }
  const elevatedGems = PLAINS_LEVEL.entities.filter((entity) => entity.kind === 'gem' && entity.y < 110);
  expect(elevatedGems.map((entity) => entity.id)).toEqual(['gem-006']);
  expect(elevatedGems[0].x).toBeGreaterThan(PLAINS_LEVEL.checkpoints[1].x);
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
