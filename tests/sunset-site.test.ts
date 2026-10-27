import { expect, it } from 'vitest';
import { DEFAULT_MOVEMENT, createPlayer, simulatePlayer } from '../src/game/movement';
import { createRun, damagePlayer, recoverFromFall, stepEntities, type RunEvent } from '../src/game/interactions';
import { PLATFORM_MAX_SPEED, platformBodiesAt, platformBodyAt, platformCycleSeconds, platformSpeed } from '../src/game/platforms';
import { hasFixedSupport, validateLevel } from '../src/world/level';
import { LEVELS, SUNSET_SITE, levelById } from '../src/world/levels';
import { MAIN_ROUTE, sunsetPilot } from './sunset-pilot';

it('registers a playable Sunset Site alongside the other five routes', () => {
  expect(levelById('sunset')).toBe(SUNSET_SITE);
  expect(LEVELS.map(({ id }) => id)).toEqual(['plains', 'quarry', 'timbers', 'sunset', 'frost', 'cove']);
  expect(() => validateLevel(SUNSET_SITE)).not.toThrow();
  expect(SUNSET_SITE.name).toBe('SUNSET SITE');
  expect(SUNSET_SITE.atlas).toBe('site');
  expect(SUNSET_SITE.theme.material).toBe('gravel');
});

it('paints a warm low sun with a readable gold girder edge', () => {
  const { sky, edge, sun, parallax } = SUNSET_SITE.theme;
  const [r, g, b] = [1, 3, 5].map(offset => parseInt(sky.slice(offset, offset + 2), 16));
  expect(r).toBeGreaterThan(g); expect(g).toBeGreaterThan(b);
  expect(parseInt(edge.slice(3, 5), 16)).toBeGreaterThan(parseInt(edge.slice(5, 7), 16));
  expect(sun!.y - sun!.radius * 1.7).toBeGreaterThan(30);
  expect(parallax.every(item => item.asset === 'hills')).toBe(true);
});

it('replaces repeated spring pits with permanent scaffolds, a calm yard and a taller roof', () => {
  expect(SUNSET_SITE.width).toBe(2400);
  expect(SUNSET_SITE.entities.filter(entity => ['spring', 'slime', 'crumbling-ledge'].includes(entity.kind))).toEqual([]);
  expect(SUNSET_SITE.checkpoints).toHaveLength(4);
  expect(SUNSET_SITE.entities.filter(entity => entity.kind === 'checkpoint')).toEqual(
    SUNSET_SITE.checkpoints.map(point => ({ ...point, kind: 'checkpoint', asset: 'checkpoint', layer: 'world' })));
  for (const entity of SUNSET_SITE.entities.filter(entity => entity.kind === 'decoration' || entity.kind === 'checkpoint')) {
    expect(hasFixedSupport(SUNSET_SITE, entity), entity.id).toBe(true);
  }
});

it.each(SUNSET_SITE.checkpoints)('recovers at $id with a fully supported still body and retains earned rewards', point => {
  // Prepositioned checkpoint mechanism fixture; full journeys are in sunset-scaffolds.
  const run = createRun(SUNSET_SITE), player = createPlayer(point.x, SUNSET_SITE, point.y);
  const events: RunEvent[] = [];
  stepEntities(run, SUNSET_SITE, player, 0.016, events);
  expect(run.checkpointId).toBe(point.id);
  run.collectedGems.add('site-gem-001');
  const earned = new Set(run.collectedGems);
  for (const cause of ['fall', 'health']) {
    Object.assign(player, { vx: 220, vy: 500, groundVelocityX: 60, platformId: 'site-crane-ferry' });
    if (cause === 'fall') recoverFromFall(run, player, events, SUNSET_SITE);
    else { run.health = 1; run.invulnerableSeconds = 0; damagePlayer(run, player, 1, events, SUNSET_SITE); }
    expect(player).toMatchObject({ x: point.x, y: point.y - 34, vx: 0, vy: 0, groundVelocityX: 0, platformId: null, onGround: true });
    expect(hasFixedSupport(SUNSET_SITE, { x: player.x, y: player.y + 34 })).toBe(true);
    expect(run.collectedGems).toEqual(earned);
  }
  events.length = 0;
  for (let frame = 0; frame < 30; frame++) stepEntities(run, SUNSET_SITE, player, 0.016, events);
  expect(events.filter(event => event.type === 'checkpoint')).toEqual([]);
});

