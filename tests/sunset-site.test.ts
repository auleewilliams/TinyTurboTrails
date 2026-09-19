import { expect, it } from 'vitest';
import { DEFAULT_MOVEMENT, createPlayer, simulatePlayer, surfaceY } from '../src/game/movement';
import { activateCheckpoint, createRun, recoverFromFall, type RunEvent } from '../src/game/interactions';
import type { GameAudio } from '../src/core/audio';
import { AdventureScene } from '../src/game/adventure-scene';
import { PLATFORM_MAX_SPEED, platformBodyAt, platformCycleSeconds, platformSpeed } from '../src/game/platforms';
import { MAX_PATROL_SPEED, validateLevel, type WorldEntity } from '../src/world/level';
import { LEVELS, SUNSET_SITE, levelById } from '../src/world/levels';

const ACTIVATION_WINDOW = 28;
const FALL_Y = SUNSET_SITE.height + 80;
// Gem art reaches this far above its anchor; the HUD covers the top 30 px of the screen.
const GEM_ART_HEIGHT = 44;
const HUD_BOTTOM = 30;
const SECTION_CHECKPOINTS = [
  'site-checkpoint-gate', 'site-checkpoint-girders', 'site-checkpoint-yard',
  'site-checkpoint-trench', 'site-checkpoint-scaffold', 'site-checkpoint-summit',
];
const sections = SECTION_CHECKPOINTS.map((id, index) => {
  const from = SUNSET_SITE.checkpoints.find((checkpoint) => checkpoint.id === id)!.x;
  const next = SECTION_CHECKPOINTS[index + 1];
  const to = next ? SUNSET_SITE.checkpoints.find((checkpoint) => checkpoint.id === next)!.x : SUNSET_SITE.finish.x;
  return { id, from, to };
});
const ofKind = (kind: WorldEntity['kind']) => SUNSET_SITE.entities.filter((entity) => entity.kind === kind);
const isBonus = (entity: WorldEntity) => entity.id.startsWith('site-bonus-');
const lift = (entity: WorldEntity) => surfaceY(SUNSET_SITE, entity.x) - entity.y;
// Pit floors sit low enough that landing on them triggers fall recovery.
const pits = SUNSET_SITE.surfaces.filter((surface) => surface.y1 === surface.y2
  && surface.y1 - DEFAULT_MOVEMENT.height > FALL_Y);

const neutral = { horizontal: 0, jumpHeld: false, jumpPressed: false, pausePressed: false, mutePressed: false };

function startScene() {
  const effects: string[] = [];
  const audio: GameAudio = {
    unlock: async () => {}, setMuted: () => {}, setSuspended: () => {}, startMusic: () => {},
    play: (effect) => effects.push(effect), stop: () => {}, dispose: () => {},
  };
  const scene = new AdventureScene({} as never,
    { plains: {} as never, timbers: {} as never, site: {} as never }, audio, SUNSET_SITE);
  scene.update(1 / 60, { ...neutral, jumpPressed: true });
  const collected = (scene as unknown as { run: { collectedGems: Set<string> } }).run.collectedGems;
  return { scene, effects, collected };
}

/**
 * A fall recovery teleports Henry back to a checkpoint. The scene plays no 'recover' sound,
 * so a backward jump of more than a knockback's worth is the only observable respawn.
 */
const RESPAWN_JUMP = 150;
function respawnWatch(scene: AdventureScene): () => number {
  let previous = scene.playerX;
  let respawns = 0;
  return () => {
    if (previous - scene.playerX > RESPAWN_JUMP) respawns++;
    previous = scene.playerX;
    return respawns;
  };
}

interface Jump { x: number; press: boolean }

function playSite(jump?: Jump) {
  const { scene, effects, collected } = startScene();
  let frame = 0;
  let jumpFrames = 0;
  let pending = jump;
  const respawns = respawnWatch(scene);
  for (; frame < 60 * 120 && scene.screenState !== 'finish'; frame++) {
    let jumpPressed = false;
    if (pending && scene.playerX >= pending.x) {
      jumpPressed = pending.press;
      jumpFrames = 40;
      pending = undefined;
    }
    scene.update(1 / 60, { ...neutral, horizontal: 1, jumpPressed, jumpHeld: jumpFrames-- > 0 });
    respawns();
  }
  return { scene, effects, seconds: frame / 60, collected, respawns: respawns() };
}

it('registers a playable Sunset Site after Plains and Quarry Run', () => {
  expect(levelById('sunset')).toBe(SUNSET_SITE);
  expect(LEVELS.map(({ id }) => id)).toEqual(['plains', 'quarry', 'sunset']);
  expect(() => validateLevel(SUNSET_SITE)).not.toThrow();
  expect(SUNSET_SITE.name).toBe('SUNSET SITE');
  expect(SUNSET_SITE.atlas).toBe('site');
});

