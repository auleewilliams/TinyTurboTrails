import { describe, expect, it } from 'vitest';
import { DEFAULT_MOVEMENT, createPlayer, simulatePlayer, launchSpring, animationFor, type Terrain } from '../src/game/movement';

const flat: Terrain = { minX: 0, maxX: 10000, surfaces: [{ x1: 0, x2: 10000, y1: 180, y2: 180 }] };
const ramp: Terrain = { minX: 0, maxX: 320, surfaces: [{ x1: 0, x2: 160, y1: 180, y2: 120 }, { x1: 160, x2: 320, y1: 120, y2: 120 }] };
const input = (horizontal = 0, jumpPressed = false, jumpHeld = false) => ({ horizontal, jumpPressed, jumpHeld });

describe('Henry movement', () => {
  it('accelerates, caps speed and brakes without reversing instantly', () => {
    const player = createPlayer(20, flat);
    for (let i = 0; i < 300; i++) simulatePlayer(player, input(1), flat, 1 / 60);
    expect(player.vx).toBeCloseTo(DEFAULT_MOVEMENT.maxSpeed, 6);
    simulatePlayer(player, input(-1), flat, 1 / 60);
    expect(player.vx).toBeGreaterThan(0);
    for (let i = 0; i < 120; i++) simulatePlayer(player, input(-1), flat, 1 / 60);
    expect(player.vx).toBeLessThan(0);
  });

  it('supports jump buffering and ledge grace', () => {
    const player = createPlayer(20, flat);
    simulatePlayer(player, input(0, true), flat, 1 / 60);
    expect(player.vy).toBeLessThan(0);
    player.x = 320;
    player.onGround = false;
    player.coyoteSeconds = DEFAULT_MOVEMENT.coyoteSeconds;
    simulatePlayer(player, input(0, true), flat, 1 / 60);
    expect(player.vy).toBeLessThan(0);
  });

  it('makes a held jump higher than a released jump', () => {
    const held = createPlayer(20, flat);
    const released = createPlayer(20, flat);
    simulatePlayer(held, input(0, true, true), flat, 1 / 60);
    simulatePlayer(released, input(0, true, false), flat, 1 / 60);
    let heldMinimum = held.y;
    let releasedMinimum = released.y;
    for (let i = 0; i < 40; i++) {
      simulatePlayer(held, input(0, false, true), flat, 1 / 60);
      simulatePlayer(released, input(), flat, 1 / 60);
      heldMinimum = Math.min(heldMinimum, held.y);
      releasedMinimum = Math.min(releasedMinimum, released.y);
    }
    expect(heldMinimum).toBeLessThan(releasedMinimum);
  });

  it('lands on flat terrain and follows a ramp without sinking', () => {
    const player = createPlayer(20, flat);
    player.y = 20;
    for (let i = 0; i < 120; i++) simulatePlayer(player, input(1), flat, 1 / 60);
    expect(player.onGround).toBe(true);
    expect(player.y + DEFAULT_MOVEMENT.height).toBeCloseTo(180, 6);
    player.x = 30;
    player.y = 100;
    player.vy = 0;
    for (let i = 0; i < 120; i++) simulatePlayer(player, input(1), ramp, 1 / 60);
    expect(player.y + DEFAULT_MOVEMENT.height).toBeCloseTo(120, 6);
  });

  it('spring launch is reusable and preserves horizontal momentum', () => {
    for (const horizontal of [0, 120, DEFAULT_MOVEMENT.maxSpeed, -120]) {
      const player = createPlayer(20, flat);
      player.vx = horizontal;
      launchSpring(player, 620);
      expect(player.vy).toBe(-620);
      expect(player.vx).toBe(horizontal);
      expect(player.onGround).toBe(false);
    }
  });

  it('adds downhill acceleration from explicit terrain slope geometry', () => {
    const downhill: Terrain = { minX: 0, maxX: 320, surfaces: [{ x1: 0, x2: 320, y1: 120, y2: 200 }] };
    const player = createPlayer(100, downhill);
    simulatePlayer(player, input(), downhill, 1 / 60);
    expect(player.vx).toBeGreaterThan(0);
  });

  it('does not tunnel through flat terrain at a high falling speed', () => {
    const player = createPlayer(100, flat);
    player.y = 140;
    player.vy = 2200;
    player.onGround = false;
    simulatePlayer(player, input(), flat, 1 / 60);
    expect(player.onGround).toBe(true);
    expect(player.y + DEFAULT_MOVEMENT.height).toBe(180);
  });

  it('selects animation states from movement', () => {
    const player = createPlayer(20, flat);
    expect(animationFor(player)).toBe('idle');
    player.vx = 80;
    expect(animationFor(player)).toBe('run');
    player.vy = -100;
    expect(animationFor(player)).toBe('jump');
    player.vy = 100;
    expect(animationFor(player)).toBe('fall');
  });
});
