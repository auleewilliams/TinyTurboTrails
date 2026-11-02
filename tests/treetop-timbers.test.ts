import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { hasFixedSupport, validateLevel, type WorldEntity } from '../src/world/level';
import { LEVELS, TREETOP_TIMBERS, levelById } from '../src/world/levels';
import { advanceBounces, advancePatrols, createRun, entityState, startNewRun, stepEntities } from '../src/game/interactions';
import { createPlayer } from '../src/game/movement';

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
  expect(ofKind('slime')).toHaveLength(3);
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

it('grounds eight background bushes and three slimes with clear checkpoints, spring and pickups', () => {
  const level = TREETOP_TIMBERS;
  const bushes = ofKind('decoration');
  expect(bushes).toHaveLength(8);
  for (const entity of [...bushes, ...ofKind('slime')]) {
    expect(level.platforms!.some(platform => platform.from.y === entity.y
      && platform.from.x <= entity.x - 24 && platform.from.x + platform.width >= entity.x + 24), entity.id).toBe(true);
    for (const point of [...level.checkpoints, level.start, level.finish, ...ofKind('spring')]) {
      if (point.y === entity.y) expect(Math.abs(point.x - entity.x), entity.id).toBeGreaterThanOrEqual(entity.kind === 'slime' ? 80 : 40);
    }
    for (const pickup of [...ofKind('gem'), ...ofKind('special')]) {
      if (Math.abs(pickup.y - entity.y) < 30) expect(Math.abs(pickup.x - entity.x), entity.id).toBeGreaterThanOrEqual(30);
    }
  }
  for (const bush of bushes) expect(bush).toMatchObject({ asset: 'bush', layer: 'back' });
});

it('keeps live Timbers slimes above their branches, damages on side contact, and resets their hops', () => {
  const level = TREETOP_TIMBERS, run = createRun(level);
  for (let frame = 0; frame <= 240; frame++) {
    run.seconds = frame / 60;
    advancePatrols(run, level, 1 / 60); advanceBounces(run, level);
    for (const slime of ofKind('slime')) {
      const state = entityState(run, slime.id)!;
      expect(slime.patrol).toBeUndefined();
      expect(state.x).toBe(slime.x);
      expect(state.y).toBeGreaterThanOrEqual(slime.y - 6);
      expect(state.y).toBeLessThanOrEqual(slime.y);
    }
  }
  for (const slime of ofKind('slime')) {
    const contact = createRun(level), player = createPlayer(slime.x, level);
    Object.assign(player, { y: slime.y - 34, onGround: true, vy: 0 });
    stepEntities(contact, level, player, 0, []);
    expect(contact.health).toBe(2);
    expect(entityState(contact, slime.id)!.squashed).toBeFalsy();
  }
  startNewRun(run, level);
  expect(run).toEqual(createRun(level));
});

it('squashes each bouncing slime onto its branch instead of teleporting the flattened sprite to the roots', () => {
  const level = TREETOP_TIMBERS;
  for (const slime of ofKind('slime')) {
    const run = createRun(level), player = createPlayer(slime.x, level);
    run.seconds = 1; advanceBounces(run, level);
    const state = entityState(run, slime.id)!;
    const previous = { x: slime.x, y: state.y - 70 };
    Object.assign(player, { y: state.y - 34, onGround: false, vy: 200 });
    stepEntities(run, level, player, 0, [], previous);
    expect(state.squashed).toBe(true);
    expect(state.y).toBe(slime.y);
    expect(run.health).toBe(3);
    advancePatrols(run, level, 1 / 60); advanceBounces(run, level);
    expect(state.y).toBe(slime.y);
  }
});
