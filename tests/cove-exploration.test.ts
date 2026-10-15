import { expect, it } from 'vitest';
import { AdventureScene } from '../src/game/adventure-scene';
import { createPlayer, simulatePlayer, surfaceAt, surfaceY, type Player } from '../src/game/movement';
import { createRun, damagePlayer, recoverFromFall, stepEntities, tickRun, type RunEvent, type RunState } from '../src/game/interactions';
import { SANDY_COVE } from '../src/world/sandy-cove';
import { validateLevel } from '../src/world/level';

const neutral = { horizontal: 0, jumpPressed: false, jumpHeld: false, pausePressed: false, mutePressed: false };
const audio = { unlock: async () => {}, setMuted() {}, setSuspended() {}, startMusic() {}, play() {}, stop() {}, dispose() {} };
const lowFinds = SANDY_COVE.entities.filter(entity => ['cove-bonus-2', 'cove-bonus-4'].includes(entity.id));
type Live = { player: Player; run: RunState; events: RunEvent[] };

function drive(optional: boolean, holdSpringArcs = false) {
  const scene = new AdventureScene({} as HTMLImageElement, {} as never,
    { timbers: {} as never, plains: {} as never, quarry: {} as never, site: {} as never, frost: {} as never, cove: {} as never }, audio, SANDY_COVE);
  scene.startSelected();
  const live = scene as unknown as Live;
  let held = 0;
  const events: RunEvent[] = [];
  const triggered = new Set<string>();
  for (let frame = 0; frame < 60 * 100 && scene.screenState !== 'finish'; frame++) {
    let jumpPressed = false;
    if (optional) for (const gem of lowFinds) {
      if (!triggered.has(gem.id) && live.player.x >= gem.x - 55) {
        triggered.add(gem.id); jumpPressed = true; held = 12;
      }
    }
    scene.update(1 / 60, { ...neutral, horizontal: 1, jumpPressed, jumpHeld: held-- > 0 || (holdSpringArcs && live.player.vy < 0) });
    events.push(...live.events);
    expect(live.player.y).toBeLessThan(SANDY_COVE.height);
    expect(live.run.health).toBe(3);
  }
  return { scene, live, events };
}

it('preserves Cove totals, every collectible ID, safe checkpoints and original springs/slimes', () => {
  expect(() => validateLevel(SANDY_COVE)).not.toThrow();
  const gems = SANDY_COVE.entities.filter(entity => entity.kind === 'gem');
  expect(gems.map(gem => gem.id).sort()).toEqual([
    ...Array.from({ length: 36 }, (_, index) => `cove-gem-${index + 1}`),
    ...Array.from({ length: 6 }, (_, index) => `cove-bonus-${index + 1}`),
  ].sort());
  expect(gems).toHaveLength(42);
  expect(lowFinds.map(gem => [gem.id, gem.x, gem.y])).toEqual([['cove-bonus-2', 3080, 130], ['cove-bonus-4', 6560, 129]]);
  for (const gem of lowFinds) expect(surfaceAt(SANDY_COVE, gem.x).material).toBeUndefined();
  expect(SANDY_COVE.entities.filter(entity => entity.kind === 'special' || entity.kind === 'hazard')).toHaveLength(0);
  expect(SANDY_COVE.entities.filter(entity => entity.kind === 'spring').map(entity => [entity.id, entity.x]))
    .toEqual([1490, 3190, 4890, 6640, 8450, 10100].map((x, index) => [`cove-spring-${index + 1}`, x]));
  expect(SANDY_COVE.entities.filter(entity => entity.kind === 'slime').map(entity => [entity.id, entity.x]))
    .toEqual([1550, 4950, 8510].map((x, index) => [`cove-slime-${index + 1}`, x]));
  expect(SANDY_COVE.checkpoints).toEqual([120, 1990, 3700, 5500, 7300, 9150]
    .map((x, index) => ({ id: `cove-checkpoint-${index + 1}`, x, y: surfaceY(SANDY_COVE, x) })));
  expect(SANDY_COVE.start).toEqual({ x: 60, y: 198 });
  expect(SANDY_COVE.finish.x).toBe(10500);
});

it('shortens only the third harmless pool and preserves dry, continuous gentle terrain', () => {
  expect(SANDY_COVE.surfaces.filter(surface => surface.material === 'water').map(surface => [surface.x1, surface.x2, surface.speedMultiplier]))
    .toEqual([[900, 1200, 0.65], [2700, 3000, 0.65], [4350, 4570, 0.65], [6200, 6500, 0.65], [8020, 8250, 0.65], [9750, 9970, 0.65]]);
  expect(SANDY_COVE.surfaces.filter(surface => surface.material === 'sand').map(surface => [surface.x1, surface.x2, surface.speedMultiplier]))
    .toEqual([[300, 600, 0.8], [2200, 2450, 0.8], [3900, 4100, 0.8], [5700, 6000, 0.8], [7500, 7850, 0.8], [9350, 9600, 0.8]]);
  const surfaces = SANDY_COVE.surfaces;
  for (let index = 0; index < surfaces.length; index++) {
    const part = surfaces[index], next = surfaces[index + 1];
    if (next) { expect(part.x2).toBe(next.x1); expect(part.y2).toBe(next.y1); }
    expect(Math.max(part.y1, part.y2)).toBeLessThan(240);
    expect(Math.abs((part.y2 - part.y1) / (part.x2 - part.x1))).toBeLessThanOrEqual(0.11);
  }
  expect(surfaceAt(SANDY_COVE, 4600)).toMatchObject({ y1: 202, y2: 202 });
  expect(surfaceAt(SANDY_COVE, 4600).material).toBeUndefined();
});

