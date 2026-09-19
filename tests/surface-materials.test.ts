import { describe, expect, it } from 'vitest';
import { createPlayer, simulatePlayer, surfaceAt, surfaceY, type Surface, type Terrain } from '../src/game/movement';
import { PLAINS_LEVEL, validateLevel } from '../src/world/level';

const input = (horizontal = 0, jumpPressed = false) => ({ horizontal, jumpPressed, jumpHeld: jumpPressed });
const ground = (properties: Partial<Surface> = {}): Terrain => ({ minX: 0, maxX: 10000,
  surfaces: [{ x1: 0, x2: 10000, y1: 180, y2: 180, ...properties }] });
const ice = ground({ material: 'ice', friction: 0.45 });
const water = ground({ material: 'water', speedMultiplier: 0.65 });
const plain = ground();

it('preserves the complete default movement trajectory', () => {
  const explicit = ground({ friction: 1, speedMultiplier: 1 });
  const a = createPlayer(300, plain);
  const b = createPlayer(300, explicit);
  for (let frame = 0; frame < 180; frame++) {
    const controls = input(frame < 60 ? 1 : frame < 120 ? -1 : 0, frame === 40);
    simulatePlayer(a, controls, plain, 1 / 60);
    simulatePlayer(b, controls, explicit, 1 / 60);
    expect(b).toEqual(a);
  }
});

it.each([0, -1])('ice coasts and reverses gradually with input %s', (horizontal) => {
  const a = createPlayer(300, plain);
  const b = createPlayer(300, ice);
  a.vx = b.vx = 220;
  for (let frame = 0; frame < 15; frame++) {
    simulatePlayer(a, input(horizontal), plain, 1 / 60);
    simulatePlayer(b, input(horizontal), ice, 1 / 60);
  }
  expect(b.vx).toBeGreaterThan(0);
  expect(b.vx).toBeGreaterThan(a.vx);
});

it.each([['ice', 0.45, 1, 220], ['sand', 1, 0.8, 176], ['water', 1, 0.65, 143]] as const)(
  '%s has its intended sustained speed', (material, friction, speedMultiplier, speed) => {
    const terrain = ground({ material, friction, speedMultiplier });
    const player = createPlayer(300, terrain);
    for (let frame = 0; frame < 120; frame++) simulatePlayer(player, input(1), terrain, 1 / 60);
    expect(player.vx).toBeCloseTo(speed, 5);
  },
);

it.each([-1, 1])('slows gradually in water and accelerates after leaving, direction %s', (direction) => {
  const player = createPlayer(5000, water);
  player.vx = direction * 220;
  simulatePlayer(player, input(direction), water, 1 / 60);
  expect(Math.abs(player.vx)).toBeGreaterThan(143);
  expect(Math.abs(player.vx)).toBeLessThan(220);
  for (let i = 0; i < 60; i++) simulatePlayer(player, input(direction), water, 1 / 60);
  expect(player.vx).toBeCloseTo(direction * 143);
  for (let i = 0; i < 60; i++) simulatePlayer(player, input(direction), plain, 1 / 60);
  expect(player.vx).toBeCloseTo(direction * 220);
});

it('shares a clamped left-inclusive joint lookup for height and material', () => {
  const terrain: Terrain = { minX: 0, maxX: 1000, surfaces: [
    { x1: 0, x2: 100, y1: 180, y2: 160 },
    { x1: 100, x2: 1000, y1: 160, y2: 160, material: 'ice', friction: 0.45 },
  ] };
  expect(surfaceAt(terrain, -10)).toBe(terrain.surfaces[0]);
  expect(surfaceAt(terrain, 100)).toBe(terrain.surfaces[0]);
  expect(surfaceAt(terrain, 100.001)).toBe(terrain.surfaces[1]);
  expect(surfaceAt(terrain, 1100)).toBe(terrain.surfaces[1]);
  expect(surfaceY(terrain, 100)).toBe(160);
  expect(surfaceY(terrain, -10)).toBe(180);
});

it.each([ice, water])('does not apply material while airborne, and resumes it after landing', (terrain) => {
  const a = createPlayer(300, plain);
  const b = createPlayer(300, terrain);
  for (const p of [a, b]) { p.onGround = false; p.y = 40; p.vx = 180; }
  for (let i = 0; i < 10; i++) {
    simulatePlayer(a, input(-1), plain, 1 / 60);
    simulatePlayer(b, input(-1), terrain, 1 / 60);
    expect(b).toEqual(a);
  }
  for (let i = 0; i < 120; i++) simulatePlayer(b, input(1), terrain, 1 / 60);
  expect(b.onGround).toBe(true);
  expect(b.vx).toBeCloseTo(terrain === water ? 143 : 220);
  simulatePlayer(b, input(1, true), terrain, 1 / 60);
  expect(b.vy).toBeLessThan(0);
  expect(b.onGround).toBe(false);
  expect(b.vx).toBeGreaterThan(0);
});

it.each([120, 180])('ignores special ground under a platform at height %s', (y) => {
  for (const terrain of [ice, water]) {
    const a = createPlayer(300, plain);
    const b = createPlayer(300, terrain);
    const platform = { id: 'deck', x: 0, y, width: 1000, height: 10, vx: 0, vy: 0 };
    for (const p of [a, b]) { p.platformId = 'deck'; p.y = y - 34; p.vx = 220; }
    simulatePlayer(a, input(), plain, 0.1, [platform]);
    simulatePlayer(b, input(), terrain, 0.1, [platform]);
    expect(b).toEqual(a);
  }
});

describe('authored material validation', () => {
  it.each([
    { friction: NaN }, { friction: Infinity }, { friction: 0.24 }, { friction: 2.01 },
    { speedMultiplier: NaN }, { speedMultiplier: Infinity }, { speedMultiplier: 0.49 }, { speedMultiplier: 1.01 },
    { material: 'lava' }, { material: 'ice' }, { material: 'sand' }, { material: 'water' },
    { friction: 0.45 }, { speedMultiplier: 0.8 },
  ])('rejects unreadable or invalid material %j', (properties) => {
    const level = { ...PLAINS_LEVEL, surfaces: PLAINS_LEVEL.surfaces.map((s, i) => i ? s : { ...s, ...properties }) };
    expect(() => validateLevel(level as typeof PLAINS_LEVEL)).toThrow();
  });
  it.each([{ material: 'ice', friction: 0.45 }, { material: 'sand', speedMultiplier: 0.8 },
    { material: 'water', speedMultiplier: 0.65 }, { friction: 1, speedMultiplier: 1 }])('accepts valid movement %j', (properties) => {
    const level = { ...PLAINS_LEVEL, surfaces: PLAINS_LEVEL.surfaces.map((s, i) => i ? s : { ...s, ...properties }) };
    expect(() => validateLevel(level as typeof PLAINS_LEVEL)).not.toThrow();
  });
});
