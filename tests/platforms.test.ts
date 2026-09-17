import { describe, expect, it } from 'vitest';
import {
  PLATFORM_HEIGHT, PLATFORM_MAX_SPEED, platformBodiesAt, platformBodyAt, platformCycleSeconds,
  platformPhase, platformSpeed, type MovingPlatform,
} from '../src/game/platforms';
import { DEFAULT_MOVEMENT } from '../src/game/movement';
import { Camera } from '../src/world/camera';
import { PLAINS_LEVEL, validateLevel } from '../src/world/level';
import { LEVELS } from '../src/world/levels';

const ferry: MovingPlatform = { id: 'ferry', from: { x: 100, y: 150 }, to: { x: 200, y: 100 }, width: 48, seconds: 2, pause: 1 };

describe('moving platform timing', () => {
  it('parks at both ends and travels at a constant speed between them', () => {
    expect(platformCycleSeconds(ferry)).toBe(6);
    expect(platformPhase(ferry, 0)).toEqual({ progress: 0, direction: 0 });
    expect(platformPhase(ferry, 0.9)).toEqual({ progress: 0, direction: 0 });
    expect(platformPhase(ferry, 2)).toEqual({ progress: 0.5, direction: 1 });
    expect(platformPhase(ferry, 3.5)).toEqual({ progress: 1, direction: 0 });
    expect(platformPhase(ferry, 5)).toEqual({ progress: 0.5, direction: -1 });
    expect(platformSpeed(ferry)).toBeCloseTo(Math.hypot(100, 50) / 2, 6);
  });

  it('repeats every cycle, so a long run never drifts out of phase', () => {
    for (const seconds of [0.4, 1.7, 2.8, 5.2]) {
      const later = platformBodyAt(ferry, seconds + platformCycleSeconds(ferry) * 7);
      const body = platformBodyAt(ferry, seconds);
      expect(later.x).toBeCloseTo(body.x, 6);
      expect(later.y).toBeCloseTo(body.y, 6);
      expect(later.vx).toBeCloseTo(body.vx, 6);
      expect(later.vy).toBeCloseTo(body.vy, 6);
    }
  });

  it('starts a cycle offset ahead and carries the matching velocity', () => {
    const offset = { ...ferry, offset: 0.25 };
    expect(platformPhase(offset, 0)).toEqual(platformPhase(ferry, 1.5));
    const body = platformBodyAt(ferry, 2);
    expect(body).toEqual({ id: 'ferry', x: 150, y: 125, width: 48, height: PLATFORM_HEIGHT, vx: 50, vy: -25 });
    expect(platformBodyAt(ferry, 5)).toMatchObject({ vx: -50, vy: 25 });
    const parked = platformBodyAt(ferry, 0);
    expect(parked.vx).toBeCloseTo(0, 6);
    expect(parked.vy).toBeCloseTo(0, 6);
  });

  it('treats a level without platforms as an empty body list', () => {
    expect(platformBodiesAt(undefined, 3)).toEqual([]);
    expect(platformBodiesAt([], 3)).toEqual([]);
  });
});

describe('moving platform level data', () => {
  const level = { ...PLAINS_LEVEL, platforms: [
    { id: 'lift', from: { x: 500, y: 150 }, to: { x: 500, y: 100 }, width: 48, seconds: 3 },
  ] };
  it('accepts a slow platform planted above the terrain', () => {
    expect(() => validateLevel(level)).not.toThrow();
  });
  it('rejects platforms that are unreadable, buried, unbounded, mis-timed or duplicated', () => {
    const swap = (platform: Partial<MovingPlatform>): (() => void) => () =>
      validateLevel({ ...level, platforms: [{ ...level.platforms[0], ...platform }] });
    expect(swap({ seconds: 0.2 })).toThrow(/too fast/);
    expect(swap({ from: { x: 500, y: 240 } })).toThrow(/buried/);
    expect(swap({ from: { x: 9950, y: 150 }, to: { x: 9950, y: 100 } })).toThrow(/outside level/);
    expect(swap({ from: { x: 500, y: -20 }, to: { x: 500, y: -10 } })).toThrow(/outside level/);
    expect(swap({ seconds: 0 })).toThrow(/invalid platform timing/);
    expect(swap({ width: 0 })).toThrow(/invalid platform timing/);
    expect(swap({ id: 'gem-001' })).toThrow(/duplicate platform id/);
    expect(() => validateLevel({ ...level, platforms: [level.platforms[0], level.platforms[0]] })).toThrow(/duplicate platform id/);
  });
});

it('keeps every platform slow enough that riding one never lurches the camera', () => {
  expect(PLATFORM_MAX_SPEED).toBeLessThan(DEFAULT_MOVEMENT.maxSpeed);
  const perFrame = PLATFORM_MAX_SPEED / 60;
  for (const level of LEVELS) {
    for (const platform of level.platforms ?? []) {
      const camera = new Camera({ width: 426, height: 240, worldWidth: level.width, worldHeight: level.height });
      let previous = camera.position;
      for (let frame = 0; frame <= Math.ceil(platformCycleSeconds(platform) * 60); frame++) {
        const body = platformBodyAt(platform, frame / 60);
        // Follow the deck the way a rider standing on it would.
        camera.update(body.x + body.width / 2, body.y - DEFAULT_MOVEMENT.height);
        const moved = Math.hypot(camera.position.x - previous.x, camera.position.y - previous.y);
        // The first update snaps from the origin; every later frame is a ride, not a jump cut.
        if (frame > 0) expect(moved).toBeLessThanOrEqual(perFrame + 1e-9);
        previous = camera.position;
      }
    }
  }
});