it('paints a warm low sun without losing the grass-green edge', () => {
  const { sky, edge, sun, parallax } = SUNSET_SITE.theme;
  const [red, green, blue] = [1, 3, 5].map((offset) => parseInt(sky.slice(offset, offset + 2), 16));
  expect(red).toBeGreaterThan(green);
  expect(green).toBeGreaterThan(blue);
  const [, edgeGreen, edgeBlue] = [1, 3, 5].map((offset) => parseInt(edge.slice(offset, offset + 2), 16));
  expect(edgeGreen).toBeGreaterThan(edgeBlue);
  // The sun is drawn on screen, low over the horizon, and clear of the HUD.
  expect(sun).toBeDefined();
  expect(sun!.x).toBeGreaterThan(0);
  expect(sun!.x).toBeLessThan(426);
  expect(sun!.y - sun!.radius * 1.7).toBeGreaterThanOrEqual(HUD_BOTTOM);
  expect(parallax.length).toBeGreaterThan(0);
  expect(parallax.every(({ asset }) => asset === 'hills')).toBe(true);
});

it('is a long route split into six checkpointed sections', () => {
  expect(SUNSET_SITE.width).toBeGreaterThanOrEqual(9980);
  expect(ofKind('checkpoint')).toHaveLength(7);
  expect(ofKind('spring')).toHaveLength(5);
  expect(ofKind('slime').length).toBeGreaterThanOrEqual(8);
  expect(ofKind('hazard').length).toBeGreaterThanOrEqual(8);
  expect(ofKind('hazard').every(({ asset }) => asset === 'stone')).toBe(true);
  expect(pits).toHaveLength(4);
  for (const { id, from, to } of sections) {
    const inSection = (entity: WorldEntity) => entity.x >= from && entity.x < to;
    expect(SUNSET_SITE.entities.filter((entity) => inSection(entity) && entity.kind === 'decoration').length, id).toBeGreaterThan(0);
  }
});

it('patrols slimes on ground they can walk, slower than Henry', () => {
  const patrols = ofKind('slime').filter((slime) => slime.patrol);
  expect(patrols.length).toBeGreaterThanOrEqual(8);
  for (const slime of patrols) expect(slime.patrol!.speed, slime.id).toBeLessThanOrEqual(MAX_PATROL_SPEED);
});

it('places the main route inside the walkable activation window and one jump-only bonus gem per section', () => {
  for (const entity of SUNSET_SITE.entities) {
    if (entity.kind === 'decoration' || isBonus(entity)) continue;
    expect(Math.abs(lift(entity)), entity.id).toBeLessThanOrEqual(ACTIVATION_WINDOW);
  }
  const bonus = ofKind('gem').filter(isBonus);
  expect(ofKind('gem').length - bonus.length).toBeGreaterThanOrEqual(30);
  expect(bonus).toHaveLength(sections.length);
  for (const { id, from, to } of sections) {
    expect(bonus.filter((gem) => gem.x >= from && gem.x < to), id).toHaveLength(1);
  }
  for (const gem of ofKind('gem')) {
    expect(gem.y - GEM_ART_HEIGHT, gem.id).toBeGreaterThanOrEqual(HUD_BOTTOM);
  }
});

it('keeps main-route gems out of the pits', () => {
  for (const gem of ofKind('gem').filter((candidate) => !isBonus(candidate))) {
    expect(surfaceY(SUNSET_SITE, gem.x), gem.id).toBeLessThan(FALL_Y - DEFAULT_MOVEMENT.height);
  }
});

it.each(SUNSET_SITE.entities.filter((entity) => ['decoration', 'slime', 'spring', 'hazard', 'checkpoint'].includes(entity.kind)))(
  'plants $id on the terrain beneath its visible base', (entity) => {
    expect(entity.y).toBe(surfaceY(SUNSET_SITE, entity.x));
  },
);

// The spring art spans roughly x-21..x+19, so its whole base must rest on the ledge.
it.each(ofKind('spring'))('keeps $id fully on its ledge', (spring) => {
  for (let dx = -21; dx <= 19; dx++) {
    expect(Math.abs(surfaceY(SUNSET_SITE, spring.x + dx) - spring.y)).toBeLessThanOrEqual(8);
  }
});

