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
  for (const cue of level.challengeCues ?? []) {
    if (!cue.landingWidth) continue;
    const left = cue.x - cue.landingWidth / 2;
    const right = cue.x + cue.landingWidth / 2;
    for (let x = left; x <= right; x++) expect(surfaceY(level, x)).toBeLessThan(level.height);
    for (const hazard of level.entities.filter(entity => entity.kind === 'slime' || entity.kind === 'hazard')) {
      const min = (hazard.patrol?.minX ?? hazard.x) - 18;
      const max = (hazard.patrol?.maxX ?? hazard.x) + 18;
      expect(max < left || min > right, `${cue.label}: ${hazard.id}`).toBe(true);
    }
  }
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

it.each(['Replay', 'Next trail', 'Choose trail'])('%s clears specials on the next run while preserving the finish count', action => {
  const scene = new AdventureScene({} as HTMLImageElement, {} as never, worlds, audio, LEVELS[2]);
  scene.startSelected();
  const live = scene as unknown as Live;
  for (const star of LEVELS[2].entities.filter(entity => entity.kind === 'special')) collectSpecial(live.run, star.id, []);
  live.player.x = LEVELS[2].finish.x;
  scene.update(1 / 60, neutral);
  expect(scene.screenState).toBe('finish'); expect(scene.specialTotal).toBe(3);
  expect(scene.menuTargets.map(target => target.label)).toEqual(['Replay', 'Next trail', 'Choose trail']);
  scene.activateFinish(action);
  if (action === 'Choose trail') { expect(scene.screenState).toBe('title'); scene.startSelected(); }
  expect(scene.screenState).toBe('playing'); expect(scene.specialTotal).toBe(0);
  expect(live.run.specialTotal).toBe(action === 'Next trail' ? 0 : 3);
});

// This pilot uses only ordinary directional/jump inputs from the actual start.
// It never moves Henry, changes a clock, grants rewards or disables hazards.
it.each(LEVELS.slice(0, 3))('$name reaches all three stars from the start with ordinary controls', level => {
  const scene = new AdventureScene({} as HTMLImageElement, {} as never, worlds, audio, level);
  scene.startSelected();
  const live = scene as unknown as Live;
  const dangers = level.entities.filter(entity => entity.kind === 'hazard' || entity.kind === 'slime').sort((a, b) => a.x - b.x);
  let nextDanger = 0;
  let held = 0;
  let docked = false;
  let rodeLift = false;
  for (let frame = 0; frame < 60 * 160 && scene.screenState !== 'finish'; frame++) {
    const player = live.player;
    let horizontal = 1;
    let jumpPressed = false;
    const danger = dangers[nextDanger];
    if (danger && player.x >= danger.x - 55) { jumpPressed = true; held = 24; nextDanger++; }
    if (level.id === 'quarry' && player.x > 2250 && !docked) {
      const predictedStop = player.x + Math.sign(player.vx) * player.vx ** 2 / 2400;
      horizontal = predictedStop < 2376 ? 1 : predictedStop > 2384 ? -1 : 0;
      if (Math.abs(player.x - 2380) < 12 && Math.abs(player.vx) < 15) docked = true;
    }
    if (level.id === 'quarry' && docked && !rodeLift) {
      horizontal = 0; jumpPressed = false; held = 0;
      if (player.platformId === 'quarry-lift-terraces' && player.y + 34 <= 67) rodeLift = true;
    }
    if (level.id === 'quarry' && rodeLift && player.x < 2650) { jumpPressed = false; held = 0; }
    scene.update(1 / 60, { ...neutral, horizontal, jumpPressed, jumpHeld: held-- > 0 });
  }
  expect(scene.screenState).toBe('finish');
  expect([...live.run.collectedSpecials]).toEqual(level.entities.filter(entity => entity.kind === 'special').map(entity => entity.id));
  if (level.id === 'quarry') expect(rodeLift).toBe(true);
});

it.each([
  { level: LEVELS[0], entry: 650, exit: 900 },
  { level: LEVELS[1], entry: 2380, exit: 2700 },
  ...[950, 1650, 3100].map(entry => ({ level: LEVELS[2], entry, exit: entry + 250 })),
])('$level.name failed approaches at $entry return to ordinary terrain', ({ level, entry, exit }) => {
  for (const direction of [-1, 0, 1]) {
    const scene = new AdventureScene({} as HTMLImageElement, {} as never, worlds, audio, level);
    scene.startSelected();
    const live = scene as unknown as Live;
    // Local failure-case setup; the separate full-route test proves the approach.
    live.player = createPlayer(entry, level);
    const first = level.entities.find(entity => entity.kind === 'special')!;
    collectSpecial(live.run, first.id, []);
    if (level.id === 'quarry') for (let frame = 0; frame < 360; frame++) scene.update(1 / 60, neutral);
    for (let frame = 0; frame < 45; frame++) scene.update(1 / 60, { ...neutral, horizontal: direction });
    for (let frame = 0; frame < 60 * 20 && live.player.x < exit; frame++) {
      scene.update(1 / 60, { ...neutral, horizontal: 1 });
    }
    expect(live.player.x, `${level.id} direction ${direction}`).toBeGreaterThanOrEqual(exit);
    expect(live.player.y).toBeLessThan(level.height + 80);
    expect(live.run.collectedSpecials.has(first.id)).toBe(true);
  }
});

it('keeps the optional Quarry shelf stationary above a continuous safe return', () => {
  const shelf = LEVELS[1].platforms!.find(platform => platform.id === 'quarry-star-shelf')!;
  expect(shelf.from).toEqual(shelf.to);
  expect(shelf.width).toBe(200);
  const surface = LEVELS[1].surfaces.filter(part => part.x2 >= shelf.from.x && part.x1 <= shelf.from.x + shelf.width);
  expect(surface.every(part => part.y1 < 200 && part.y2 < 200)).toBe(true);
});

it.each(LEVELS)('$name can finish with no special rewards', level => {
  const scene = new AdventureScene({} as HTMLImageElement, {} as never, worlds, audio, level);
  scene.startSelected();
  const live = scene as unknown as Live;
  live.player = createPlayer(level.finish.x, level);
  scene.update(1 / 60, neutral);
  expect(scene.screenState).toBe('finish');
  expect(scene.specialTotal).toBe(0);
  expect(scene.menuTargets.map(target => target.label)).toContain('Replay');
});

it('boards the existing lift across its full cycle without a timed jump', () => {
  for (const x of [2368, 2380, 2392]) for (const phase of [0, 1, 2, 3, 4, 5]) {
    const level = LEVELS[1];
    const scene = new AdventureScene({} as HTMLImageElement, {} as never, worlds, audio, level);
    scene.startSelected();
    const live = scene as unknown as Live;
    live.player = createPlayer(x, level);
    live.run.seconds = phase;
    for (let frame = 0; frame < 60 * 8; frame++) scene.update(1 / 60, neutral);
    // Waiting reaches the shelf height at every phase; then walk onto it.
    for (let frame = 0; frame < 480 && live.player.y + 34 > 67; frame++) scene.update(1 / 60, neutral);
    expect(live.player.y + 34).toBeLessThanOrEqual(67);
    for (let frame = 0; frame < 45; frame++) scene.update(1 / 60, { ...neutral, horizontal: 1 });
    expect(live.run.collectedSpecials.has('quarry-special-1'), `dock ${x} phase ${phase}`).toBe(true);
    expect(live.run.health).toBe(3);
  }
});
