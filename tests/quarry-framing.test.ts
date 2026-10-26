import { expect, it } from 'vitest';
import { Camera } from '../src/world/camera';
import { QUARRY_RUN } from '../src/world/levels';
import { createPlayer } from '../src/game/movement';
import { createRun, stepEntities } from '../src/game/interactions';
import { hasFixedSupport } from '../src/world/level';

it('places gem 015 on fixed approach support visibly apart from star 2, with independent contacts', () => {
  const gem = QUARRY_RUN.entities.find(entity => entity.id === 'quarry-gem-015')!;
  const star = QUARRY_RUN.entities.find(entity => entity.id === 'quarry-special-2')!;
  expect(hasFixedSupport(QUARRY_RUN, { x: gem.x, y: gem.y + 18 })).toBe(true);
  // 32px-wide gem and 22px-wide star need a visible gap, and their 18px
  // contact windows must not overlap. This checks authored placement, not counts.
  expect(Math.abs(gem.x - star.x)).toBeGreaterThan(36);
  for (const first of [gem, star]) {
    const run = createRun(QUARRY_RUN), player = createPlayer(first.x, QUARRY_RUN, first.y + 18);
    stepEntities(run, QUARRY_RUN, player, 1 / 60, []);
    expect(run.collectedGems.has(gem.id)).toBe(first.kind === 'gem');
    expect(run.collectedSpecials.has(star.id)).toBe(first.kind === 'special');
  }
});

it('reveals the next permanent terrace below every Quarry rest in descent and upward retrace', () => {
  const bounds = { width: 426, height: 240, worldWidth: QUARRY_RUN.width, worldHeight: QUARRY_RUN.height, vertical: true };
  const camera = new Camera(bounds);
  const levels = [140, 210, 280, 350, 420, 490, 560, 630, 700, 770, 840, 910, 980];
  const samples = [];
  for (const feet of [...levels, ...levels.slice().reverse()]) {
    camera.update(420, feet - 34);
    const top = feet - 44 - camera.position.y;
    expect(top).toBeGreaterThanOrEqual(64);
    expect(feet + 4 - camera.position.y).toBeLessThan(221);
    if (feet < 980) {
      const landing = feet + 70 - camera.position.y;
      samples.push(landing);
      expect(landing, `feet ${feet}, camera ${camera.position.y}`).toBeLessThanOrEqual(216);
      expect(landing).toBeGreaterThan(59);
    }
    expect(camera.position.y).toBeGreaterThanOrEqual(-64);
    expect(camera.position.y).toBeLessThanOrEqual(QUARRY_RUN.height - 240);
  }
  expect(samples).toHaveLength(24);
  camera.update(300, 53 - 34); // explicit held-jump apex fixture above the rim
  expect(53 - 44 - camera.position.y).toBeGreaterThanOrEqual(64);
  camera.reset();
  expect(camera.position).toEqual({ x: 0, y: 0 });
});

it('keeps the existing horizontal/default dead zone and clamps unchanged', () => {
  const camera = new Camera({ width: 426, height: 240, worldWidth: 820, worldHeight: 1080 });
  camera.update(300, 386);
  expect(camera.position).toEqual({ x: 50, y: 220 });
  camera.update(300, 100);
  expect(camera.position).toEqual({ x: 50, y: 26 });
  camera.update(1000, 2000);
  expect(camera.position).toEqual({ x: 394, y: 840 });
  camera.update(-100, -100);
  expect(camera.position).toEqual({ x: 0, y: 0 });
});
