import { expect, it } from 'vitest';
import { AdventureScene } from '../src/game/adventure-scene';
import { createPlayer, simulatePlayer, surfaceY, type Player } from '../src/game/movement';
import { createRun, damagePlayer, recoverFromFall, stepEntities, type RunEvent, type RunState } from '../src/game/interactions';
import { TREETOP_TIMBERS } from '../src/world/levels';

const neutral = { horizontal: 0, jumpPressed: false, jumpHeld: false, pausePressed: false, mutePressed: false };
const audio = { unlock: async () => {}, setMuted() {}, setSuspended() {}, startMusic() {}, play() {}, stop() {}, dispose() {} };
type Live = { player: Player; run: RunState; events: RunEvent[] };
const stars = TREETOP_TIMBERS.entities.filter(entity => entity.kind === 'special');

function drive(optional: boolean, offset = 0) {
  const scene = new AdventureScene({} as HTMLImageElement, {} as never,
    { timbers: {} as never, plains: {} as never, site: {} as never, frost: {} as never, cove: {} as never }, audio, TREETOP_TIMBERS);
  scene.startSelected();
  const live = scene as unknown as Live;
  const dangers = TREETOP_TIMBERS.entities.filter(entity => entity.kind === 'hazard' || entity.kind === 'slime').sort((a, b) => a.x - b.x);
  const events: RunEvent[] = [];
  const landings = new Set<number>();
  let nextDanger = 0, held = 0, lastX = 0, recoveries = 0;
  for (let frame = 0; frame < 60 * 160 && scene.screenState !== 'finish'; frame++) {
    if (live.player.x < lastX - 100) {
      recoveries++;
      nextDanger = Math.max(0, dangers.findIndex(danger => danger.x >= live.player.x - 30));
    }
    lastX = live.player.x;
    let horizontal = 1, jumpPressed = false;
    if (dangers[nextDanger] && live.player.x >= dangers[nextDanger].x - 50) { nextDanger++; held = 24; jumpPressed = true; }
    if (optional) for (const star of stars.slice(1)) {
      if (live.run.collectedSpecials.has(star.id) || live.player.x < star.x - 95) continue;
      const stop = live.player.x + Math.sign(live.player.vx) * live.player.vx ** 2 / 2400;
      horizontal = stop < star.x + offset - 3 ? 1 : stop > star.x + offset + 3 ? -1 : 0;
      const rising = live.player.y + 34 < surfaceY(TREETOP_TIMBERS, star.x) - 4;
      jumpPressed = rising && held <= 0; held = rising ? 2 : 0;
      break;
    }
    scene.update(1 / 60, { ...neutral, horizontal, jumpPressed, jumpHeld: held-- > 0 });
    events.push(...live.events);
    if (live.player.onGround) for (const band of TREETOP_TIMBERS.landingBands ?? []) {
      if (Math.abs(live.player.x - band.x) <= band.width / 2) landings.add(band.x);
    }
  }
  return { scene, live, events, recoveries, landings };
}

it('spreads the three rewards across introduction, middle and late sections without changing totals or checkpoints', () => {
  expect(stars[0]).toMatchObject({ id: 'timbers-special-1', x: 1030, y: 70 });
  expect(stars[1].x / TREETOP_TIMBERS.width).toBeGreaterThan(0.4);
  expect(stars[1].x / TREETOP_TIMBERS.width).toBeLessThan(0.6);
  expect(stars[2].x / TREETOP_TIMBERS.width).toBeGreaterThan(0.75);
  expect(stars[2].x / TREETOP_TIMBERS.width).toBeLessThan(0.9);
  expect(stars).toHaveLength(3);
  expect(TREETOP_TIMBERS.entities.filter(entity => entity.kind === 'gem')).toHaveLength(33);
  expect(TREETOP_TIMBERS.entities.filter(entity => entity.kind === 'spring').map(entity => entity.x)).toEqual([950, 1650, 3100, 4850, 6700, 8400, 9800]);
  expect(TREETOP_TIMBERS.checkpoints.map(point => point.x)).toEqual([500, 2200, 3800, 5500, 7300, 9000]);
  expect(TREETOP_TIMBERS.start.x).toBe(60);
  expect(TREETOP_TIMBERS.finish.x).toBe(10100);
});

