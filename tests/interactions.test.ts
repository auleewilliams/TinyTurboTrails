import { describe, expect, it } from 'vitest';
import { DEFAULT_MOVEMENT, createPlayer, type Player } from '../src/game/movement';
import { PLAINS_LEVEL } from '../src/world/level';
import { applySpring, activateCheckpoint, collectGem, createRun, damagePlayer, recoverFromFall, startNewRun, tickRun, type RunEvent } from '../src/game/interactions';

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
    recoverFromFall(run, player(), log);
    expect(run.collectedGems.has('gem-001')).toBe(true);
    expect(run.checkpointId).toBe('checkpoint-meadow');
    expect(log.map((event) => event.type)).toEqual(['gem', 'checkpoint', 'recover']);
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

  it('new runs clear gems, checkpoints, protection and entity state', () => {
    const run = createRun(PLAINS_LEVEL);
    const log = events();
    collectGem(run, 'gem-001', log);
    activateCheckpoint(run, 'checkpoint-meadow', log);
    run.invulnerableSeconds = 0.8;
    startNewRun(run, PLAINS_LEVEL);
    expect(run.collectedGems.size).toBe(0);
    expect(run.checkpointId).toBeNull();
    expect(run.invulnerableSeconds).toBe(0);
    expect(run.entities).toEqual(PLAINS_LEVEL.entities.map((entity) => ({ id: entity.id, active: true })));
  });

  it('recovers safely at the latest checkpoint with no falling velocity', () => {
    const run = createRun(PLAINS_LEVEL);
    const henry = player();
    const log = events();
    activateCheckpoint(run, 'checkpoint-cave', log);
    henry.x = 2000; henry.y = -300; henry.vx = 200; henry.vy = 900;
    recoverFromFall(run, henry, log);
    const checkpoint = PLAINS_LEVEL.checkpoints[2];
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
      expect(henry.y).toBe(checkpoint.y - DEFAULT_MOVEMENT.height);
      expect(henry.vx).toBe(0);
      expect(henry.vy).toBe(0);
      expect(henry.onGround).toBe(true);
      expect(run.collectedGems.has('gem-001')).toBe(true);
    }
  });
});
