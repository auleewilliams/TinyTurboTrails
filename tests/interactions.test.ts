import { describe, expect, it } from 'vitest';
import { DEFAULT_MOVEMENT, createPlayer, simulatePlayer, surfaceY, type Player } from '../src/game/movement';
import { PLAINS_LEVEL } from '../src/world/level';
import { advancePatrols, applySpring, activateCheckpoint, collectGem, createRun, damagePlayer, entityPosition, entityState, isEntityActive, recoverFromFall, startNewRun, stepEntities, tickRun, touchesPlayer, type RunEvent } from '../src/game/interactions';
import type { LevelData, WorldEntity } from '../src/world/level';

const terrain = { minX: 0, maxX: 400, surfaces: [{ x1: 0, x2: 400, y1: 180, y2: 180 }] };
function player(): Player { return createPlayer(60, terrain); }
function events(): RunEvent[] { return []; }

describe('in-memory run interactions', () => {
  it('collects each stable gem ID once and preserves it after recovery', () => {
    const run = createRun(PLAINS_LEVEL);
    const log = events();
    expect(collectGem(run, 'gem-001', log)).toBe(true);
    expect(collectGem(run, 'gem-001', log)).toBe(false);
    activateCheckpoint(run, 'checkpoint-meadow', log);
    recoverFromFall(run, player(), log, PLAINS_LEVEL);
    expect(run.collectedGems.has('gem-001')).toBe(true);
    expect(run.checkpointId).toBe('checkpoint-meadow');
    expect(log.map((event) => event.type)).toEqual(['gem', 'checkpoint', 'recover']);
  });

  it('keeps a collected gem out of the world until a new run restores it', () => {
    const run = createRun(PLAINS_LEVEL);
    const log = events();
    expect(isEntityActive(run, 'gem-001')).toBe(true);
    collectGem(run, 'gem-001', log);
    expect(isEntityActive(run, 'gem-001')).toBe(false);
    recoverFromFall(run, player(), log, PLAINS_LEVEL);
    expect(isEntityActive(run, 'gem-001')).toBe(false);
    expect(isEntityActive(run, 'gem-002')).toBe(true);
    startNewRun(run, PLAINS_LEVEL);
    expect(isEntityActive(run, 'gem-001')).toBe(true);
  });

  it('applies knockback and invulnerability, preventing damage traps', () => {
    const run = createRun(PLAINS_LEVEL);
    const henry = player();
    henry.vx = 30;
    const log = events();
    expect(damagePlayer(run, henry, 1, log)).toBe(true);
    expect(henry.vx).toBeLessThan(0);
    expect(henry.vy).toBeLessThan(0);
    expect(run.invulnerableSeconds).toBeGreaterThan(0);
    expect(damagePlayer(run, henry, 1, log)).toBe(false);
    tickRun(run, 1.1);
    expect(damagePlayer(run, henry, -1, log)).toBe(true);
  });

  it('launches from springs with a distinct event and keeps lateral speed', () => {
    const run = createRun(PLAINS_LEVEL);
    const henry = player();
    henry.vx = 180;
    const log = events();
    applySpring(run, henry, 'spring-001', log);
    expect(henry.vy).toBe(-DEFAULT_MOVEMENT.springVelocity);
    expect(henry.vx).toBe(180);
    expect(log[0]).toEqual({ type: 'spring', entityId: 'spring-001' });
  });

  it('launches only once during sustained contact and rearms after separation', () => {
    const run = createRun(PLAINS_LEVEL);
    const henry = player();
    const log = events();
    applySpring(run, henry, 'spring-001', log);
    henry.vy = -100;
    for (let step = 0; step < 10; step++) applySpring(run, henry, 'spring-001', log);
    expect(log).toEqual([{ type: 'spring', entityId: 'spring-001' }]);
    expect(henry.vy).toBe(-100);
    applySpring(run, henry, 'spring-001', log, false);
    expect(log).toHaveLength(1);
    applySpring(run, henry, 'spring-001', log);
    expect(log).toHaveLength(2);
    expect(henry.vy).toBe(-DEFAULT_MOVEMENT.springVelocity);
    expect(isEntityActive(run, 'spring-001')).toBe(true);
  });

  it('tracks springs independently and clears contact when recovering', () => {
    const run = createRun(PLAINS_LEVEL);
    const henry = player();
    const log = events();
    applySpring(run, henry, 'spring-001', log);
    applySpring(run, henry, 'spring-002', log);
    applySpring(run, henry, 'spring-001', log);
    expect(log.map((event) => event.type)).toEqual(['spring', 'spring']);
    recoverFromFall(run, henry, log, PLAINS_LEVEL);
    applySpring(run, henry, 'spring-001', log);
    expect(log.map((event) => event.type)).toEqual(['spring', 'spring', 'recover', 'spring']);
  });

  it('new runs clear gems, checkpoints, protection and entity state', () => {
    const run = createRun(PLAINS_LEVEL);
    const log = events();
    collectGem(run, 'gem-001', log);
    activateCheckpoint(run, 'checkpoint-meadow', log);
    run.invulnerableSeconds = 0.8;
    applySpring(run, player(), 'spring-001', log);
    startNewRun(run, PLAINS_LEVEL);
    applySpring(run, player(), 'spring-001', log);
    expect(log.filter((event) => event.type === 'spring')).toHaveLength(2);
    expect(run.collectedGems.size).toBe(0);
    expect(run.checkpointId).toBeNull();
    expect(run.invulnerableSeconds).toBe(0);
    expect(run.entities).toEqual(PLAINS_LEVEL.entities.map((entity) =>
      ({ id: entity.id, active: true, x: entity.x, y: entity.y, direction: 1 })));
  });

  it('recovers safely at the latest checkpoint with no falling velocity', () => {
    const run = createRun(PLAINS_LEVEL);
    const henry = player();
    const log = events();
    activateCheckpoint(run, 'checkpoint-cave', log);
    henry.x = 2000; henry.y = -300; henry.vx = 200; henry.vy = 900;
    recoverFromFall(run, henry, log, PLAINS_LEVEL);
    const checkpoint = PLAINS_LEVEL.checkpoints.find((candidate) => candidate.id === 'checkpoint-cave')!;
    expect(henry.x).toBe(checkpoint.x);
    expect(henry.y).toBe(checkpoint.y - DEFAULT_MOVEMENT.height);
    expect(henry.vx).toBe(0);
    expect(henry.vy).toBe(0);
    expect(henry.onGround).toBe(true);
  });

  it('recovers safely from every Plains checkpoint and keeps collected gems', () => {
    for (const checkpoint of PLAINS_LEVEL.checkpoints) {
      const run = createRun(PLAINS_LEVEL);
      const henry = player();
      const log = events();
      collectGem(run, 'gem-001', log);
      activateCheckpoint(run, checkpoint.id, log);
      henry.x = checkpoint.x + 200; henry.y = PLAINS_LEVEL.height + 100; henry.vx = 240; henry.vy = 900;
      recoverFromFall(run, henry, log, PLAINS_LEVEL);
      expect(henry.x).toBe(checkpoint.x);
      expect(henry.y + DEFAULT_MOVEMENT.height).toBe(surfaceY(PLAINS_LEVEL, checkpoint.x));
      expect(henry.vx).toBe(0);
      expect(henry.vy).toBe(0);
      expect(henry.onGround).toBe(true);
      expect(run.collectedGems.has('gem-001')).toBe(true);
      expect(collectGem(run, 'gem-001', log)).toBe(false);
      simulatePlayer(henry, { horizontal: 0, jumpPressed: false, jumpHeld: false }, PLAINS_LEVEL, 1 / 60);
      expect(henry.y + DEFAULT_MOVEMENT.height).toBe(surfaceY(PLAINS_LEVEL, henry.x));
      expect(henry.vy).toBe(0);
      expect(henry.onGround).toBe(true);
    }
  });
});