it('reactivates all four fixed checkpoints in reverse and forward order without reward coupling', () => {
  const route = sunsetPilot(); route.run(MAIN_ROUTE);
  expect(route.events.filter(event => event.type === 'checkpoint').map(event => event.entityId)).toEqual(SUNSET_SITE.checkpoints.map(point => point.id));
  const run = createRun(SUNSET_SITE), events: RunEvent[] = [];
  for (const point of [...SUNSET_SITE.checkpoints].reverse().concat([...SUNSET_SITE.checkpoints])) {
    const player = createPlayer(point.x, SUNSET_SITE, point.y);
    stepEntities(run, SUNSET_SITE, player, 0.016, events);
    expect(run.checkpointId).toBe(point.id);
  }
  expect(run.collectedGems.size).toBe(0);
});

const ferry = SUNSET_SITE.platforms!.find(platform => platform.id === 'site-crane-ferry')!;
it('rides one slow crane with pauses and flush fixed docks over a permanent catch', () => {
  expect(platformSpeed(ferry)).toBeLessThanOrEqual(PLATFORM_MAX_SPEED);
  expect(ferry.width).toBeGreaterThanOrEqual(96);
  expect(ferry.pause).toBeGreaterThanOrEqual(1);
  const path = Array.from({ length: 101 }, (_, i) => platformBodyAt(ferry, i / 100 * platformCycleSeconds(ferry)));
  expect(Math.min(...path.map(body => body.x))).toBe(ferry.from.x);
  expect(Math.max(...path.map(body => body.x))).toBe(ferry.to.x);
  for (const x of [ferry.from.x - 10, ferry.from.x, ferry.to.x + ferry.width, ferry.to.x + ferry.width + 10]) {
    expect(hasFixedSupport(SUNSET_SITE, { x, y: 380 })).toBe(true);
  }
  expect(hasFixedSupport(SUNSET_SITE, { x: ferry.from.x - 12, y: 320 })).toBe(true);
  expect(hasFixedSupport(SUNSET_SITE, { x: ferry.to.x + ferry.width + 12, y: 320 })).toBe(true);
});

it.each([-1, 1])('carries Henry in direction %i and catches a midspan step-off without recovery', direction => {
  // Prepositioned moving-platform mechanism fixture, not an entrance journey.
  const seconds = direction === 1 ? 1.5 : 4.1;
  const body = platformBodyAt(ferry, seconds);
  const player = createPlayer(body.x + 48, SUNSET_SITE, 320);
  player.platformId = ferry.id;
  let clock = seconds;
  const start = player.x;
  for (let frame = 0; frame < 20; frame++) {
    clock += 0.016;
    simulatePlayer(player, { horizontal: 0, jumpPressed: false, jumpHeld: false }, SUNSET_SITE, 0.016, platformBodiesAt(SUNSET_SITE.platforms, clock, 0.016));
  }
  expect((player.x - start) * direction).toBeGreaterThan(1);
  for (let frame = 0; frame < 70; frame++) {
    clock += 0.016;
    simulatePlayer(player, { horizontal: direction, jumpPressed: false, jumpHeld: false }, SUNSET_SITE, 0.016, platformBodiesAt(SUNSET_SITE.platforms, clock, 0.016));
    if (player.onGround && player.platformId !== ferry.id && frame > 5) break;
  }
  expect(player.onGround).toBe(true);
  expect(player.y + DEFAULT_MOVEMENT.height).toBeLessThanOrEqual(380);
  expect(player.platformId).not.toBe(ferry.id);
});
