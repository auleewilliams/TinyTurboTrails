import { expect, it } from 'vitest';
import { DEFAULT_MOVEMENT, createPlayer, simulatePlayer, surfaceY } from '../src/game/movement';
import { activateCheckpoint, createRun, recoverFromFall, type RunEvent } from '../src/game/interactions';
import type { GameAudio } from '../src/core/audio';
import { AdventureScene } from '../src/game/adventure-scene';
import { PLATFORM_MAX_SPEED, platformBodyAt, platformCycleSeconds, platformSpeed } from '../src/game/platforms';
import { validateLevel, type WorldEntity } from '../src/world/level';
import { LEVELS, QUARRY_RUN, levelById } from '../src/world/levels';

const ACTIVATION_WINDOW = 28;
const worlds = { plains: {} as never, timbers: {} as never };
const FALL_Y = QUARRY_RUN.height + 80;
// Gem art reaches this far above its anchor; the HUD covers the top 30 px of the screen.
const GEM_ART_HEIGHT = 44;
const HUD_BOTTOM = 30;
const SECTION_CHECKPOINTS = [
  'quarry-checkpoint-entrance', 'quarry-checkpoint-terraces', 'quarry-checkpoint-pit',
  'quarry-checkpoint-tunnels', 'quarry-checkpoint-crusher', 'quarry-checkpoint-summit',
];
const spans = (ids: readonly string[]) => {
  const checkpoints = QUARRY_RUN.checkpoints.filter(({ id }) => ids.includes(id));
  return checkpoints.map((checkpoint, index) => ({
    checkpoint,
    from: checkpoint.x,
    to: checkpoints[index + 1]?.x ?? QUARRY_RUN.finish.x,
  }));
};
const bySection = spans(SECTION_CHECKPOINTS);
const byCheckpoint = spans(QUARRY_RUN.checkpoints.map(({ id }) => id));
const ofKind = (kind: WorldEntity['kind']) => QUARRY_RUN.entities.filter((entity) => entity.kind === kind);
const isBonus = (entity: WorldEntity) => entity.id.startsWith('quarry-bonus-');
const lift = (entity: WorldEntity) => surfaceY(QUARRY_RUN, entity.x) - entity.y;
// Pit floors sit low enough that landing on them triggers fall recovery.
const pits = QUARRY_RUN.surfaces.filter((surface) => surface.y1 === surface.y2
  && surface.y1 - DEFAULT_MOVEMENT.height > FALL_Y);

interface Jump { x: number; press: boolean }

function playQuarry(jump?: Jump) {
  const effects: string[] = [];
  const audio: GameAudio = {
    unlock: async () => {}, setMuted: () => {}, setSuspended: () => {}, startMusic: () => {},
    play: (effect) => effects.push(effect), stop: () => {}, dispose: () => {},
  };
  const scene = new AdventureScene({} as never, worlds, audio, QUARRY_RUN);
  const input = { horizontal: 1, jumpHeld: false, jumpPressed: false, pausePressed: false, mutePressed: false };
  scene.update(1 / 60, { ...input, horizontal: 0, jumpPressed: true });
  let frame = 0;
  let jumpFrames = 0;
  let pending = jump;
  for (; frame < 60 * 120 && scene.screenState !== 'finish'; frame++) {
    let jumpPressed = false;
    if (pending && scene.playerX >= pending.x) {
      jumpPressed = pending.press;
      jumpFrames = 40;
      pending = undefined;
    }
    scene.update(1 / 60, { ...input, jumpPressed, jumpHeld: jumpFrames-- > 0 });
  }
  const collected = (scene as unknown as { run: { collectedGems: Set<string> } }).run.collectedGems;
  return { scene, effects, seconds: frame / 60, collected };
}

it('registers a playable Quarry Run', () => {
  expect(levelById('quarry')).toBe(QUARRY_RUN);
  expect(LEVELS).toContain(QUARRY_RUN);
  expect(() => validateLevel(QUARRY_RUN)).not.toThrow();
  expect(QUARRY_RUN.name).toBe('QUARRY RUN');
  expect(QUARRY_RUN.atlas).toBe('plains');
  expect(QUARRY_RUN.theme.parallax.length).toBeGreaterThanOrEqual(6);
  expect(QUARRY_RUN.theme.parallax.every(({ asset }) => asset === 'cave' || asset === 'stone')).toBe(true);
});

it('is a long route split into six checkpointed sections', () => {
  expect(QUARRY_RUN.width).toBeGreaterThanOrEqual(9980);
  expect(bySection.map(({ checkpoint }) => checkpoint.id)).toEqual(SECTION_CHECKPOINTS);
  expect(QUARRY_RUN.checkpoints.map(({ id }) => id)).toContain('quarry-checkpoint-burrows');
  expect(ofKind('checkpoint')).toHaveLength(7);
  expect(ofKind('spring')).toHaveLength(9);
  expect(ofKind('slime').length).toBeGreaterThanOrEqual(8);
  expect(ofKind('hazard').length).toBeGreaterThanOrEqual(8);
  expect(ofKind('hazard').every(({ asset }) => asset === 'stone')).toBe(true);
  expect(pits.length).toBeGreaterThanOrEqual(5);
  for (const { from, to } of bySection) {
    const inSection = (entity: WorldEntity) => entity.x >= from && entity.x < to;
    expect(QUARRY_RUN.entities.filter((entity) => inSection(entity) && entity.kind === 'decoration').length).toBeGreaterThan(0);
  }
});

