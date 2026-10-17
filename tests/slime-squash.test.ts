import { expect, it } from 'vitest';
import { LEVELS } from '../src/world/levels';
import type { LevelData, WorldEntity } from '../src/world/level';
import { createPlayer, DEFAULT_MOVEMENT, simulatePlayer } from '../src/game/movement';
import { createRun, entityState, stepEntities, recoverFromFall, damagePlayer, startNewRun, entityPosition, tickRun, type RunEvent } from '../src/game/interactions';

const slime: WorldEntity = { id: 'slime', kind: 'slime', asset: 'slime', layer: 'world', x: 200, y: 180,
  patrol: { minX: 140, maxX: 260, speed: 36 } };
const level: LevelData = { ...LEVELS[0], minX: 0, maxX: 600, start: { x: 60, y: 180 },
  surfaces: [{ x1: 0, x2: 600, y1: 180, y2: 180 }], checkpoints: [], entities: [slime], platforms: [] };
function landing(x = 200) {
  const player = createPlayer(x, level);
  Object.assign(player, { y: 127, vy: 180, vx: 120, onGround: false });
  return player;
}

it('squashes a falling top landing without damage and keeps sideways velocity', () => {
  const run = createRun(level), player = landing(), events: RunEvent[] = [];
  stepEntities(run, level, player, 0, events, { x: 200, y: 120 });
  expect(run.health).toBe(3);
  expect(events).toEqual([{ type: 'squash', entityId: 'slime' }]);
  expect(entityState(run, 'slime')).toMatchObject({ active: true, squashed: true, x: 200, y: 180 });
  expect(player.vy).toBe(-260);
  expect(player.vx).toBe(120);
  expect(player.onGround).toBe(false);
  expect(player.y + DEFAULT_MOVEMENT.height).toBe(160);
});

it('gives held, released and newly pressed jump the identical small bounce arc', () => {
  const arcs = [false, true, 'press' as const].map(held => {
    const run = createRun(level), player = landing();
    player.coyoteSeconds = 0.1;
    stepEntities(run, level, player, 0, [], { x: 200, y: 120 });
    const arc: number[] = [];
    for (let frame = 0; frame < 20; frame++) {
      simulatePlayer(player, { horizontal: 1, jumpHeld: Boolean(held), jumpPressed: held === 'press' && frame === 0 }, level, 1 / 60);
      arc.push(player.y);
    }
    expect(126 - Math.min(...arc)).toBeGreaterThan(18);
    expect(126 - Math.min(...arc)).toBeLessThan(24);
    return arc;
  });
  expect(arcs[0]).toEqual(arcs[1]);
  expect(arcs[2]).toEqual(arcs[1]);
});

it('forgives feet overlapping a top edge and sweeps horizontal position at impact', () => {
  for (const [fromX, toX] of [[171, 171], [229, 229], [190, 250], [250, 190]]) {
    const run = createRun(level), player = landing(toX), events: RunEvent[] = [];
    player.y = 137;
    stepEntities(run, level, player, 0, events, { x: fromX, y: 120 });
    expect(events).toEqual([{ type: 'squash', entityId: 'slime' }]);
    expect(run.health).toBe(3);
  }
});

it('leaves a visible harmless nonblocking nonpatrolling slime through pit and health recovery', () => {
  const run = createRun(level), player = landing();
  stepEntities(run, level, player, 0, [], { x: 200, y: 120 });
  for (let frame = 0; frame < 60; frame++) {
    Object.assign(player, { x: 200, y: 146, vy: 0, onGround: true });
    const events: RunEvent[] = [];
    stepEntities(run, level, player, 1 / 60, events);
    expect(events).toEqual([]);
    expect(player.vy).toBe(0);
    expect(player.x).toBe(200);
    expect(run.health).toBe(3);
  }
  expect(entityState(run, 'slime')).toMatchObject({ squashed: true, active: true, x: 200, y: 180 });
  recoverFromFall(run, player, [], level);
  expect(entityState(run, 'slime')?.squashed).toBe(true);
  run.health = 1; run.invulnerableSeconds = 0;
  damagePlayer(run, player, 1, [], level);
  expect(run.health).toBe(3);
  expect(entityState(run, 'slime')?.squashed).toBe(true);
  startNewRun(run, level);
  expect(run.entities).toEqual(createRun(level).entities);
});

