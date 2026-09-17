import { describe, expect, it } from 'vitest';
import { DEFAULT_MOVEMENT, MAX_STEP_SECONDS, createPlayer, simulatePlayer, launchSpring, animationFor, type PlatformBody, type Terrain } from '../src/game/movement';
import { platformBodiesAt, type MovingPlatform } from '../src/game/platforms';

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

describe('riding moving platforms', () => {
  const ferry: MovingPlatform = { id: 'ferry', from: { x: 100, y: 140 }, to: { x: 300, y: 140 }, width: 60, seconds: 4 };
  const lift: MovingPlatform = { id: 'lift', from: { x: 100, y: 140 }, to: { x: 100, y: 80 }, width: 60, seconds: 2 };
  const drop = (x: number, y: number) => {
    const player = createPlayer(x, flat);
    player.y = y;
    player.onGround = false;
    return player;
  };
  /** Runs the sim the way a scene does: advance the platforms, then collide with where they now are. */
  const ride = (player: ReturnType<typeof drop>, platforms: readonly MovingPlatform[], frames: number,
    horizontal = 0, from = 0): number => {
    let seconds = from;
    for (let frame = 0; frame < frames; frame++) {
      seconds += 1 / 60;
      simulatePlayer(player, input(horizontal), flat, 1 / 60, platformBodiesAt(platforms, seconds, 1 / 60));
    }
    return seconds;
  };

  it('lands on a slab from above and is carried with it', () => {
    const player = drop(130, 60);
    const seconds = ride(player, [ferry], 60);
    expect(player.onGround).toBe(true);
    expect(player.platformId).toBe('ferry');
    expect(player.y + DEFAULT_MOVEMENT.height).toBeCloseTo(140, 6);
    expect(player.groundVelocityX).toBeCloseTo(50, 6);
    const offset = player.x - platformBodiesAt([ferry], seconds)[0].x;
    const later = ride(player, [ferry], 90, 0, seconds);
    expect(player.x - platformBodiesAt([ferry], later)[0].x).toBeCloseTo(offset, 4);
    expect(player.x).toBeGreaterThan(130);
  });

  it('is lifted by a rising slab and left behind when it is walked off', () => {
    const player = drop(130, 60);
    ride(player, [lift], 180);
    expect(player.platformId).toBe('lift');
    expect(player.y + DEFAULT_MOVEMENT.height).toBeLessThan(140);
    ride(player, [lift], 120, 1);
    expect(player.platformId).toBeNull();
    expect(player.groundVelocityX).toBe(0);
    expect(player.y + DEFAULT_MOVEMENT.height).toBeCloseTo(180, 6);
  });

  it('passes up through a slab and lands on its top face', () => {
    const player = createPlayer(130, flat);
    const overhead: PlatformBody[] = [{ id: 'overhead', x: 100, y: 150, width: 60, height: 10, vx: 0, vy: 0 }];
    simulatePlayer(player, input(0, true), flat, 1 / 60, overhead);
    let highest = player.y;
    for (let frame = 0; frame < 20; frame++) {
      simulatePlayer(player, input(0, false, true), flat, 1 / 60, overhead);
      highest = Math.min(highest, player.y);
    }
    expect(highest + DEFAULT_MOVEMENT.height).toBeLessThan(150);
    for (let frame = 0; frame < 40; frame++) simulatePlayer(player, input(), flat, 1 / 60, overhead);
    expect(player.y + DEFAULT_MOVEMENT.height).toBeCloseTo(150, 6);
    expect(player.platformId).toBe('overhead');
  });

  it('ignores a slab parked under the terrain', () => {
    const player = createPlayer(130, flat);
    const buried: PlatformBody[] = [{ id: 'buried', x: 100, y: 200, width: 60, height: 10, vx: 60, vy: 0 }];
    for (let frame = 0; frame < 60; frame++) simulatePlayer(player, input(), flat, 1 / 60, buried);
    expect(player.platformId).toBeNull();
    expect(player.x).toBe(130);
    expect(player.y + DEFAULT_MOVEMENT.height).toBe(180);
  });

  it('keeps the ride momentum in a jump and stops being carried', () => {
    const player = drop(130, 60);
    const seconds = ride(player, [ferry], 60);
    expect(player.vx).toBeCloseTo(0, 6);
    simulatePlayer(player, input(0, true), flat, 1 / 60, platformBodiesAt([ferry], seconds + 1 / 60));
    expect(player.vx).toBeCloseTo(50, 6);
    expect(player.platformId).toBeNull();
    expect(player.groundVelocityX).toBe(0);
    expect(player.vy).toBeLessThan(0);
  });

  it('never exceeds top speed in either direction when a jump inherits the ride', () => {
    const backwards: MovingPlatform = { ...ferry, from: { x: 300, y: 140 }, to: { x: 100, y: 140 } };
    for (const [platform, heading] of [[ferry, 1], [backwards, -1]] as const) {
      const player = drop(heading > 0 ? 130 : 270, 60);
      const seconds = ride(player, [platform], 60);
      player.vx = heading * DEFAULT_MOVEMENT.maxSpeed;
      simulatePlayer(player, input(heading, true), flat, 1 / 60, platformBodiesAt([platform], seconds + 1 / 60));
      expect(Math.abs(player.vx)).toBeLessThanOrEqual(DEFAULT_MOVEMENT.maxSpeed);
      expect(Math.sign(player.vx)).toBe(heading);
    }
  });

  it('keeps a rider aboard across the longest step the simulation accepts', () => {
    // The clock is fixed at 1/60, but a caught-up frame may hand movement a much larger step;
    // the ride carries Henry on both axes rather than relying on the snap slack alone.
    for (const dt of [1 / 60, 1 / 30, MAX_STEP_SECONDS]) {
      const player = drop(130, 60);
      let seconds = ride(player, [lift], 60);
      expect(player.platformId).toBe('lift');
      for (let step = 0; step < 40; step++) {
        seconds += dt;
        simulatePlayer(player, input(), flat, dt, platformBodiesAt([lift], seconds, dt));
        expect(player.platformId).toBe('lift');
      }
    }
  });

  it('stops being carried when a spring launches Henry off a ride', () => {
    const player = drop(130, 60);
    ride(player, [ferry], 60);
    launchSpring(player);
    expect(player.platformId).toBeNull();
    expect(player.groundVelocityX).toBe(0);
  });
});
