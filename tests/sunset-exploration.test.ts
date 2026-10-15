import { expect, it } from 'vitest';
import { activateCheckpoint, createRun, damagePlayer, recoverFromFall, stepEntities, type RunEvent } from '../src/game/interactions';
import { createPlayer, simulatePlayer, surfaceY } from '../src/game/movement';
import { SUNSET_SITE } from '../src/world/levels';

const bonusId = 'site-bonus-005';
const gems = SUNSET_SITE.entities.filter(entity => entity.kind === 'gem');

function workbenchHop(launchX: number, jump: boolean) {
  const player = createPlayer(launchX, SUNSET_SITE), run = createRun(SUNSET_SITE);
  const events: RunEvent[] = [];
  activateCheckpoint(run, 'site-checkpoint-scaffold', events);
  player.vx = 220;
  let landingX: number | undefined;
  for (let frame = 0; frame < 90; frame++) {
    const previous = { x: player.x, y: player.y };
    simulatePlayer(player, { horizontal: player.x < 7150 ? 1 : 0,
      jumpPressed: jump && frame === 0, jumpHeld: jump && frame < 40 }, SUNSET_SITE, 1 / 60);
    stepEntities(run, SUNSET_SITE, player, 1 / 60, events, previous);
    if (jump && frame > 5 && player.onGround && landingX === undefined) landingX = player.x;
  }
  return { player, run, events, landingX };
}

it('keeps all 62 gem identities, zero stars, seven checkpoints and construction obstacles', () => {
  expect(gems.map(gem => gem.id)).toEqual([
    ...Array.from({ length: 56 }, (_, index) => `site-gem-${String(index + 1).padStart(3, '0')}`),
    ...Array.from({ length: 6 }, (_, index) => `site-bonus-${String(index + 1).padStart(3, '0')}`),
  ]);
  expect(SUNSET_SITE.entities.filter(entity => entity.kind === 'special')).toHaveLength(0);
  expect(SUNSET_SITE.checkpoints.map(point => [point.x, point.y])).toEqual([
    [560, 168], [1650, 198], [3400, 198], [4900, 198], [6850, 170], [8500, 198], [9000, 174],
  ]);
  expect(SUNSET_SITE.entities.filter(entity => entity.kind === 'hazard').map(entity => [entity.x, entity.y])).toEqual([
    [2400, 126], [2470, 126], [4380, 198], [4440, 198], [5760, 222], [6550, 170], [7320, 126], [7390, 126],
  ]);
  expect(SUNSET_SITE.entities.filter(entity => entity.kind === 'spring').map(entity => [entity.x, entity.y])).toEqual([
    [1060, 198], [5220, 198], [5460, 210], [9280, 198], [9520, 210],
  ]);
  expect(SUNSET_SITE.surfaces.filter(part => part.y1 === 380 && part.y2 === 380).map(part => [part.x1, part.x2])).toEqual([
    [5252, 5320], [5492, 5560], [9312, 9380], [9552, 9620],
  ]);
  expect(SUNSET_SITE.platforms).toEqual([
    { id: 'site-crane-ferry', from: { x: 4330, y: 156 }, to: { x: 4462, y: 156 }, width: 48, seconds: 2.2, pause: 0.8 },
  ]);
});

it('lets Henry walk the whole gradual scaffold approach without jumping or taking its bonus', () => {
  const { player, run, events } = workbenchHop(6880, false);
  expect(player.x).toBeGreaterThan(7150);
  expect(player.onGround).toBe(true);
  expect(run.collectedGems.has(bonusId)).toBe(false);
  expect(events.some(event => event.type === 'damage' || event.type === 'recover')).toBe(false);
  const ramp = SUNSET_SITE.surfaces.find(part => part.x1 === 6900)!;
  expect(ramp).toEqual({ x1: 6900, x2: 7200, y1: 170, y2: 126 });
  expect(Math.abs((ramp.y2 - ramp.y1) / (ramp.x2 - ramp.x1))).toBeLessThan(20 / 100);
});

it.each([6938, 6950, 6962])('earns the optional workbench gem with a held jump from x%i and lands before the hazard deck', launchX => {
  const { run, events, landingX, player } = workbenchHop(launchX, true);
  expect(run.collectedGems.has(bonusId)).toBe(true);
  expect(landingX).toBeGreaterThan(7000);
  expect(landingX).toBeLessThan(7150);
  expect(player.x).toBeLessThan(7200);
  expect(player.onGround).toBe(true);
  expect(events.some(event => event.type === 'damage' || event.type === 'recover' || event.type === 'spring')).toBe(false);
});

it('retains actually earned workbench gems after fall and depleted-health recovery at the existing scaffold checkpoint', () => {
  const { player, run } = workbenchHop(6950, true);
  expect(run.collectedGems.has(bonusId)).toBe(true);
  const earned = new Set(run.collectedGems);
  for (const cause of ['fall', 'health']) {
    if (cause === 'fall') recoverFromFall(run, player, [], SUNSET_SITE);
    else { run.health = 1; run.invulnerableSeconds = 0; damagePlayer(run, player, 1, [], SUNSET_SITE); }
    expect(player.x).toBe(6850);
    expect(player.y + 34).toBe(surfaceY(SUNSET_SITE, 6850));
    expect(run.collectedGems).toEqual(earned);
  }
});

it('keeps the quiet yard cluster reachable on foot between the unchanged patrols', () => {
  const player = createPlayer(3660, SUNSET_SITE), run = createRun(SUNSET_SITE);
  const events: RunEvent[] = [];
  for (let frame = 0; frame < 120; frame++) {
    simulatePlayer(player, { horizontal: player.x < 3810 ? 1 : 0, jumpPressed: false, jumpHeld: false }, SUNSET_SITE, 1 / 60);
    stepEntities(run, SUNSET_SITE, player, 1 / 60, events);
  }
  for (const id of ['site-gem-021', 'site-gem-022', 'site-gem-023']) expect(run.collectedGems.has(id), id).toBe(true);
  expect(events.some(event => event.type === 'damage' || event.type === 'recover')).toBe(false);
  const cluster = gems.filter(gem => gem.x >= 3690 && gem.x <= 3810);
  expect(cluster).toHaveLength(3);
  for (const slime of SUNSET_SITE.entities.filter(entity => entity.kind === 'slime')) {
    for (const gem of cluster) expect(gem.x < slime.patrol!.minX - 18 || gem.x > slime.patrol!.maxX + 18).toBe(true);
  }
});