it('finishes the easy route without pressing jump, damage, recovery or optional rewards', () => {
  const { scene, live, events } = drive(false);
  expect(scene.screenState).toBe('finish');
  expect(events.filter(event => event.type === 'damage' || event.type === 'recover')).toHaveLength(0);
  expect(events.filter(event => event.type === 'spring')).toHaveLength(6);
  expect(events.filter(event => event.type === 'checkpoint')).toHaveLength(6);
  expect([...live.run.collectedGems].some(id => id.includes('-bonus-'))).toBe(false);
});

it('collects both low optional finds with two ordinary running hops on a complete route', () => {
  const { scene, live } = drive(true);
  expect(scene.screenState).toBe('finish');
  expect(lowFinds.every(gem => live.run.collectedGems.has(gem.id))).toBe(true);
});

it('earns all six bonuses together through held spring arcs and two ordinary hops on one complete route', () => {
  const { scene, live, events } = drive(true, true);
  expect(scene.screenState).toBe('finish');
  expect([...live.run.collectedGems].filter(id => id.includes('-bonus-')).sort())
    .toEqual(Array.from({ length: 6 }, (_, index) => `cove-bonus-${index + 1}`));
  expect(events.filter(event => event.type === 'damage' || event.type === 'recover')).toHaveLength(0);
});

it.each(lowFinds)('allows forgiving ordinary-hop approaches and safe dry returns at $id', gem => {
  for (const onset of [-55, -40]) for (const heldFrames of [6, 12, 24]) {
    const player = createPlayer(gem.x + onset, SANDY_COVE), run = createRun(SANDY_COVE);
    player.vx = 220;
    const events: RunEvent[] = [];
    let landed = false;
    for (let frame = 0; frame < 90; frame++) {
      const previous = { x: player.x, y: player.y };
      tickRun(run, 1 / 60);
      simulatePlayer(player, { horizontal: player.x < gem.x + 4 ? 1 : 0,
        jumpPressed: frame === 0, jumpHeld: frame < heldFrames }, SANDY_COVE, 1 / 60);
      stepEntities(run, SANDY_COVE, player, 1 / 60, events, previous);
      if (frame > 1 && player.onGround) { landed = true; break; }
    }
    expect(run.collectedGems.has(gem.id), `${gem.id}, onset ${onset}, held ${heldFrames}`).toBe(true);
    expect(landed).toBe(true);
    expect(surfaceAt(SANDY_COVE, player.x).material).toBeUndefined();
    expect(player.x).toBeGreaterThan(gem.x === 3080 ? 3000 : 6500);
    expect(player.x).toBeLessThan(gem.x === 3080 ? 3172 : 6622);
    expect(events.filter(event => ['spring', 'damage', 'recover'].includes(event.type))).toHaveLength(0);
    expect(run.health).toBe(3);
  }
});

it('keeps all 42 gems individually reachable using walking, ordinary hops or existing spring arcs', () => {
  for (const gem of SANDY_COVE.entities.filter(entity => entity.kind === 'gem')) {
    const bonus = gem.id.includes('-bonus-'), low = lowFinds.some(find => find.id === gem.id);
    const player = createPlayer(bonus && !low ? gem.x - 65 : gem.x, SANDY_COVE), run = createRun(SANDY_COVE);
    for (let frame = 0; frame < 100 && !run.collectedGems.has(gem.id); frame++) {
      tickRun(run, 1 / 60);
      simulatePlayer(player, { horizontal: bonus && !low ? 1 : 0,
        jumpPressed: low && frame === 0, jumpHeld: bonus && (!low || frame < 12) }, SANDY_COVE, 1 / 60);
      stepEntities(run, SANDY_COVE, player, 1 / 60, []);
    }
    expect(run.collectedGems.has(gem.id), gem.id).toBe(true);
  }
});

it('retains gems earned through actual route movement after fall and depleted-health recovery', () => {
  const { live } = drive(true);
  const earned = new Set(live.run.collectedGems);
  expect(lowFinds.every(gem => earned.has(gem.id))).toBe(true);
  const checkpoint = SANDY_COVE.checkpoints.find(point => point.id === live.run.checkpointId)!;
  for (const cause of ['fall', 'health']) {
    if (cause === 'fall') recoverFromFall(live.run, live.player, [], SANDY_COVE);
    else { live.run.health = 1; live.run.invulnerableSeconds = 0; damagePlayer(live.run, live.player, 1, [], SANDY_COVE); }
    expect(live.player.x).toBe(checkpoint.x);
    expect(live.player.y + 34).toBeCloseTo(checkpoint.y);
    expect(live.run.collectedGems).toEqual(earned);
    expect(surfaceAt(SANDY_COVE, live.player.x).material).toBeUndefined();
  }
});
