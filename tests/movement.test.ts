import { describe, expect, it } from 'vitest';
import {
  DEFAULT_MOVEMENT, createPlayer, simulatePlayer, launchSpring, animationFor,
  type CollisionPlatform, type Terrain,
} from '../src/game/movement';

const flat: Terrain = { minX: 0, maxX: 10000, surfaces: [{ x1: 0, x2: 10000, y1: 180, y2: 180 }] };
const ramp: Terrain = { minX: 0, maxX: 320, surfaces: [{ x1: 0, x2: 160, y1: 180, y2: 120 }, { x1: 160, x2: 320, y1: 120, y2: 120 }] };
const input = (horizontal = 0, jumpPressed = false, jumpHeld = false) => ({ horizontal, jumpPressed, jumpHeld });
const platform: CollisionPlatform = { id: 'ledge', x1: 80, x2: 152, y: 120 };

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

  it('lands on the highest one-way platform while descending at speed', () => {
    const player = createPlayer(70, flat);
    player.y = 70;
    player.vx = DEFAULT_MOVEMENT.maxSpeed;
    player.vy = 300;
    player.onGround = false;

    simulatePlayer(player, input(1), flat, 0.1, [platform]);

    expect(player.x).toBeGreaterThanOrEqual(platform.x1);
    expect(player.y + DEFAULT_MOVEMENT.height).toBe(platform.y);
    expect(player.onGround).toBe(true);
  });

  it('catches a platform edge when Henry\'s body overlaps before his center', () => {
    const player = createPlayer(70, flat);
    player.y = platform.y - DEFAULT_MOVEMENT.height;
    player.vx = DEFAULT_MOVEMENT.maxSpeed;
    player.onGround = true;

    simulatePlayer(player, input(1), flat, 1 / 60, [platform]);

    expect(player.x).toBeLessThan(platform.x1);
    expect(player.x + DEFAULT_MOVEMENT.width / 2).toBeGreaterThan(platform.x1);
    expect(player.y + DEFAULT_MOVEMENT.height).toBe(platform.y);
    expect(player.onGround).toBe(true);
  });

  it('does not inherit the hidden terrain slope while supported by a platform', () => {
    const drop: Terrain = { minX: 0, maxX: 200, surfaces: [
      { x1: 0, x2: 80, y1: 120, y2: 120 },
      { x1: 80, x2: 81, y1: 120, y2: 180 },
      { x1: 81, x2: 200, y1: 180, y2: 180 },
    ] };
    const bridge: CollisionPlatform = { id: 'bridge', x1: 70, x2: 152, y: 120 };
    const player = createPlayer(80.5, drop);
    player.y = bridge.y - DEFAULT_MOVEMENT.height;
    player.vx = 0;
    player.onGround = true;

    simulatePlayer(player, input(), drop, 1 / 60, [bridge]);

    expect(player.vx).toBe(0);
    expect(player.y + DEFAULT_MOVEMENT.height).toBe(bridge.y);
    expect(player.onGround).toBe(true);
  });

  it('passes upward through a one-way platform', () => {
    const player = createPlayer(116, flat);
    player.y = 105;
    player.vy = -500;
    player.onGround = false;

    simulatePlayer(player, input(0, false, true), flat, 0.1, [platform]);

    expect(player.y + DEFAULT_MOVEMENT.height).toBeLessThan(platform.y);
    expect(player.onGround).toBe(false);
  });

  it('falls with coyote time after walking beyond a platform edge', () => {
    const player = createPlayer(140, flat);
    player.y = platform.y - DEFAULT_MOVEMENT.height;
    player.onGround = true;

    while (player.x - DEFAULT_MOVEMENT.width / 2 <= platform.x2 + 1) {
      simulatePlayer(player, input(1), flat, 1 / 60, [platform]);
    }

    expect(player.y + DEFAULT_MOVEMENT.height).toBeLessThan(180);
    expect(player.onGround).toBe(false);
    expect(player.coyoteSeconds).toBeGreaterThan(0);
  });

  it('faces the direction of travel and keeps the last heading while braking through zero', () => {
    const player = createPlayer(20, flat);
    expect(player.facing).toBe(1);
    for (let i = 0; i < 60; i++) simulatePlayer(player, input(1), flat, 1 / 60);
    expect(player.facing).toBe(1);
    for (let i = 0; i < 60; i++) simulatePlayer(player, input(-1), flat, 1 / 60);
    expect(player.vx).toBeLessThan(0);
    expect(player.facing).toBe(-1);
    while (player.vx < -1) {
      simulatePlayer(player, input(0), flat, 1 / 60);
      expect(player.facing).toBe(-1);
    }
    expect(player.facing).toBe(-1);
    for (let i = 0; i < 60; i++) simulatePlayer(player, input(1), flat, 1 / 60);
    expect(player.vx).toBeGreaterThan(1);
    expect(player.facing).toBe(1);
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
