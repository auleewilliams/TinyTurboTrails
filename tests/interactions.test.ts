import { describe, expect, it } from 'vitest';
import { DEFAULT_MOVEMENT, MAX_STEP_SECONDS, createPlayer, simulatePlayer, surfaceY, type Player } from '../src/game/movement';
import { PLAINS_LEVEL } from '../src/world/level';
import {
  crossesCheckpoint, CRUMBLE_WARNING_SECONDS, activeLedgePlatforms, advancePatrols, applySpring, activateCheckpoint,
  collectGem, createRun, damagePlayer, entityPosition, entityState, isEntityActive,
  ledgeWarningProgress, recoverFromFall, startNewRun, stepEntities, tickRun, touchesPlayer,
  type RunEvent,
} from '../src/game/interactions';
import type { LevelData, WorldEntity } from '../src/world/level';
import { LEVELS, QUARRY_RUN } from '../src/world/levels';

const terrain = { minX: 0, maxX: 400, surfaces: [{ x1: 0, x2: 400, y1: 180, y2: 180 }] };
function player(): Player { return createPlayer(60, terrain); }
function events(): RunEvent[] { return []; }

describe('in-memory run interactions', () => {
  it('starts and resets a run with three health pips', () => {
    const run = createRun(PLAINS_LEVEL);
    expect(run.health).toBe(3);
    run.health = 1;
    run.healthFlashPip = 1;
    run.healthFlashSeconds = 0.2;
    startNewRun(run, PLAINS_LEVEL);
    expect(run.health).toBe(3);
    expect(run.healthFlashPip).toBeNull();
    expect(run.healthFlashSeconds).toBe(0);
  });

  it('does not heal when a checkpoint is activated', () => {
    const run = createRun(PLAINS_LEVEL);
    run.health = 1;
    expect(activateCheckpoint(run, 'checkpoint-meadow', events())).toBe(true);
    expect(run.health).toBe(1);
  });

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
    expect(damagePlayer(run, henry, 1, log, PLAINS_LEVEL)).toBe(true);
    expect(run.health).toBe(2);
    expect(run.healthFlashPip).toBe(2);
    expect(run.healthFlashSeconds).toBeGreaterThan(0);
    expect(henry.vx).toBeLessThan(0);
    expect(henry.vy).toBeLessThan(0);
    expect(run.invulnerableSeconds).toBeGreaterThan(0);
    expect(damagePlayer(run, henry, 1, log, PLAINS_LEVEL)).toBe(false);
    expect(run.health).toBe(2);
    tickRun(run, 1.1);
    expect(run.healthFlashPip).toBeNull();
    expect(run.healthFlashSeconds).toBe(0);
    expect(damagePlayer(run, henry, -1, log, PLAINS_LEVEL)).toBe(true);
    expect(run.health).toBe(1);
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

  it('refills health on fall recovery without charging a health pip', () => {
    const run = createRun(PLAINS_LEVEL);
    const henry = player();
    const log = events();
    run.health = 1;
    recoverFromFall(run, henry, log, PLAINS_LEVEL);
    expect(run.health).toBe(3);
    expect(run.healthFlashPip).toBeNull();
    expect(log).toEqual([{ type: 'recover' }]);
  });

  it.each([PLAINS_LEVEL, QUARRY_RUN])('losing the last pip respawns at a checkpoint in $name', (level) => {
    const run = createRun(level);
    const henry = createPlayer(level.start.x, level);
    const log = events();
    const checkpoint = level.checkpoints[0];
    activateCheckpoint(run, checkpoint.id, log);
    run.health = 1;
    henry.x = checkpoint.x + 200;
    henry.y = -200;
    expect(damagePlayer(run, henry, 1, log, level, 'hazard-test')).toBe(true);
    expect(henry.x).toBe(checkpoint.x);
    expect(henry.y).toBe(checkpoint.y - DEFAULT_MOVEMENT.height);
    expect(run.health).toBe(3);
    expect(run.healthFlashPip).toBe(0);
    expect(run.healthFlashSeconds).toBeGreaterThan(0);
    expect(log.slice(-2)).toEqual([
      { type: 'damage', entityId: 'hazard-test' },
      { type: 'recover' },
    ]);
  });

  it.each([PLAINS_LEVEL, QUARRY_RUN])('losing the last pip without a checkpoint respawns at the start in $name', (level) => {
    const run = createRun(level);
    const henry = createPlayer(level.start.x + 300, level);
    const log = events();
    run.health = 1;
    expect(damagePlayer(run, henry, -1, log, level)).toBe(true);
    expect(henry.x).toBe(level.start.x);
    expect(henry.y).toBe(level.start.y - DEFAULT_MOVEMENT.height);
    expect(run.health).toBe(3);
    expect(log.map((event) => event.type)).toEqual(['damage', 'recover']);
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

  it('ends the ride when a knockback or a recovery moves Henry, and times platforms from the run clock', () => {
    const run = createRun(PLAINS_LEVEL);
    const log = events();
    tickRun(run, 1 / 60);
    tickRun(run, 1 / 60);
    expect(run.seconds).toBeCloseTo(2 / 60, 6);
    // A stalled frame advances the clock no further than movement integrates it.
    tickRun(run, 5);
    expect(run.seconds).toBeCloseTo(2 / 60 + MAX_STEP_SECONDS, 6);
    const hurt = player();
    hurt.platformId = 'ferry';
    hurt.groundVelocityX = 50;
    damagePlayer(run, hurt, -1, log, PLAINS_LEVEL);
    expect(hurt.platformId).toBeNull();
    expect(hurt.groundVelocityX).toBe(0);
    const fallen = player();
    fallen.platformId = 'ferry';
    fallen.groundVelocityX = 50;
    recoverFromFall(run, fallen, log, PLAINS_LEVEL);
    expect(fallen.platformId).toBeNull();
    expect(fallen.groundVelocityX).toBe(0);
    startNewRun(run, PLAINS_LEVEL);
    expect(run.seconds).toBe(0);
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

const ledgeLevel: LevelData = {
  ...patrolLevel,
  entities: [
    { id: 'patrol-checkpoint', kind: 'checkpoint', x: 20, y: 180, asset: 'checkpoint', layer: 'world' },
    { id: 'ledge-gem', kind: 'gem', x: 60, y: 160, asset: 'gem', layer: 'world' },
    { id: 'test-ledge', kind: 'crumbling-ledge', x: 200, y: 120, width: 72, asset: 'stone', layer: 'world' },
  ],
};

describe('crumbling ledges', () => {
  it('starts solid and begins one fixed warning on first landing', () => {
    const run = createRun(ledgeLevel);
    const henry = createPlayer(200, ledgeLevel);
    henry.y = 120 - DEFAULT_MOVEMENT.height;
    const log = events();

    expect(entityState(run, 'test-ledge')).toMatchObject({
      active: true, ledgePhase: 'stable', ledgeSeconds: 0,
    });
    expect(activeLedgePlatforms(run, ledgeLevel)).toEqual([
      { id: 'test-ledge', x1: 164, x2: 236, y: 120 },
    ]);

    stepEntities(run, ledgeLevel, henry, 1 / 60, log);
    expect(entityState(run, 'test-ledge')).toMatchObject({
      active: true, ledgePhase: 'warning', ledgeSeconds: CRUMBLE_WARNING_SECONDS,
    });
    tickRun(run, 0.25);
    stepEntities(run, ledgeLevel, henry, 1 / 60, log);
    expect(entityState(run, 'test-ledge')?.ledgeSeconds).toBeCloseTo(0.5);
    expect(ledgeWarningProgress(run, 'test-ledge')).toBeCloseTo(1 / 3);
  });

  it('crumbles on schedule away from Henry and leaves collision inactive', () => {
    const run = createRun(ledgeLevel);
    const henry = createPlayer(200, ledgeLevel);
    henry.y = 120 - DEFAULT_MOVEMENT.height;
    stepEntities(run, ledgeLevel, henry, 1 / 60, events());
    henry.x = 20;

    tickRun(run, CRUMBLE_WARNING_SECONDS);

    expect(entityState(run, 'test-ledge')).toMatchObject({
      active: false, ledgePhase: 'crumbled', ledgeSeconds: 0,
    });
    expect(activeLedgePlatforms(run, ledgeLevel)).toEqual([]);
    expect(isEntityActive(run, 'test-ledge')).toBe(false);
  });

  it('restores ledges on recovery without restoring gems or clearing the checkpoint', () => {
    const run = createRun(ledgeLevel);
    const henry = createPlayer(200, ledgeLevel);
    const log = events();
    henry.y = 120 - DEFAULT_MOVEMENT.height;
    collectGem(run, 'ledge-gem', log);
    activateCheckpoint(run, 'patrol-checkpoint', log);
    stepEntities(run, ledgeLevel, henry, 1 / 60, log);
    tickRun(run, CRUMBLE_WARNING_SECONDS);

    recoverFromFall(run, henry, log, ledgeLevel);

    expect(entityState(run, 'test-ledge')).toMatchObject({
      active: true, ledgePhase: 'stable', ledgeSeconds: 0,
    });
    expect(isEntityActive(run, 'ledge-gem')).toBe(false);
    expect(run.collectedGems.has('ledge-gem')).toBe(true);
    expect(run.checkpointId).toBe('patrol-checkpoint');

    startNewRun(run, ledgeLevel);
    expect(entityState(run, 'test-ledge')).toMatchObject({
      active: true, ledgePhase: 'stable', ledgeSeconds: 0,
    });
    expect(run.collectedGems.size).toBe(0);
    expect(run.checkpointId).toBeNull();
  });
});

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

describe('forgiving checkpoint crossings', () => {
  it.each(LEVELS)('catches walking, jumping and swept spring-height passes at every $name flag', (level) => {
    for (const checkpoint of level.checkpoints) for (const lift of [0, 80, 150]) for (const distance of [2, 120]) {
      const run = createRun(level);
      run.health = 2;
      run.invulnerableSeconds = 1;
      const henry = createPlayer(checkpoint.x + distance, level);
      henry.y = checkpoint.y - DEFAULT_MOVEMENT.height - lift;
      const previous = { x: checkpoint.x - distance, y: henry.y };
      const log: RunEvent[] = [];
      stepEntities(run, level, henry, 1 / 60, log, previous);
      expect(run.checkpointId).toBe(checkpoint.id);
      expect(run.health).toBe(2);
      expect(log.filter((event) => event.type === 'checkpoint')).toHaveLength(1);
      stepEntities(run, level, henry, 1 / 60, log, previous);
      expect(log.filter((event) => event.type === 'checkpoint')).toHaveLength(1);
      recoverFromFall(run, henry, log, level);
      expect(henry.x).toBe(checkpoint.x);
      expect(run.health).toBe(3);
      startNewRun(run, level);
      expect(run.checkpointId).toBeNull();
    }
  });

  it('rejects distant, below-trail and diagonally near-but-not-crossing paths', () => {
    const flag = { x: 500, y: 180 };
    const feet = (x: number, y: number) => ({ x, y: y - DEFAULT_MOVEMENT.height });
    expect(crossesCheckpoint(feet(100, 180), feet(200, 180), flag)).toBe(false);
    expect(crossesCheckpoint(feet(450, -30), feet(550, -30), flag)).toBe(false);
    expect(crossesCheckpoint(feet(450, 220), feet(550, 220), flag)).toBe(false);
    // Bounding boxes overlap, but the segment passes above the region's top-left corner.
    expect(crossesCheckpoint(feet(430, 0), feet(500, -80), flag)).toBe(false);
    expect(crossesCheckpoint(feet(550, 100), feet(450, 100), flag)).toBe(true);
  });
});