it('places the main route inside the walkable activation window and one jump-only bonus gem per section', () => {
  for (const entity of QUARRY_RUN.entities) {
    if (entity.kind === 'decoration' || isBonus(entity)) continue;
    expect(Math.abs(lift(entity)), entity.id).toBeLessThanOrEqual(ACTIVATION_WINDOW);
  }
  const bonus = ofKind('gem').filter(isBonus);
  expect(ofKind('gem').length - bonus.length).toBeGreaterThanOrEqual(30);
  for (const { from, to } of bySection) {
    const inSection = bonus.filter((gem) => gem.x >= from && gem.x < to);
    expect(inSection).toHaveLength(1);
  }
  for (const gem of ofKind('gem')) {
    expect(gem.y - GEM_ART_HEIGHT, gem.id).toBeGreaterThanOrEqual(HUD_BOTTOM);
  }
});

it.each(QUARRY_RUN.entities.filter((entity) => ['decoration', 'slime', 'spring', 'hazard', 'checkpoint'].includes(entity.kind)))(
  'plants $id on the terrain beneath its visible base', (entity) => {
    expect(entity.y).toBe(surfaceY(QUARRY_RUN, entity.x));
  },
);

// The spring art spans roughly x-21..x+19, so its whole base must rest on the ledge.
it.each(ofKind('spring'))('keeps $id fully on its ledge', (spring) => {
  for (let dx = -21; dx <= 19; dx++) {
    expect(Math.abs(surfaceY(QUARRY_RUN, spring.x + dx) - spring.y)).toBeLessThanOrEqual(8);
  }
});

it.each(pits.map((pit) => ({ ...pit, name: `${pit.x1}-${pit.x2}` })))('recovers from the pit at $name', (pit) => {
  const section = byCheckpoint.find(({ from, to }) => pit.x1 > from && pit.x1 < to)!;
  expect(section).toBeDefined();
  // Walking off the ledge without a spring drops Henry below the recovery line; he may
  // scrabble on the steep far wall briefly before sliding back into the pit.
  const ledge = QUARRY_RUN.surfaces.find((surface) => surface.x2 === pit.x1)!.x1;
  const player = createPlayer(ledge - 1, QUARRY_RUN);
  player.vx = DEFAULT_MOVEMENT.maxSpeed;
  for (let frame = 0; frame < 60 * 4 && player.y <= FALL_Y; frame++) {
    simulatePlayer(player, { horizontal: 1, jumpPressed: false, jumpHeld: false }, QUARRY_RUN, 1 / 60);
  }
  expect(player.y).toBeGreaterThan(FALL_Y);
  const run = createRun(QUARRY_RUN);
  const events: RunEvent[] = [];
  activateCheckpoint(run, section.checkpoint.id, events);
  recoverFromFall(run, player, events, QUARRY_RUN);
  expect(player.x).toBe(section.checkpoint.x);
  expect(player.y + DEFAULT_MOVEMENT.height).toBe(surfaceY(QUARRY_RUN, player.x));
  expect(events.at(-1)).toEqual({ type: 'recover' });
});

it('can complete Quarry Run while holding right at a Plains-like pace', () => {
  const { scene, effects, seconds, collected } = playQuarry();
  expect(scene.screenState).toBe('finish');
  expect(seconds).toBeGreaterThanOrEqual(50);
  expect(effects.filter((effect) => effect === 'spring')).toHaveLength(9);
  expect(effects.filter((effect) => effect === 'checkpoint')).toHaveLength(7);
  expect(effects.filter((effect) => effect === 'damage').length).toBeGreaterThan(0);
  const mainGems = ofKind('gem').filter((gem) => !isBonus(gem));
  expect([...collected].sort()).toEqual(mainGems.map(({ id }) => id).sort());
  expect(scene.gemTotal).toBe(mainGems.length);
});

// Each bonus gem is collected by one jump on the held-right route: a pressed jump from
// the ground, or jump held through a spring launch for the secret gems above pits.
it.each([
  { id: 'quarry-bonus-001', x: 1160, press: true },
  { id: 'quarry-bonus-002', x: 2260, press: true },
  { id: 'quarry-bonus-003', x: 3890, press: false },
  { id: 'quarry-bonus-004', x: 5430, press: true },
  { id: 'quarry-bonus-005', x: 7720, press: false },
  { id: 'quarry-bonus-006', x: 9380, press: true },
])('collects $id with a jump and still finishes', ({ id, x, press }) => {
  const { scene, collected } = playQuarry({ x, press });
  expect(collected.has(id)).toBe(true);
  expect(scene.screenState).toBe('finish');
});

