import { expect, it } from 'vitest';
import { SUNSET_SITE } from '../src/world/levels';
import { hasFixedSupport, validateLevel } from '../src/world/level';
import { TRAIL_WORDS } from '../src/game/education';
import { trailPosition } from '../src/game/hud';

it('connects two scaffold climbs across a descent and yard with four permanent checkpoints', () => {
  expect(SUNSET_SITE.width).toBeLessThanOrEqual(3200);
  expect(SUNSET_SITE.checkpoints).toHaveLength(4);
  expect(SUNSET_SITE.checkpointActivation).toBe('grounded');
  expect(SUNSET_SITE.finish.supportOnly).toBe(true);
  expect(SUNSET_SITE.finish.y).toBeLessThan(SUNSET_SITE.checkpoints[0].y);
  expect(SUNSET_SITE.checkpoints[2].y).toBeGreaterThan(SUNSET_SITE.checkpoints[1].y);
  for (const point of [SUNSET_SITE.start, SUNSET_SITE.finish, SUNSET_SITE.retrace!, ...SUNSET_SITE.checkpoints]) {
    expect(point && hasFixedSupport(SUNSET_SITE, point), JSON.stringify(point)).toBe(true);
  }
  expect(() => validateLevel(SUNSET_SITE)).not.toThrow();
});

it('preserves BEAM identities on their authored fixed shelves and horizontal mixed-route progress', () => {
  const pickups = TRAIL_WORDS.find(word => word.id === 'sunset')!.pickups;
  expect(pickups.map(pickup => pickup.id)).toEqual(['sunset-letter-b', 'sunset-letter-e', 'sunset-letter-a', 'sunset-letter-m']);
  for (const pickup of pickups) expect(hasFixedSupport(SUNSET_SITE, { x: pickup.x, y: pickup.supportY! })).toBe(true);
  expect(SUNSET_SITE.progressAxis).toBeUndefined();
  expect(trailPosition(SUNSET_SITE, 1500, 620)).toBeGreaterThan(trailPosition(SUNSET_SITE, 500, 320));
  expect(trailPosition(SUNSET_SITE, 500, 620)).toBe(trailPosition(SUNSET_SITE, 500, 320));
});

import { ALL_RETURN, MAIN_ROUTE, REASCENT, sunsetPilot } from './sunset-pilot';

it.each([[[0.016]], [[0.032]], [[0.016, 0.032, 0.024]]])('finishes with zero letters and no crane, then physically retraces all BEAM and returns at %j seconds', cadence => {
  const route = sunsetPilot(Array.isArray(cadence) ? cadence : [cadence]);
  route.run(MAIN_ROUTE);
  expect(route.scene.screenState).toBe('finish');
  expect(route.scene.education.letterCount).toBe(0);
  let previous = -1;
  for (const id of ['site-high-deck', 'site-crane-catch', 'site-descent-1', 'site-descent-e', 'site-descent-3', 'site-yard', 'site-rest', 'site-roof']) {
    const index = route.supportOrder.indexOf(id);
    expect(index, id).toBeGreaterThan(previous); previous = index;
  }
  const earned = new Set(route.runState.collectedGems);
  expect(route.supports.has('site-crane-ferry')).toBe(false);
  route.scene.activateFinish('Build your word');
  route.scene.menuTargets.find(target => target.label === 'Find more letters')!.action();
  expect(route.scene.playerX).toBe(SUNSET_SITE.retrace!.x);
  expect(route.player.vx).toBe(0);
  for (let i = 0; i < 15; i++) route.tick();
  expect(route.scene.screenState).toBe('playing');
  route.run(ALL_RETURN);
  expect(route.scene.education.letterCount).toBe(4);
  route.run(REASCENT);
  expect(route.scene.screenState).toBe('finish');
  expect(route.scene.session.results.has('sunset')).toBe(true);
  for (const id of earned) expect(route.runState.collectedGems.has(id)).toBe(true);
  const checkpoints = SUNSET_SITE.checkpoints.map(point => point.id);
  expect(route.events.filter(event => event.type === 'checkpoint').map(event => event.entityId)).toEqual(
    [0, 1, 2, 3, 2, 1, 0, 1, 2, 3].map(index => checkpoints[index]));
  expect(route.events.filter(event => ['damage', 'recover', 'spring'].includes(event.type))).toEqual([]);
});

// Every jump follows a stop or a landing, including the two panel joins.
it.each([0.128, 0.2, 0.28])('keeps standing-start jumps comfortable with a %s second hold', held => {
  const route = sunsetPilot([0.016], held); route.run(MAIN_ROUTE);
  expect(route.scene.screenState).toBe('finish');
  expect(route.scene.education.letterCount).toBe(0);
});

it('keeps a supported finish fixture independent of every reward and rejects finish X below the roof', () => {
  const route = sunsetPilot();
  Object.assign(route.player, { x: SUNSET_SITE.finish.x, y: 620 - 34 });
  route.tick(); expect(route.scene.screenState).toBe('playing');
  expect(route.runState.collectedGems.size).toBe(0);
  Object.assign(route.player, { x: SUNSET_SITE.finish.x, y: 140 - 34, vx: 0, vy: 0, onGround: true });
  route.tick(); expect(route.scene.screenState).toBe('finish');
  expect(route.scene.education.letterCount).toBe(0);
  expect(route.runState.collectedGems.size).toBe(0);
});

import { Camera } from '../src/world/camera';

it.each(TRAIL_WORDS.find(word => word.id === 'sunset')!.pickups)('$id ignores the same X on another shelf and collects only at its drawn support height', pickup => {
  // Prepositioned contact fixture, separate from full input journeys above.
  const route = sunsetPilot();
  for (const offset of [-60, 60]) {
    Object.assign(route.player, { x: pickup.x, y: pickup.supportY! + offset - 34, vx: 0, vy: 0, onGround: true, platformId: null });
    route.tick(); expect(route.scene.education.letterCount).toBe(0);
  }
  Object.assign(route.player, { x: pickup.x, y: pickup.supportY! - 34, vx: 0, vy: 0, onGround: true, platformId: null });
  route.tick(); expect(route.scene.education.hasLetter(pickup.id)).toBe(true);
  expect(route.scene.educationDescription).toContain(`${pickup.letter} → bag`);
});

it('frames fixed downward targets and both dock approaches in the native camera', () => {
  const camera = new Camera({ width: 426, height: 240, worldWidth: SUNSET_SITE.width, worldHeight: SUNSET_SITE.height,
    vertical: SUNSET_SITE.verticalCamera, lead: SUNSET_SITE.cameraLead });
  for (const [x, top, below] of [[350, 320, 380], [1760, 380, 440], [1860, 440, 500], [2100, 500, 560],
    [2200, 560, 620], [2820, 140, 200], [2670, 200, 260], [2550, 260, 320], [2590, 320, 380], [2720, 380, 440]] as const) {
    camera.update(x, top - 34);
    expect(below - camera.position.y).toBeGreaterThan(30);
    expect(below - camera.position.y).toBeLessThan(240);
  }
  camera.reset(); camera.update(440, 286);
  expect(470 - camera.position.x).toBeGreaterThan(0);
  expect(650 - camera.position.x).toBeLessThan(400);
  camera.update(740, 286);
  expect(740 - camera.position.x).toBeGreaterThan(30);
  expect(740 - camera.position.x).toBeLessThan(400);
});
