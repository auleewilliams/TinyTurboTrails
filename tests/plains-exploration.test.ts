import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { AdventureScene } from '../src/game/adventure-scene';
import { createPlayer, simulatePlayer, surfaceY, type Player } from '../src/game/movement';
import { createRun, damagePlayer, recoverFromFall, stepEntities, type RunEvent, type RunState } from '../src/game/interactions';
import { PLAINS_LEVEL, type LevelData } from '../src/world/level';

const baseline: LevelData = JSON.parse(readFileSync(new URL('../docs/evidence/issue-171-plains/baseline.json', import.meta.url), 'utf8'));
const optionalIds = ['gem-027', 'gem-032', 'gem-028'];
const neutral = { horizontal: 0, jumpPressed: false, jumpHeld: false, pausePressed: false, mutePressed: false };
const audio = { unlock: async () => {}, setMuted() {}, setSuspended() {}, startMusic() {}, play() {}, stop() {}, dispose() {} };
type Live = { player: Player; run: RunState; events: RunEvent[] };

function drive(jumpX?: number, holdFrames = 24, stopX = Infinity) {
  const scene = new AdventureScene({} as HTMLImageElement, {} as never,
    { timbers: {} as never, plains: {} as never, site: {} as never, frost: {} as never, cove: {} as never }, audio, PLAINS_LEVEL);
  scene.startSelected();
  const live = scene as unknown as Live;
  const dangers = PLAINS_LEVEL.entities.filter(entity => entity.kind === 'hazard' || entity.kind === 'slime');
  const events: RunEvent[] = [];
  let held = 0, pending = jumpX, lastX = live.player.x, recoveries = 0;
  let caveLaunch = 0, caveLanding = 0;
  for (let frame = 0; frame < 60 * 100 && scene.screenState !== 'finish' && live.player.x < stopX; frame++) {
    if (live.player.x < lastX - 100) recoveries++;
    lastX = live.player.x;
    let jumpPressed = false;
    const danger = dangers.map(entity => live.run.entities.find(state => state.id === entity.id)!)
      .find(state => state.x >= live.player.x - 18 && state.x <= live.player.x + 60);
    if (danger && live.player.onGround) { jumpPressed = true; held = 24; }
    if (pending !== undefined && live.player.x >= pending) {
      caveLaunch = live.player.x;
      jumpPressed = true; held = holdFrames; pending = undefined;
    }
    scene.update(1 / 60, { ...neutral, horizontal: 1, jumpPressed, jumpHeld: held-- > 0 });
    events.push(...live.events);
    if (caveLaunch && !caveLanding && live.player.x > caveLaunch + 10 && live.player.onGround) caveLanding = live.player.x;
  }
  return { scene, live, events, recoveries, caveLaunch, caveLanding };
}

it('preserves the intro stars, reward IDs, recovery points and all unrelated world data', () => {
  expect(PLAINS_LEVEL.entities.map(entity => entity.id)).toEqual(baseline.entities.map(entity => entity.id));
  expect(PLAINS_LEVEL.entities.filter(entity => entity.kind === 'gem')).toHaveLength(45);
  expect(PLAINS_LEVEL.entities.filter(entity => entity.kind === 'special').map(entity => entity.x)).toEqual([680, 740, 820]);
  expect(PLAINS_LEVEL.entities.filter(entity => !optionalIds.includes(entity.id)))
    .toEqual(baseline.entities.filter(entity => !optionalIds.includes(entity.id)));
  expect({ ...PLAINS_LEVEL, entities: [], surfaces: [] }).toEqual({ ...baseline, entities: [], surfaces: [] });
  const outsideHill = (level: LevelData) => level.surfaces.filter(part => part.x2 <= 6820 || part.x1 >= 7400);
  expect(outsideHill(PLAINS_LEVEL)).toEqual(outsideHill(baseline));
});