it('replaces one later V with a shallower broad deck while preserving continuous easy ground', () => {
  const surfaces = TREETOP_TIMBERS.surfaces;
  for (let index = 0; index < surfaces.length; index++) {
    const current = surfaces[index], next = surfaces[index + 1];
    expect(Math.max(current.y1, current.y2)).toBeLessThan(TREETOP_TIMBERS.height);
    if (next) { expect(current.x2).toBe(next.x1); expect(current.y2).toBe(next.y1); }
  }
  const bridge = surfaces.filter(part => part.x1 >= 7500 && part.x2 <= 7860);
  expect(bridge.some(part => part.y1 === part.y2 && part.x2 - part.x1 >= 100)).toBe(true);
  for (const part of bridge) {
    expect(Math.max(part.y1, part.y2) - 160).toBeLessThan(42);
    expect(Math.abs((part.y2 - part.y1) / (part.x2 - part.x1))).toBeLessThanOrEqual(42 / 180);
  }
});

it('finishes the easy route without taking either higher optional reward', () => {
  const { scene, live, events, recoveries } = drive(false);
  expect(scene.screenState).toBe('finish');
  expect(live.run.collectedSpecials).toEqual(new Set(['timbers-special-1']));
  expect(recoveries).toBe(0);
  expect(events.filter(event => event.type === 'damage').length).toBeLessThan(3);
});

it.each([-8, 0, 8])('reaches every star with ordinary spring/braking controls and %ipx aim variation', offset => {
  const { scene, live, events, landings } = drive(true, offset);
  expect(scene.screenState).toBe('finish');
  expect(live.run.collectedSpecials).toEqual(new Set(stars.map(star => star.id)));
  expect(events.filter(event => event.type === 'special')).toHaveLength(3);
  expect(landings).toEqual(new Set(TREETOP_TIMBERS.landingBands!.map(band => band.x)));
});

it.each(stars.slice(1))('keeps $id spring-based, visible and reachable without adding a required jump', star => {
  // Local pickup fixture; the separate full-route test proves the entire approach.
  for (const springPresent of [false, true]) {
    const level = springPresent ? TREETOP_TIMBERS : { ...TREETOP_TIMBERS,
      entities: TREETOP_TIMBERS.entities.filter(entity => entity.kind !== 'spring') };
    const player = createPlayer(star.x, level), run = createRun(level);
    const events: RunEvent[] = [];
    for (let frame = 0; frame < 100 && !run.collectedSpecials.has(star.id); frame++) {
      const input = { horizontal: 0, jumpPressed: frame === (springPresent ? 1 : 0),
        jumpHeld: springPresent ? frame >= 1 : frame < 45 };
      simulatePlayer(player, input, level, 1 / 60);
      stepEntities(run, level, player, 1 / 60, events);
    }
    expect(run.collectedSpecials.has(star.id)).toBe(springPresent);
    if (springPresent) expect(events.filter(event => event.type === 'spring')).toHaveLength(1);
  }
  expect(star.y).toBeGreaterThanOrEqual(12);
});

it('retains actually earned rewards through both recovery paths at the existing safe checkpoint', () => {
  const { live } = drive(true);
  const rewards = new Set(live.run.collectedSpecials), gems = new Set(live.run.collectedGems);
  expect(rewards.size).toBe(3);
  const checkpoint = TREETOP_TIMBERS.checkpoints.find(point => point.id === live.run.checkpointId)!;
  for (const cause of ['fall', 'health']) {
    if (cause === 'fall') recoverFromFall(live.run, live.player, [], TREETOP_TIMBERS);
    else { live.run.health = 1; live.run.invulnerableSeconds = 0; damagePlayer(live.run, live.player, 1, [], TREETOP_TIMBERS); }
    expect(live.player.x).toBe(checkpoint.x);
    expect(live.player.y + 34).toBeCloseTo(surfaceY(TREETOP_TIMBERS, checkpoint.x));
    expect(live.run.collectedSpecials).toEqual(rewards);
    expect(live.run.collectedGems).toEqual(gems);
  }
});
it('keeps every regrouped gem reachable with ordinary local movement', () => {
  // Isolated approach fixtures prove individual pickup reachability, not one perfect run.
  for (const gem of TREETOP_TIMBERS.entities.filter(entity => entity.kind === 'gem')) {
    const player = createPlayer(gem.x, TREETOP_TIMBERS), run = createRun(TREETOP_TIMBERS);
    for (let frame = 0; frame < 100 && !run.collectedGems.has(gem.id); frame++) {
      simulatePlayer(player, { horizontal: 0, jumpPressed: frame === 0, jumpHeld: frame < 45 }, TREETOP_TIMBERS, 1 / 60);
      stepEntities(run, TREETOP_TIMBERS, player, 1 / 60, []);
    }
    expect(run.collectedGems.has(gem.id), gem.id).toBe(true);
  }
});