const PLATFORMS = QUARRY_RUN.platforms ?? [];
const LIFT = PLATFORMS.find((platform) => platform.id === 'quarry-lift-terraces')!;
const FERRY = PLATFORMS.find((platform) => platform.id === 'quarry-ferry-crusher')!;

/** Drives the real scene from a chosen spot, the way a player who walked there would ride. */
function rideFrom(x: number) {
  const effects: string[] = [];
  const audio: GameAudio = {
    unlock: async () => {}, setMuted: () => {}, setSuspended: () => {}, startMusic: () => {},
    play: (effect) => effects.push(effect), stop: () => {}, dispose: () => {},
  };
  const scene = new AdventureScene({} as never, worlds, audio, QUARRY_RUN);
  scene.update(1 / 60, { horizontal: 0, jumpHeld: false, jumpPressed: true, pausePressed: false, mutePressed: false });
  Object.assign(scene, { player: createPlayer(x, QUARRY_RUN) });
  const collected = (scene as unknown as { run: { collectedGems: Set<string> } }).run.collectedGems;
  const step = (horizontal = 0, jumpPressed = false): void => {
    scene.update(1 / 60, { horizontal, jumpPressed, jumpHeld: false, pausePressed: false, mutePressed: false });
  };
  return { scene, effects, collected, step };
}

it('rides slowly along a telegraphed path and parks at both ends', () => {
  expect(PLATFORMS).toHaveLength(2);
  for (const platform of PLATFORMS) {
    expect(platformSpeed(platform)).toBeLessThanOrEqual(PLATFORM_MAX_SPEED);
    expect(platform.pause ?? 0).toBeGreaterThan(0);
    const path = Array.from({ length: 61 }, (_, tick) => platformBodyAt(platform, (tick / 60) * platformCycleSeconds(platform)));
    expect(Math.min(...path.map((body) => body.x))).toBeCloseTo(Math.min(platform.from.x, platform.to.x), 4);
    expect(Math.max(...path.map((body) => body.x))).toBeCloseTo(Math.max(platform.from.x, platform.to.x), 4);
    expect(Math.min(...path.map((body) => body.y))).toBeCloseTo(Math.min(platform.from.y, platform.to.y), 4);
    expect(Math.max(...path.map((body) => body.y))).toBeCloseTo(Math.max(platform.from.y, platform.to.y), 4);
    // Both rides dock on walkable ground, so a missed boarding is a landing rather than a fall.
    for (const end of [platform.from, platform.to]) {
      expect(surfaceY(QUARRY_RUN, end.x + platform.width / 2)).toBeLessThan(FALL_Y);
    }
  }
});

it('lifts a waiting Henry to the terraces bonus gem', () => {
  const { scene, effects, collected, step } = rideFrom(LIFT.from.x + LIFT.width / 2);
  let highest = scene.playerY;
  for (let frame = 0; frame < 60 * 12; frame++) {
    step();
    highest = Math.min(highest, scene.playerY);
  }
  expect(highest + DEFAULT_MOVEMENT.height).toBeCloseTo(LIFT.to.y, 4);
  // The bonus gem of this section otherwise needs a well-aimed jump; the ride is the calm way up.
  expect(collected.has('quarry-bonus-002')).toBe(true);
  expect(effects).not.toContain('damage');
});

it('ferries a hopping Henry over the paired crusher hazards', () => {
  const { scene, effects, step } = rideFrom(FERRY.from.x + FERRY.width / 2);
  const deck = (): boolean => Math.abs(scene.playerY + DEFAULT_MOVEMENT.height - FERRY.from.y) < 1;
  // Hop on the spot until the deck comes back around: no timing to read, just keep jumping.
  let carried = 0;
  for (let frame = 0; frame < 60 * 14; frame++) {
    const grounded = scene.playerY + DEFAULT_MOVEMENT.height >= surfaceY(QUARRY_RUN, scene.playerX) - 1;
    step(0, grounded);
    if (deck()) carried = Math.max(carried, scene.playerX);
  }
  const hazards = ofKind('hazard').filter((hazard) => hazard.x > FERRY.from.x && hazard.x < FERRY.to.x + FERRY.width);
  expect(hazards).toHaveLength(2);
  expect(carried).toBeGreaterThan(Math.max(...hazards.map((hazard) => hazard.x)));
  expect(effects).not.toContain('damage');
  expect(effects).not.toContain('recover');
});

it('keeps platform phase on the run clock, so a paused adventure resumes in place', () => {
  const played = rideFrom(LIFT.from.x + LIFT.width / 2);
  const paused = rideFrom(LIFT.from.x + LIFT.width / 2);
  for (let frame = 0; frame < 300; frame++) played.step();
  for (let frame = 0; frame < 150; frame++) paused.step();
  // A pause simply stops updating the scene; wall-clock time passing must not move the lift.
  for (let frame = 0; frame < 150; frame++) paused.step();
  expect(paused.scene.playerX).toBeCloseTo(played.scene.playerX, 6);
  expect(paused.scene.playerY).toBeCloseTo(played.scene.playerY, 6);
});