const patrolLevel: LevelData = {
  ...PLAINS_LEVEL,
  minX: 0,
  maxX: 400,
  width: 400,
  start: { x: 20, y: 180 },
  finish: { x: 380, y: 180, asset: 'finish-arch' },
  surfaces: terrain.surfaces,
  checkpoints: [{ id: 'patrol-checkpoint', x: 20, y: 180 }],
  entities: [
    { id: 'patrol-checkpoint', kind: 'checkpoint', x: 20, y: 180, asset: 'checkpoint', layer: 'world' },
    { id: 'walker', kind: 'slime', x: 200, y: 180, asset: 'slime', layer: 'world',
      patrol: { minX: 100, maxX: 300, speed: 50 } },
    { id: 'sitter', kind: 'slime', x: 350, y: 180, asset: 'slime', layer: 'world' },
  ],
};
const walker = patrolLevel.entities.find((entity) => entity.id === 'walker') as WorldEntity;

describe('patrolling entities', () => {
  it('walks between its bounds and turns around at each end', () => {
    const run = createRun(patrolLevel);
    advancePatrols(run, patrolLevel, 1 / 60);
    expect(entityState(run, 'walker')!.x).toBeGreaterThan(walker.x);
    let direction = 1;
    let turns = 0;
    let lowest = Infinity;
    let highest = -Infinity;
    for (let step = 0; step < 600; step++) {
      advancePatrols(run, patrolLevel, 1 / 60);
      const state = entityState(run, 'walker')!;
      lowest = Math.min(lowest, state.x);
      highest = Math.max(highest, state.x);
      if (state.direction !== direction) { turns++; direction = state.direction; }
    }
    // Ten seconds at 50px/s covers the 200px lane several times over.
    expect(lowest).toBe(100);
    expect(highest).toBe(300);
    expect(turns).toBeGreaterThanOrEqual(2);
  });

  it('leaves level data untouched and static entities where they stand', () => {
    const run = createRun(patrolLevel);
    for (let step = 0; step < 120; step++) advancePatrols(run, patrolLevel, 1 / 60);
    expect(walker.x).toBe(200);
    expect(entityPosition(run, walker).x).not.toBe(200);
    const sitter = patrolLevel.entities.find((entity) => entity.id === 'sitter')!;
    expect(entityPosition(run, sitter)).toEqual({ x: sitter.x, y: sitter.y });
  });

  it('keeps a patrolling slime standing on the terrain it crosses', () => {
    const ramped: LevelData = { ...patrolLevel, surfaces: [
      { x1: 0, x2: 100, y1: 180, y2: 180 },
      { x1: 100, x2: 300, y1: 180, y2: 120 },
      { x1: 300, x2: 400, y1: 120, y2: 120 },
    ] };
    const run = createRun(ramped);
    for (let step = 0; step < 60; step++) advancePatrols(run, ramped, 1 / 60);
    const state = entityState(run, 'walker')!;
    expect(state.x).toBeCloseTo(250, 5);
    expect(state.y).toBeCloseTo(surfaceY(ramped, state.x), 5);
  });

  it('damages Henry when the slime walks into him, not only when he walks into it', () => {
    const run = createRun(patrolLevel);
    const henry = player();
    henry.x = 290;
    henry.y = 180 - DEFAULT_MOVEMENT.height;
    const log = events();
    stepEntities(run, patrolLevel, henry, 1 / 60, log);
    expect(log).toEqual([]);
    for (let step = 0; step < 120 && log.length === 0; step++) stepEntities(run, patrolLevel, henry, 1 / 60, log);
    expect(log).toEqual([{ type: 'damage', entityId: 'walker' }]);
    // The slime caught him from the left, so the knockback throws him right.
    expect(henry.vx).toBeGreaterThan(0);
  });

  it('restarts every patrol at its level position for a new run', () => {
    const run = createRun(patrolLevel);
    advancePatrols(run, patrolLevel, 1.5);
    expect(entityState(run, 'walker')?.x).not.toBe(walker.x);
    startNewRun(run, patrolLevel);
    expect(entityState(run, 'walker')).toEqual({ id: 'walker', active: true, x: walker.x, y: walker.y, direction: 1 });
  });

  it('clamps a long frame so a patrol cannot tunnel past Henry', () => {
    const run = createRun(patrolLevel);
    advancePatrols(run, patrolLevel, 10);
    expect(entityState(run, 'walker')?.x).toBe(205);
  });

  it('shares one contact window between the scenes', () => {
    const henry = player();
    expect(touchesPlayer(henry, henry.x, henry.y + 34)).toBe(true);
    expect(touchesPlayer(henry, henry.x + 19, henry.y + 34)).toBe(false);
    expect(touchesPlayer(henry, henry.x, henry.y + 34 + 29)).toBe(false);
  });
});
