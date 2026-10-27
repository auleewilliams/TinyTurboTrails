import { expect, it } from 'vitest';
import { AdventureScene } from '../src/game/adventure-scene';
import { createPlayer, surfaceY, type Player } from '../src/game/movement';
import { activateCheckpoint, collectSpecial, createRun, damagePlayer, recoverFromFall, startNewRun, stepEntities, type RunEvent, type RunState } from '../src/game/interactions';
import { LEVELS } from '../src/world/levels';
import { validateLevel } from '../src/world/level';

const neutral = { horizontal: 0, jumpHeld: false, jumpPressed: false, pausePressed: false, mutePressed: false };
const worlds = Object.fromEntries(LEVELS.map(level => [level.atlas, {} as never]));
const audio = { unlock: async () => {}, setMuted() {}, setSuspended() {}, startMusic() {}, play() {}, stop() {}, dispose() {} };
type Live = { player: Player; run: RunState };

it('authors exactly nine stars on three trails and keeps other trails optional', () => {
  expect(LEVELS.map(level => level.entities.filter(entity => entity.kind === 'special').length)).toEqual([3, 3, 3, 0, 0, 0]);
  for (const level of LEVELS) expect(() => validateLevel(level)).not.toThrow();
  expect(() => validateLevel({ ...LEVELS[0], entities: LEVELS[0].entities.filter(entity => entity.id !== 'plains-special-1') })).toThrow('exactly three');
});

it.each(LEVELS.slice(0, 3))('$name keeps marked landing bands clear of pits and whole hazard patrols', level => {
  expect(level.landingBands?.length).toBe(level.id === 'timbers' ? 3 : 1);
  for (const band of level.landingBands ?? []) {
    const left = band.x - band.width / 2;
    const right = band.x + band.width / 2;
    for (let x = left; x <= right; x++) expect(surfaceY(level, x)).toBeLessThan(level.height);
    for (const hazard of level.entities.filter(entity => entity.kind === 'slime' || entity.kind === 'hazard')) {
      const min = (hazard.patrol?.minX ?? hazard.x) - 18;
      const max = (hazard.patrol?.maxX ?? hazard.x) + 18;
      expect(max < left || min > right, `landing at ${band.x}: ${hazard.id}`).toBe(true);
    }
  }
});

it('keeps authored landing bands as non-textual route guidance', () => {
  expect(LEVELS.map(level => level.landingBands ?? [])).toEqual([
    [{ x: 1320, width: 180 }],
    [{ x: 450, width: 100 }],
    [{ x: 330, width: 120 }, { x: 270, width: 150 }, { x: 440, width: 140 }],
    [], [], [],
  ]);
});

it.each(LEVELS.slice(0, 3))('$name collects through contact once, separately, and retains stars through both recovery paths', level => {
  const run = createRun(level);
  const player = createPlayer(level.start.x, level);
  const events: RunEvent[] = [];
  const stars = level.entities.filter(entity => entity.kind === 'special');
  for (const star of stars) {
    player.x = star.x; player.y = star.y - 34;
    stepEntities(run, level, player, 1 / 60, events);
    stepEntities(run, level, player, 1 / 60, events);
  }
  expect(run.collectedSpecials).toEqual(new Set(stars.map(star => star.id)));
  expect(events.filter(event => event.type === 'special')).toHaveLength(3);
  expect(run.collectedGems.size).toBe(0);
  const ordinaryGem = level.entities.find(entity => entity.kind === 'gem')!;
  player.x = ordinaryGem.x; player.y = ordinaryGem.y - 34;
  stepEntities(run, level, player, 1 / 60, events);
  expect(run.collectedGems).toEqual(new Set([ordinaryGem.id]));
  expect(run.collectedSpecials.size).toBe(3);
  const gems = new Set(run.collectedGems);
  activateCheckpoint(run, level.checkpoints[0].id, events);
  recoverFromFall(run, player, events, level);
  expect(player.x).toBe(level.checkpoints[0].x);
  run.health = 1; run.invulnerableSeconds = 0;
  damagePlayer(run, player, 1, events, level);
  expect(run.health).toBe(3);
  expect(run.collectedSpecials.size).toBe(3);
  expect(run.collectedGems).toEqual(gems);
  for (const star of stars) expect(collectSpecial(run, star.id, events)).toBe(false);
  expect(run.entities.filter(entity => stars.some(star => star.id === entity.id)).every(entity => !entity.active)).toBe(true);
  startNewRun(run, level);
  expect(run).toEqual(createRun(level));
});

