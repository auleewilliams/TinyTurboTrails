import { expect, it } from 'vitest';
import { advanceBounces, createRun, entityPosition, startNewRun, stepEntities, type RunEvent } from '../src/game/interactions';
import { createPlayer } from '../src/game/movement';
import { PLAINS_LEVEL, validateLevel, type LevelData, type WorldEntity } from '../src/world/level';

const jelly: WorldEntity = { id: 'jelly', kind: 'slime', x: 100, y: 198, asset: 'slime', layer: 'world',
  bounce: { amplitude: 8, seconds: 2 } };
const level: LevelData = { ...PLAINS_LEVEL, entities: [...PLAINS_LEVEL.entities, jelly] };

it('bounces once per period, freezes with run time and resets with a new run', () => {
  const run = createRun(level);
  for (const [seconds, y] of [[0, 198], [0.5, 194], [1, 190], [1.5, 194], [2, 198], [4, 198]]) {
    run.seconds = seconds;
    advanceBounces(run, level);
    expect(entityPosition(run, jelly).y).toBeCloseTo(y);
    advanceBounces(run, level);
    expect(entityPosition(run, jelly).y).toBeCloseTo(y);
  }
  run.seconds = 1;
  advanceBounces(run, level);
  startNewRun(run, level);
  expect(run.seconds).toBe(0);
  expect(entityPosition(run, jelly)).toEqual({ x: 100, y: 198 });
});

it('resolves damage at the visible jellyfish position rather than the authored anchor', () => {
  const run = createRun(level);
  run.seconds = 1;
  const player = createPlayer(100, level);
  player.y = 162 - 34;
  player.onGround = false;
  const events: RunEvent[] = [];
  stepEntities(run, level, player, 0, events);
  expect(entityPosition(run, jelly)).toEqual({ x: 100, y: 190 });
  expect(events).toContainEqual({ type: 'damage', entityId: 'jelly' });
});

it.each([
  { amplitude: 0, seconds: 2 }, { amplitude: 13, seconds: 2 }, { amplitude: NaN, seconds: 2 },
  { amplitude: Infinity, seconds: 2 }, { amplitude: 8, seconds: 0.5 }, { amplitude: 8, seconds: 5 },
  { amplitude: 8, seconds: NaN }, { amplitude: 8, seconds: Infinity },
])('rejects invalid bounce %j', (bounce) => {
  expect(() => validateLevel({ ...level, entities: [...PLAINS_LEVEL.entities, { ...jelly, bounce }] })).toThrow();
});
it('restricts bouncing to creatures and accepts a bounded slime bounce', () => {
  expect(() => validateLevel(level)).not.toThrow();
  expect(() => validateLevel({ ...level, entities: [...PLAINS_LEVEL.entities, { ...jelly, kind: 'hazard' }] })).toThrow();
});
