import { expect, it, vi } from 'vitest';
import { createPlayer, DEFAULT_MOVEMENT, simulatePlayer, type Player } from '../src/game/movement';
import { createRun, entityState, stepEntities, recoverFromFall, damagePlayer, activateCheckpoint, startNewRun, tickRun, type RunEvent, type RunState } from '../src/game/interactions';
import { AdventureScene } from '../src/game/adventure-scene';
import { GameplayPreviewScene } from '../src/game/gameplay-preview';
import { SilentAudio } from '../src/core/audio';
import { LEVELS } from '../src/world/levels';
import type { LevelData } from '../src/world/level';

const neutral = { horizontal: 0, jumpHeld: false, jumpPressed: false, pausePressed: false, mutePressed: false };
const worlds = Object.fromEntries(LEVELS.map(level => [level.atlas, {} as never]));
const level: LevelData = { ...LEVELS[0], minX: 0, maxX: 600, start: { x: 60, y: 180 },
  surfaces: [{ x1: 0, x2: 600, y1: 180, y2: 180 }], checkpoints: [], platforms: [], entities: [
    { id: 'a', kind: 'slime', x: 200, y: 180, asset: 'slime', layer: 'world' },
    { id: 'b', kind: 'slime', x: 260, y: 180, asset: 'slime', layer: 'world' },
  ] };

it.each([
  { name: 'walking side', x: 190, y: 146, vy: 0, previous: { x: 187, y: 146 } },
  { name: 'rising underneath', x: 200, y: 151, vy: -200, previous: { x: 200, y: 155 } },
  { name: 'falling already beside body', x: 200, y: 142, vy: 100, previous: { x: 200, y: 138 } },
  { name: 'entering sideways at top height', x: 200, y: 126, vy: 0, previous: { x: 190, y: 126 } },
])('retains ordinary damage for $name without squashing', ({ x, y, vy, previous }) => {
  const run = createRun(level), player = createPlayer(x, level), events: RunEvent[] = [];
  Object.assign(player, { y, vy, onGround: vy === 0 });
  stepEntities(run, level, player, 0, events, previous);
  expect(run.health).toBe(2);
  expect(events).toEqual([{ type: 'damage', entityId: 'a' }]);
  expect(entityState(run, 'a')?.squashed).not.toBe(true);
});

it('rejects an above-top near miss outside the forgiving feet overlap', () => {
  const run = createRun(level), player = createPlayer(170, level), events: RunEvent[] = [];
  Object.assign(player, { y: 129, vy: 200, onGround: false });
  stepEntities(run, level, player, 0, events, { x: 170, y: 120 });
  expect(events).toEqual([]); expect(run.health).toBe(3);
});

it('naturally chains two equal bounces with no growing impulse or extra rewards', () => {
  const run = createRun(level), player = createPlayer(200, level);
  Object.assign(player, { y: 129, vy: 200, vx: 120, onGround: false, platformId: 'old-ride', groundVelocityX: 90,
    coyoteSeconds: 0.1, jumpBufferSeconds: 0.12 });
  const events: RunEvent[] = [];
  stepEntities(run, level, player, 0, events, { x: 200, y: 120 });
  const impulses = [player.vy];
  expect(player.platformId).toBeNull(); expect(player.groundVelocityX).toBe(0);
  expect(player.jumpBufferSeconds).toBe(0); expect(player.coyoteSeconds).toBe(0);
  for (let frame = 0; frame < 60; frame++) {
    const previous = { x: player.x, y: player.y };
    simulatePlayer(player, { ...neutral, horizontal: 1 }, level, 1 / 60);
    const frameEvents: RunEvent[] = [];
    stepEntities(run, level, player, 1 / 60, frameEvents, previous);
    if (frameEvents.some(event => event.type === 'squash')) impulses.push(player.vy);
    events.push(...frameEvents);
  }
  expect(impulses).toEqual([-260, -260]);
  expect(events).toEqual([{ type: 'squash', entityId: 'a' }, { type: 'squash', entityId: 'b' }]);
  expect(run.health).toBe(3); expect(run.collectedGems.size).toBe(0); expect(run.collectedSpecials.size).toBe(0);
});

it('does not turn a fast fall that misses the top into a squash after terrain clamps it', () => {
  const run = createRun(level), player = createPlayer(163, level), events: RunEvent[] = [];
  Object.assign(player, { y: 106, vy: 1000, vx: 220, onGround: false, coyoteSeconds: 0 });
  const previous = { x: player.x, y: player.y };
  const trajectory = simulatePlayer(player, { ...neutral, horizontal: 1 }, level, 0.1);
  stepEntities(run, level, player, 0.1, events, previous, trajectory);
  expect(events).toEqual([{ type: 'damage', entityId: 'a' }]);
  expect(entityState(run, 'a')?.squashed).not.toBe(true);
  expect(run.health).toBe(2);
});

it('keeps a descending approach safe when the same step also crossed the jump apex', () => {
  const run = createRun(level), player = createPlayer(200, level), events: RunEvent[] = [];
  Object.assign(player, { y: 123, vy: 50, onGround: false });
  stepEntities(run, level, player, 0.1, events, { x: 200, y: 125 }, [
    { from: { x: 200, y: 125 }, to: { x: 200, y: 120 }, falling: false },
    { from: { x: 200, y: 120 }, to: { x: 200, y: 123 }, falling: true },
  ]);
  expect(events).toEqual([]); expect(run.health).toBe(3);
});