it('walks the gentler two-stage hill without a jump, gap or lost ground contact', () => {
  const player = createPlayer(6930, PLAINS_LEVEL);
  const hill = PLAINS_LEVEL.surfaces.filter(part => part.x1 >= 6950 && part.x2 <= 7260);
  expect(hill.some(part => part.y1 === part.y2 && part.x2 - part.x1 >= 80)).toBe(true);
  expect(hill.every(part => Math.abs((part.y2 - part.y1) / (part.x2 - part.x1)) <= 0.18)).toBe(true);
  while (player.x < 7300) {
    simulatePlayer(player, { horizontal: 1, jumpPressed: false, jumpHeld: false }, PLAINS_LEVEL, 1 / 60);
    expect(player.onGround).toBe(true);
    expect(player.y + 34).toBeCloseTo(surfaceY(PLAINS_LEVEL, player.x));
  }
});

it('finishes the easy route without the cave hop and retains all six checkpoint activations', () => {
  const { scene, live, events, recoveries } = drive();
  expect(scene.screenState).toBe('finish');
  expect(optionalIds.filter(id => live.run.collectedGems.has(id))).toEqual([]);
  expect(events.filter(event => event.type === 'checkpoint')).toHaveLength(6);
  expect(recoveries).toBe(0);
  expect(events.filter(event => event.type === 'damage').length).toBeLessThan(3);
});

it.each([-12, 0, 12].flatMap(offset => [20, 24, 28].map(held => [offset, held])))('takes all three cave gems with %ipx launch variation and %i held frames', (offset, held) => {
  const { scene, live, events, recoveries, caveLaunch, caveLanding } = drive(6060 + offset, held);
  expect(scene.screenState).toBe('finish');
  expect(optionalIds.every(id => live.run.collectedGems.has(id))).toBe(true);
  expect(events.filter(event => event.type === 'gem' && optionalIds.includes(event.entityId))).toHaveLength(3);
  expect(caveLaunch).toBeGreaterThanOrEqual(6048);
  expect(caveLanding).toBeGreaterThan(caveLaunch);
  expect(caveLanding).toBeLessThan(6310);
  expect(recoveries).toBe(0);
});

it('keeps each cave gem individually reachable with an ordinary local jump', () => {
  for (const gem of PLAINS_LEVEL.entities.filter(entity => optionalIds.includes(entity.id))) {
    const player = createPlayer(gem.x, PLAINS_LEVEL), run = createRun(PLAINS_LEVEL);
    for (let frame = 0; frame < 90 && !run.collectedGems.has(gem.id); frame++) {
      simulatePlayer(player, { horizontal: 0, jumpPressed: frame === 0, jumpHeld: frame < 24 }, PLAINS_LEVEL, 1 / 60);
      stepEntities(run, PLAINS_LEVEL, player, 1 / 60, []);
    }
    expect(run.collectedGems.has(gem.id), gem.id).toBe(true);
  }
});

it('retains the earned cave gems through fall and health recovery at the safe checkpoint', () => {
  const { live } = drive(6060, 24, 6300);
  expect(optionalIds.every(id => live.run.collectedGems.has(id))).toBe(true);
  expect(live.run.checkpointId).toBe('checkpoint-cave');
  const gems = new Set(live.run.collectedGems), stars = new Set(live.run.collectedSpecials);
  const checkpoint = PLAINS_LEVEL.checkpoints.find(point => point.id === live.run.checkpointId)!;
  for (const cause of ['fall', 'health']) {
    if (cause === 'fall') recoverFromFall(live.run, live.player, [], PLAINS_LEVEL);
    else { live.run.health = 1; live.run.invulnerableSeconds = 0; damagePlayer(live.run, live.player, 1, [], PLAINS_LEVEL); }
    expect(live.player.x).toBe(checkpoint.x);
    expect(live.player.y + 34).toBe(surfaceY(PLAINS_LEVEL, checkpoint.x));
    expect(live.run.collectedGems).toEqual(gems);
    expect(live.run.collectedSpecials).toEqual(stars);
  }
});