it.each(['Replay', 'Next trail', 'Map'])('%s clears specials on the next run while preserving the finish count', action => {
  const scene = new AdventureScene({} as HTMLImageElement, {} as never, worlds, audio, LEVELS[2]);
  scene.startSelected();
  const live = scene as unknown as Live;
  for (const star of LEVELS[2].entities.filter(entity => entity.kind === 'special')) collectSpecial(live.run, star.id, []);
  live.player.x = LEVELS[2].finish.x;
  live.player.y = LEVELS[2].finish.y - 34;
  scene.update(1 / 60, neutral);
  expect(scene.screenState).toBe('finish'); expect(scene.specialTotal).toBe(3);
  expect(scene.educationOverlay.open).toBe(false);
  expect(scene.menuTargets.map(target => target.label)).toEqual(['Next trail', 'Map', 'Build your word', 'Replay']);
  scene.activateFinish(action);
  if (action === 'Map') { expect(scene.screenState).toBe('title'); scene.startSelected(); }
  expect(scene.screenState).toBe('playing'); expect(scene.specialTotal).toBe(0);
  expect(live.run.specialTotal).toBe(action === 'Next trail' ? 0 : 3);
});

// Timbers now uses a vertical fork and its input-only star pilots live in
// timbers-route.test.ts. Quarry's side branches remain in quarry-descent.test.ts.
it.each(LEVELS.slice(0, 3).filter(level => level.id === 'plains'))('$name reaches all three stars from the start with ordinary controls', level => {
  const scene = new AdventureScene({} as HTMLImageElement, {} as never, worlds, audio, level);
  scene.startSelected();
  const live = scene as unknown as Live;
  const dangers = level.entities.filter(entity => entity.kind === 'hazard' || entity.kind === 'slime').sort((a, b) => a.x - b.x);
  let nextDanger = 0;
  let held = 0;
  for (let frame = 0; frame < 60 * 160 && scene.screenState !== 'finish'; frame++) {
    const player = live.player;
    let horizontal = 1;
    let jumpPressed = false;
    const danger = dangers[nextDanger];
    if (danger && player.x >= danger.x - 55) { jumpPressed = true; held = 24; nextDanger++; }
    if (level.id === 'plains') {
      if (player.x >= 1065 && player.x < 1100 && player.onGround && !live.run.collectedSpecials.has('plains-special-1')) { jumpPressed = true; held = 24; }
      if (player.x >= 1840 && !live.run.collectedSpecials.has('plains-special-2')) {
        const stop = player.x + Math.sign(player.vx) * player.vx ** 2 / 2400;
        horizontal = stop < 1927 ? 1 : stop > 1933 ? -1 : 0;
        if (Math.abs(player.x - 1930) < 6 && player.onGround) { jumpPressed = true; held = 24; }
      }
    }
    scene.update(1 / 60, { ...neutral, horizontal, jumpPressed, jumpHeld: held-- > 0 });
  }
  expect(scene.screenState).toBe('finish');
  expect([...live.run.collectedSpecials]).toEqual(level.entities.filter(entity => entity.kind === 'special').map(entity => entity.id));
});

it.each([
  { level: LEVELS[0], entry: 1065, exit: 1430 },
  { level: LEVELS[0], entry: 1930, exit: 2180 },
  { level: LEVELS[0], entry: 2760, exit: 3100 },
])('$level.name failed approaches at $entry return to ordinary terrain', ({ level, entry, exit }) => {
  for (const direction of [-1, 0, 1]) {
    const scene = new AdventureScene({} as HTMLImageElement, {} as never, worlds, audio, level);
    scene.startSelected();
    const live = scene as unknown as Live;
    // Local failure-case setup; the separate full-route test proves the approach.
    live.player = createPlayer(entry, level);
    const first = level.entities.find(entity => entity.kind === 'special')!;
    collectSpecial(live.run, first.id, []);
    for (let frame = 0; frame < 45; frame++) scene.update(1 / 60, { ...neutral, horizontal: direction });
    for (let frame = 0; frame < 60 * 20 && live.player.x < exit; frame++) {
      scene.update(1 / 60, { ...neutral, horizontal: 1 });
    }
    expect(live.player.x, `${level.id} direction ${direction}`).toBeGreaterThanOrEqual(exit);
    expect(live.player.y).toBeLessThan(level.height + 80);
    expect(live.run.collectedSpecials.has(first.id)).toBe(true);
  }
});

it.each(LEVELS)('$name can finish with no special rewards', level => {
  const scene = new AdventureScene({} as HTMLImageElement, {} as never, worlds, audio, level);
  scene.startSelected();
  const live = scene as unknown as Live;
  live.player = createPlayer(level.finish.x, level, level.finish.y);
  scene.update(1 / 60, neutral);
  expect(scene.screenState).toBe('finish');
  expect(scene.specialTotal).toBe(0);
  expect(scene.educationOverlay.open).toBe(false);
  expect(scene.menuTargets.map(target => target.label)).toContain('Replay');
});