it('gives a much lower apex than even a released normal jump and rearms variable jumps on landing', () => {
  const player = createPlayer(200, level), run = createRun(level);
  Object.assign(player, { y: 129, vy: 200, onGround: false });
  stepEntities(run, level, player, 0, [], { x: 200, y: 120 });
  const start = player.y; let apex = start;
  for (let frame = 0; frame < 60; frame++) { simulatePlayer(player, neutral, level, 1 / 60); apex = Math.min(apex, player.y); }
  expect(start - apex).toBeLessThan(24);
  expect(player.squashBounce).toBe(false); expect(player.onGround).toBe(true);
  const ground = player.y; let jumpApex = ground;
  for (let frame = 0; frame < 60; frame++) {
    simulatePlayer(player, { ...neutral, jumpPressed: frame === 0 }, level, 1 / 60);
    jumpApex = Math.min(jumpApex, player.y);
  }
  expect(ground - jumpApex).toBeGreaterThan(45);
  expect(player.y + DEFAULT_MOVEMENT.height).toBe(180);
});

it.each(LEVELS)('$name preserves every flattened slime through both checkpoint recoveries then resets the run', level => {
  const run = createRun(level), player = createPlayer(level.start.x, level), events: RunEvent[] = [];
  activateCheckpoint(run, level.checkpoints[0].id, events);
  for (const slime of level.entities.filter(entity => entity.kind === 'slime')) {
    Object.assign(player, { x: slime.x, y: slime.y - 53, vy: 200, onGround: false });
    stepEntities(run, level, player, 0, events, { x: slime.x, y: slime.y - 60 });
    expect(entityState(run, slime.id)?.squashed).toBe(true);
  }
  recoverFromFall(run, player, events, level);
  expect(player.x).toBe(level.checkpoints[0].x);
  run.health = 1; run.invulnerableSeconds = 0;
  damagePlayer(run, player, 1, events, level);
  expect(player.x).toBe(level.checkpoints[0].x); expect(run.health).toBe(3);
  for (const slime of level.entities.filter(entity => entity.kind === 'slime')) expect(entityState(run, slime.id)?.squashed).toBe(true);
  tickRun(run, 0.1);
  startNewRun(run, level);
  expect(run).toEqual(createRun(level));
});

it('orders epsilon-tied tops by stable ID rather than their tiny height difference', () => {
  const pair = { ...level, entities: level.entities.map((entity, index) => ({ ...entity, x: 200, y: 180 + (index === 0 ? 1e-8 : 0) })) };
  const run = createRun(pair), player = createPlayer(200, pair), events: RunEvent[] = [];
  Object.assign(player, { y: 129, vy: 200, onGround: false });
  stepEntities(run, pair, player, 0, events, { x: 200, y: 120 });
  expect(events).toEqual([{ type: 'squash', entityId: 'a' }, { type: 'squash', entityId: 'b' }]);
  expect(player.vy).toBe(-260);
});

it('plays a single squish for simultaneous tops in the scene event consumer', () => {
  const pair = { ...level, entities: level.entities.map(entity => ({ ...entity, x: 200 })) };
  const audio = new SilentAudio(), play = vi.spyOn(audio, 'play');
  const scene = new GameplayPreviewScene({} as never, {} as never, audio, pair);
  const live = scene as unknown as { player: Player; run: RunState };
  Object.assign(live.player, { x: 200, y: 124, vy: 200, onGround: false });
  scene.update(1 / 60, neutral);
  expect(live.run.entities.every(entity => entity.squashed)).toBe(true);
  expect(play.mock.calls).toEqual([['squash']]);
});

it.each(['Replay', 'Next trail', 'Map', 'pause return', 'change trail'] as const)('starts upright slimes after %s', action => {
  const scene = new AdventureScene({} as never, {} as never, worlds, new SilentAudio(), LEVELS[0]);
  scene.startSelected(); scene.update(1 / 60, neutral);
  const live = scene as unknown as { player: Player; run: RunState; level: LevelData };
  const state = entityState(live.run, 'slime-001')!;
  Object.assign(live.player, { x: state.x, y: state.y - 56, vy: 200, onGround: false });
  scene.update(1 / 60, neutral);
  expect(state.squashed).toBe(true);
  const oldRun = live.run;
  if (action === 'pause return' || action === 'change trail') {
    scene.returnToTrails();
    if (action === 'change trail') scene.selectDestination(1);
    scene.startSelected();
  } else {
    live.player.x = live.level.finish.x;
    scene.update(1 / 60, neutral); expect(scene.screenState).toBe('finish');
    scene.activateFinish(action);
    if (action === 'Map') scene.startSelected();
  }
  expect(scene.screenState).toBe('playing');
  expect(live.run).not.toBe(oldRun);
  expect(live.run.entities).toEqual(createRun(live.level).entities);
  expect(live.player.squashBounce).not.toBe(true);
});
