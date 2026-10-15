import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { AdventureScene } from '../src/game/adventure-scene';
import { createPlayer, simulatePlayer, surfaceAt, surfaceY, type Player } from '../src/game/movement';
import { createRun, damagePlayer, recoverFromFall, stepEntities, tickRun, type RunEvent, type RunState } from '../src/game/interactions';
import { FROST_RIDGE } from '../src/world/frost-ridge';
import type { LevelData } from '../src/world/level';

const before = JSON.parse(readFileSync('docs/evidence/issue-171-frost/before.json', 'utf8')) as LevelData;
const neutral = { horizontal: 0, jumpPressed: false, jumpHeld: false, pausePressed: false, mutePressed: false };
const bonus = FROST_RIDGE.entities.find(entity => entity.id === 'frost-bonus-2')!;

function snowHop(onset: number, jump = true) {
  // Bounded real movement fixture: no teleports, spring launch or entity relocation.
  const player = createPlayer(5055, FROST_RIDGE), run = createRun(FROST_RIDGE);
  const events: RunEvent[] = [];
  let launched = false, held = 0, landingX: number | undefined;
  for (let frame = 0; frame < 180; frame++) {
    const jumpPressed = jump && !launched && player.x >= onset && player.onGround;
    if (jumpPressed) { launched = true; held = 36; }
    const stop = player.x + Math.sign(player.vx) * player.vx ** 2 / 2400;
    const horizontal = stop < 5245 ? 1 : 0;
    tickRun(run, 1 / 60);
    const previous = { x: player.x, y: player.y };
    simulatePlayer(player, { horizontal, jumpPressed, jumpHeld: held-- > 0 }, FROST_RIDGE, 1 / 60);
    stepEntities(run, FROST_RIDGE, player, 1 / 60, events, previous);
    if (launched && player.onGround && landingX === undefined) landingX = player.x;
  }
  return { player, run, events, landingX };
}

it('preserves every ice patch, snow runout, checkpoint, danger, spring and collectible identity', () => {
  expect(FROST_RIDGE.surfaces).toEqual(before.surfaces);
  expect(FROST_RIDGE.checkpoints).toEqual(before.checkpoints);
  expect(FROST_RIDGE.start).toEqual(before.start);
  expect(FROST_RIDGE.finish).toEqual(before.finish);
  expect(FROST_RIDGE.entities.filter(entity => entity.kind !== 'gem')).toEqual(before.entities.filter(entity => entity.kind !== 'gem'));
  expect(FROST_RIDGE.entities.map(entity => entity.id)).toEqual(before.entities.map(entity => entity.id));
  const moved = new Set(['frost-gem-17', 'frost-gem-18', 'frost-bonus-2']);
  expect(FROST_RIDGE.entities.filter(entity => !moved.has(entity.id))).toEqual(before.entities.filter(entity => !moved.has(entity.id)));
  expect(FROST_RIDGE.entities.filter(entity => entity.kind === 'gem')).toHaveLength(39);
  expect(FROST_RIDGE.entities.filter(entity => entity.kind === 'special')).toHaveLength(0);
  expect(bonus.x).toBe(5160);
  expect(surfaceY(FROST_RIDGE, bonus.x) - bonus.y).toBe(60);
  expect(FROST_RIDGE.entities.find(entity => entity.id === 'frost-bonus-1')).toEqual(before.entities.find(entity => entity.id === 'frost-bonus-1'));
  expect(FROST_RIDGE.entities.find(entity => entity.id === 'frost-bonus-3')).toEqual(before.entities.find(entity => entity.id === 'frost-bonus-3'));
});

it.each([5060, 5080, 5095, 5110, 5120])('reaches the optional snow gem after a jump at x%i and lands clear of the patrol', onset => {
  const { player, run, events, landingX } = snowHop(onset);
  expect(run.collectedGems.has(bonus.id)).toBe(true);
  expect(landingX).toBeGreaterThan(5160);
  expect(landingX).toBeLessThan(5300);
  expect(player.x).toBeGreaterThan(5220);
  expect(player.x).toBeLessThan(5290);
  expect(player.onGround).toBe(true);
  expect(surfaceAt(FROST_RIDGE, player.x).material).toBeUndefined();
  expect(run.health).toBe(3);
  expect(events.some(event => event.type === 'damage' || event.type === 'recover' || event.type === 'spring')).toBe(false);
});

it('keeps the snow-climb reward optional and leaves the approach and return gems on walkable snow', () => {
  const { run } = snowHop(5090, false);
  expect(run.collectedGems.has(bonus.id)).toBe(false);
  for (const id of ['frost-gem-17', 'frost-gem-18']) {
    const gem = FROST_RIDGE.entities.find(entity => entity.id === id)!;
    const player = createPlayer(gem.x, FROST_RIDGE), localRun = createRun(FROST_RIDGE);
    simulatePlayer(player, neutral, FROST_RIDGE, 1 / 60);
    stepEntities(localRun, FROST_RIDGE, player, 1 / 60, []);
    expect(localRun.collectedGems.has(id)).toBe(true);
    expect(surfaceAt(FROST_RIDGE, gem.x).material).toBeUndefined();
    expect(gem.x).toBeGreaterThan(5050);
  }
});

it('retains the actually earned snow-climb gem through fall and health recovery on existing snow', () => {
  const { player, run } = snowHop(5095);
  expect(run.collectedGems.has(bonus.id)).toBe(true);
  // Walk back to the existing checkpoint with ordinary motion to activate it.
  for (let frame = 0; frame < 550 && run.checkpointId !== 'frost-checkpoint-3'; frame++) {
    const previous = { x: player.x, y: player.y };
    tickRun(run, 1 / 60);
    simulatePlayer(player, { ...neutral, horizontal: -1, jumpHeld: true }, FROST_RIDGE, 1 / 60);
    stepEntities(run, FROST_RIDGE, player, 1 / 60, [], previous);
  }
  expect(run.checkpointId).toBe('frost-checkpoint-3');
  const earned = new Set(run.collectedGems);
  for (const cause of ['fall', 'health']) {
    if (cause === 'fall') recoverFromFall(run, player, [], FROST_RIDGE);
    else { run.health = 1; run.invulnerableSeconds = 0; damagePlayer(run, player, 1, [], FROST_RIDGE); }
    expect(run.collectedGems).toEqual(earned);
    expect(player.x).toBe(3800);
    expect(player.y + 34).toBe(surfaceY(FROST_RIDGE, 3800));
    expect(surfaceAt(FROST_RIDGE, player.x).material).toBeUndefined();
  }
});

it('finishes with the straightforward route and no bonus hop required', () => {
  const audio = { unlock: async () => {}, setMuted() {}, setSuspended() {}, startMusic() {}, play() {}, stop() {}, dispose() {} };
  const scene = new AdventureScene({} as HTMLImageElement, {} as never,
    { frost: {} as never, plains: {} as never, timbers: {} as never, site: {} as never, cove: {} as never }, audio, FROST_RIDGE);
  scene.startSelected();
  const live = scene as unknown as { player: Player; run: RunState };
  for (let frame = 0; frame < 60 * 180 && scene.screenState !== 'finish'; frame++) {
    scene.update(1 / 60, { ...neutral, horizontal: 1 });
  }
  expect(scene.screenState).toBe('finish');
  expect(live.run.collectedGems.has(bonus.id)).toBe(false);
});
