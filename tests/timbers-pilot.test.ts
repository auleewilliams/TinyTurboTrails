import { expect, it } from 'vitest';
import { createPlayer } from '../src/game/movement';
import { createRun, stepEntities } from '../src/game/interactions';
import { hasFixedSupport } from '../src/world/level';
import { TREETOP_TIMBERS } from '../src/world/levels';

const level = TREETOP_TIMBERS;
const gems = level.entities.filter(entity => entity.kind === 'gem');
const stars = level.entities.filter(entity => entity.kind === 'special');

it('places all 33 gem identities above real root or branch support', () => {
  expect(gems).toHaveLength(33);
  expect(new Set(gems.map(gem => gem.id)).size).toBe(33);
  for (const gem of gems) {
    expect(hasFixedSupport(level, { x: gem.x, y: gem.y + 18 }), gem.id).toBe(true);
    // Local contact fixture. Whole-route input, including both forks, is in timbers-route.test.ts.
    const player = createPlayer(gem.x, level, gem.y + 18);
    const run = createRun(level);
    stepEntities(run, level, player, 1 / 60, []);
    expect(run.collectedGems.has(gem.id), gem.id).toBe(true);
  }
});

it('keeps three separate, reachable side reward silhouettes with local catches', () => {
  expect(stars.map(star => [star.id, star.x, star.y])).toEqual([
    ['timbers-special-1', 115, 935],
    ['timbers-special-2', 110, 485],
    ['timbers-special-3', 110, 275],
  ]);
  for (const [index, supportY] of [960, 510, 300].entries()) {
    expect(hasFixedSupport(level, { x: stars[index].x, y: supportY })).toBe(true);
  }
  expect(level.platforms?.find(platform => platform.id === 'timber-star-3-catch')).toMatchObject({
    from: { x: 40, y: 360 }, width: 210,
  });
  expect(level.platforms?.find(platform => platform.id === 'timber-spring-catch')).toMatchObject({
    from: { x: 130, y: 540 }, width: 150,
  });
});

it('separates every star silhouette and contact from all 33 gem identities', () => {
  for (const star of stars) {
    for (const gem of gems) if (Math.abs(gem.y - star.y) <= 28) {
      expect(Math.abs(gem.x - star.x), `${star.id} and ${gem.id}`).toBeGreaterThanOrEqual(45);
    }
    // Local contact fixture for the star alone; route input is tested elsewhere.
    const player = createPlayer(star.x, level, star.y);
    const run = createRun(level);
    stepEntities(run, level, player, 1 / 60, []);
    expect(run.collectedSpecials, star.id).toContain(star.id);
    expect(run.collectedGems, star.id).toEqual(new Set());
  }
});

it('keeps the sole optional spring below Star 2 and off the ordinary main branch', () => {
  const springs = level.entities.filter(entity => entity.kind === 'spring');
  expect(springs).toMatchObject([{ id: 'timber-spring-1', x: 100, y: 600 }]);
  expect(level.platforms?.find(platform => platform.id === 'timber-approach-1')).toMatchObject({
    from: { x: 230, y: 600 }, width: 220,
  });
});