it.each(pits.map((pit) => ({ ...pit, name: `${pit.x1}-${pit.x2}` })))('recovers from the pit at $name', (pit) => {
  const checkpoint = [...SUNSET_SITE.checkpoints].reverse().find(({ x }) => x < pit.x1)!;
  const ledge = SUNSET_SITE.surfaces.find((surface) => surface.x2 === pit.x1)!.x1;
  const player = createPlayer(ledge - 1, SUNSET_SITE);
  player.vx = DEFAULT_MOVEMENT.maxSpeed;
  for (let frame = 0; frame < 60 * 4 && player.y <= FALL_Y; frame++) {
    simulatePlayer(player, { horizontal: 1, jumpPressed: false, jumpHeld: false }, SUNSET_SITE, 1 / 60);
  }
  expect(player.y).toBeGreaterThan(FALL_Y);
  const run = createRun(SUNSET_SITE);
  const events: RunEvent[] = [];
  activateCheckpoint(run, checkpoint.id, events);
  recoverFromFall(run, player, events, SUNSET_SITE);
  expect(player.x).toBe(checkpoint.x);
  expect(player.y + DEFAULT_MOVEMENT.height).toBe(surfaceY(SUNSET_SITE, player.x));
  expect(events.at(-1)).toEqual({ type: 'recover' });
});

it('can complete Sunset Site while holding right at a Plains-like pace', () => {
  const { scene, effects, seconds, collected, respawns } = playSite();
  expect(scene.screenState).toBe('finish');
  expect(seconds).toBeGreaterThanOrEqual(50);
  expect(effects.filter((effect) => effect === 'checkpoint')).toHaveLength(7);
  expect(effects).toContain('spring');
  expect(effects).toContain('damage');
  expect(respawns).toBe(0);
  const mainGems = ofKind('gem').filter((gem) => !isBonus(gem));
  expect([...collected].sort()).toEqual(mainGems.map(({ id }) => id).sort());
  expect(scene.gemTotal).toBe(mainGems.length);
});

// Each bonus gem is collected by one jump on the held-right route: a pressed jump from
// the ground, or jump held through a spring launch for the secret gems above pits.
it.each([
  { id: 'site-bonus-001', x: 1190, press: true },
  { id: 'site-bonus-002', x: 2325, press: true },
  { id: 'site-bonus-003', x: 4500, press: true },
  { id: 'site-bonus-004', x: 5430, press: false },
  { id: 'site-bonus-005', x: 7255, press: true },
  { id: 'site-bonus-006', x: 9490, press: false },
])('collects $id with a jump and still finishes', ({ id, x, press }) => {
  const { scene, collected, respawns } = playSite({ x, press });
  expect(collected.has(id)).toBe(true);
  expect(scene.screenState).toBe('finish');
  expect(respawns).toBe(0);
});

const FERRY = (SUNSET_SITE.platforms ?? []).find((platform) => platform.id === 'site-crane-ferry')!;

it('rides one slow crane ferry along a telegraphed path and parks at both ends', () => {
  expect(SUNSET_SITE.platforms).toHaveLength(1);
  expect(platformSpeed(FERRY)).toBeLessThanOrEqual(PLATFORM_MAX_SPEED);
  expect(FERRY.pause ?? 0).toBeGreaterThan(0);
  const path = Array.from({ length: 61 }, (_, tick) => platformBodyAt(FERRY, (tick / 60) * platformCycleSeconds(FERRY)));
  expect(Math.min(...path.map((body) => body.x))).toBeCloseTo(FERRY.from.x, 4);
  expect(Math.max(...path.map((body) => body.x))).toBeCloseTo(FERRY.to.x, 4);
  // Both docks are walkable ground, so a missed boarding is a landing rather than a fall.
  for (const end of [FERRY.from, FERRY.to]) {
    expect(surfaceY(SUNSET_SITE, end.x + FERRY.width / 2)).toBeLessThan(FALL_Y);
  }
});

it('ferries a hopping Henry over the paired yard hazards', () => {
  const { scene, effects } = startScene();
  Object.assign(scene, { player: createPlayer(FERRY.from.x + FERRY.width / 2, SUNSET_SITE) });
  const deck = (): boolean => Math.abs(scene.playerY + DEFAULT_MOVEMENT.height - FERRY.from.y) < 1;
  // Hop on the spot until the deck comes back around: no timing to read, just keep jumping.
  let carried = 0;
  const respawns = respawnWatch(scene);
  for (let frame = 0; frame < 60 * 14; frame++) {
    const grounded = scene.playerY + DEFAULT_MOVEMENT.height >= surfaceY(SUNSET_SITE, scene.playerX) - 1;
    scene.update(1 / 60, { ...neutral, jumpPressed: grounded });
    respawns();
    if (deck()) carried = Math.max(carried, scene.playerX);
  }
  const hazards = ofKind('hazard').filter((hazard) => hazard.x > FERRY.from.x && hazard.x < FERRY.to.x + FERRY.width);
  expect(hazards).toHaveLength(2);
  expect(carried).toBeGreaterThan(Math.max(...hazards.map((hazard) => hazard.x)));
  expect(effects).not.toContain('damage');
  expect(respawns()).toBe(0);
});