it('resolves simultaneous tops together once before mixed side contacts regardless of entity order', () => {
  const entities: WorldEntity[] = [
    { ...slime, id: 'b', x: 212 }, { ...slime, id: 'a', x: 188 },
    { ...slime, id: 'side', x: 200, y: 160, patrol: undefined },
    { ...slime, id: 'hazard', kind: 'hazard', x: 200, y: 180, patrol: undefined },
  ];
  const outcomes = [entities, [...entities].reverse()].map(entities => {
    const mixed = { ...level, entities }, run = createRun(mixed), player = landing(), events: RunEvent[] = [];
    stepEntities(run, mixed, player, 0, events, { x: 200, y: 120 });
    expect(run.health).toBe(3);
    expect(events).toEqual([{ type: 'squash', entityId: 'a' }, { type: 'squash', entityId: 'b' }]);
    expect(entityState(run, 'side')?.squashed).not.toBe(true);
    expect(player.vy).toBe(-260);
    expect(player.vx).toBe(120);
    return { player, events };
  });
  expect(outcomes[0]).toEqual(outcomes[1]);
});

it('animates a quick run-owned squash without rendering advancing its timer', () => {
  const run = createRun(level), player = landing();
  stepEntities(run, level, player, 0, [], { x: 200, y: 120 });
  expect(entityPosition(run, slime)).toMatchObject({ squashProgress: 0 });
  tickRun(run, 0.08);
  expect(entityPosition(run, slime)).toMatchObject({ squashProgress: 0.5 });
  const frozen = entityPosition(run, slime);
  expect(entityPosition(run, slime)).toEqual(frozen);
  tickRun(run, 0.08);
  expect(entityPosition(run, slime)).toMatchObject({ squashProgress: 1 });
  tickRun(run, 0.1);
  expect(entityPosition(run, slime)).toMatchObject({ squashProgress: 1 });
});

it('catches a fast falling top crossing even when terrain already stopped the fall', () => {
  const run = createRun(level), player = landing();
  player.y = 70; player.vy = 1000; player.vx = 0;
  const previous = { x: player.x, y: player.y };
  simulatePlayer(player, { horizontal: 0, jumpHeld: false, jumpPressed: false }, level, 0.1);
  expect(player.onGround).toBe(true);
  const events: RunEvent[] = [];
  stepEntities(run, level, player, 0.1, events, previous);
  expect(events).toEqual([{ type: 'squash', entityId: 'slime' }]);
  expect(run.health).toBe(3);
  expect(player.vy).toBe(-260);
});

it('bounces off the first swept top instead of squashing slimes further below it', () => {
  const stacked = { ...level, entities: [{ ...slime, id: 'lower', y: 200, patrol: undefined }, slime] };
  const run = createRun(stacked), player = landing(), events: RunEvent[] = [];
  player.y = 160;
  stepEntities(run, stacked, player, 0, events, { x: 200, y: 100 });
  expect(events).toEqual([{ type: 'squash', entityId: 'slime' }]);
  expect(entityState(run, 'lower')?.squashed).not.toBe(true);
  expect(player.y + DEFAULT_MOVEMENT.height).toBe(160);
});

it('does not damage falling feet just above the squash plane before they can land', () => {
  const run = createRun(level), player = landing(), events: RunEvent[] = [];
  player.y = 123; // feet 157: inside the legacy damage window, above the 160px top.
  stepEntities(run, level, player, 0, events, { x: 200, y: 118 });
  expect(events).toEqual([]);
  expect(run.health).toBe(3);
  player.y = 129;
  stepEntities(run, level, player, 0, events, { x: 200, y: 123 });
  expect(events).toEqual([{ type: 'squash', entityId: 'slime' }]);
  expect(run.health).toBe(3);
});

it('uses the same post-patrol position for top bounds as rendering and ordinary contacts', () => {
  const run = createRun(level), player = landing(173), events: RunEvent[] = [];
  player.y = 145;
  stepEntities(run, level, player, 0.1, events, { x: 173, y: 125 });
  expect(entityState(run, 'slime')?.x).toBe(203.6);
  expect(events).toEqual([]);
  expect(run.health).toBe(3);
});

it('grounds a flattened legacy bouncing slime and never resumes its bounce animation', () => {
  const bouncing = { ...level, entities: [{ ...slime, patrol: undefined, bounce: { amplitude: 8, seconds: 2 } }] };
  const run = createRun(bouncing), player = landing();
  run.seconds = 1;
  player.y = 120;
  stepEntities(run, bouncing, player, 0, [], { x: 200, y: 110 });
  expect(entityState(run, 'slime')).toMatchObject({ squashed: true, y: 180 });
  for (let frame = 0; frame < 120; frame++) {
    tickRun(run, 1 / 60);
    stepEntities(run, bouncing, player, 1 / 60, []);
    expect(entityState(run, 'slime')?.y).toBe(180);
  }
});
