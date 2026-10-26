import { describe, expect, it } from 'vitest';
import { AdventureScene } from '../src/game/adventure-scene';
import { SilentAudio } from '../src/core/audio';
import { createPlayer, type Player } from '../src/game/movement';
import { createRun, recoverFromFall, stepEntities, type RunEvent, type RunState } from '../src/game/interactions';
import { HudPresentation, trailPosition } from '../src/game/hud';
import { PLAINS_LEVEL, validateLevel, type LevelData } from '../src/world/level';
import { LEVELS } from '../src/world/levels';

const neutral = { horizontal: 0, jumpPressed: false, jumpHeld: false, pausePressed: false, mutePressed: false };
const shelf = (id: string, y: number) => ({ id, from: { x: 80, y }, to: { x: 80, y }, width: 480, seconds: 1 });
const checkpoints = [{ id: 'upper', x: 150, y: 420 }, { id: 'mine', x: 380, y: 700 }, { id: 'floor', x: 150, y: 980 }];
/** Synthetic contract fixture, not the Quarry route or an input-only gameplay claim. */
const vertical: LevelData = {
  ...PLAINS_LEVEL, id: 'quarry', width: 640, height: 1080, minX: 0, maxX: 640,
  start: { x: 230, y: 140 }, finish: { x: 560, y: 980, asset: 'finish-arch', supportOnly: true },
  progressAxis: 'y', checkpointActivation: 'grounded', retrace: { x: 390, y: 980 },
  surfaces: [{ x1: 0, x2: 640, y1: 980, y2: 980 }],
  platforms: [shelf('rim', 140), shelf('upper-shelf', 420), shelf('mine-shelf', 700)], checkpoints,
  entities: checkpoints.map(point => ({ ...point, kind: 'checkpoint', asset: 'checkpoint', layer: 'world' })),
};
function sceneFixture() {
  const scene = new AdventureScene({} as never, {} as never,
    Object.fromEntries(LEVELS.map(level => [level.atlas, {} as never])), new SilentAudio(), vertical);
  const live = scene as unknown as { player: Player; run: RunState; screens: { start(): void; loaded(): void } };
  // Bypass the title's real-level selection only for this synthetic world fixture.
  live.screens.start(); live.screens.loaded();
  return { scene, live };
}

describe('stacked permanent support contracts', () => {
  it('spawns at an explicit support height while terrain remains the default', () => {
    expect(createPlayer(230, vertical, vertical.start.y).y + 34).toBe(140);
    expect(createPlayer(230, vertical).y + 34).toBe(980);
    const { scene } = sceneFixture();
    expect(scene.playerY + 34).toBe(140);
    scene.update(1 / 60, neutral);
    expect(scene.playerY + 34).toBe(140);
  });
  it('validates fully supported fixed landings and rejects moving, unsupported and edge placements', () => {
    expect(() => validateLevel(vertical)).not.toThrow();
    for (const x of [78, 82, 558, 562]) {
      const bad = { ...checkpoints[0], x };
      expect(() => validateLevel({ ...vertical, checkpoints: [bad], entities: [{ ...vertical.entities[0], x }] })).toThrow(/support/);
    }
    expect(() => validateLevel({ ...vertical, platforms: vertical.platforms!.filter(p => p.id !== 'upper-shelf') })).toThrow(/support/);
    expect(() => validateLevel({ ...vertical, platforms: vertical.platforms!.map(p => p.id === 'upper-shelf' ? { ...p, to: { x: 80, y: 490 } } : p) })).toThrow(/support/);
  });
  it('activates only the grounded matching shelf, reactivates upward and emits no standing spam', () => {
    const run = createRun(vertical), events: RunEvent[] = [];
    const player = createPlayer(150, vertical, 140);
    stepEntities(run, vertical, player, 1 / 60, events);
    expect(run.checkpointId).toBeNull();
    player.y = 420 - 34; player.onGround = false;
    stepEntities(run, vertical, player, 1 / 60, events);
    expect(run.checkpointId).toBeNull();
    player.onGround = true;
    stepEntities(run, vertical, player, 1 / 60, events);
    expect(run.checkpointId).toBe('upper');
    stepEntities(run, vertical, player, 1 / 60, events);
    expect(events.filter(e => e.type === 'checkpoint')).toHaveLength(1);
    Object.assign(player, { x: 380, y: 700 - 34 });
    stepEntities(run, vertical, player, 1 / 60, events);
    Object.assign(player, { x: 150, y: 420 - 34 });
    stepEntities(run, vertical, player, 1 / 60, events);
    expect(run.checkpointId).toBe('upper');
    run.collectedGems.add('earned'); run.collectedSpecials.add('star');
    Object.assign(player, { platformId: 'lift', groundVelocityX: 80, vy: -80, vx: 80 });
    recoverFromFall(run, player, events, vertical);
    expect(player).toMatchObject({ x: 150, y: 420 - 34, vx: 0, vy: 0, platformId: null, groundVelocityX: 0, jumpBufferSeconds: 0 });
    expect(run.collectedGems.has('earned')).toBe(true);
    expect(run.collectedSpecials.has('star')).toBe(true);
  });
  it('leaves forgiving airborne horizontal checkpoint crossings intact', () => {
    const run = createRun(PLAINS_LEVEL), player = createPlayer(PLAINS_LEVEL.checkpoints[0].x, PLAINS_LEVEL);
    player.y -= 100; player.onGround = false;
    stepEntities(run, PLAINS_LEVEL, player, 1 / 60, []);
    expect(run.checkpointId).toBe(PLAINS_LEVEL.checkpoints[0].id);
  });
  it('requires the floor at finish X, returns safely, retains run state and rearms on deliberate re-entry', () => {
    const { scene, live } = sceneFixture();
    Object.assign(live.player, { x: 560, y: 420 - 34 });
    scene.update(1 / 60, neutral);
    expect(scene.screenState).toBe('playing');
    Object.assign(live.player, { x: 560, y: 980 - 34, onGround: false });
    // Airborne at the threshold is insufficient; movement must resolve real floor support.
    scene.update(1 / 60, neutral);
    expect(scene.screenState).toBe('finish');
    const run = live.run;
    scene.activateFinish('Build your word');
    scene.menuTargets.find(t => t.label === 'Find more letters')!.action();
    expect(scene.playerX).toBe(390);
    expect(scene.playerY + 34).toBe(980);
    for (let frame = 0; frame < 60; frame++) scene.update(1 / 60, neutral);
    expect(scene.screenState).toBe('playing');
    expect(live.run).toBe(run);
    for (let frame = 0; frame < 120 && scene.screenState === 'playing'; frame++) scene.update(1 / 60, { ...neutral, horizontal: 1 });
    expect(scene.screenState).toBe('finish');
    expect(scene.session.results.has('quarry')).toBe(true);
  });
  it('uses descent position and visited checkpoint history while retracing upward', () => {
    const hud = new HudPresentation();
    expect(trailPosition(vertical, 560, 140)).toBe(0);
    expect(trailPosition(vertical, 100, 560)).toBe(0.5);
    expect(trailPosition(vertical, 100, 980)).toBe(1);
    hud.consume(checkpoints.map(point => ({ type: 'checkpoint', entityId: point.id })));
    const floor = hud.progress(vertical, 150, 980);
    const upper = hud.progress(vertical, 150, 420);
    expect(upper.position).toBeLessThan(floor.position);
    expect(upper.checkpoints.every(point => point.activated)).toBe(true);
    expect(upper.checkpoints.map(point => point.position)).toEqual([1 / 3, 2 / 3, 1]);
    hud.update(1 / 60, neutral, vertical, 380, false, 700);
    expect(hud.location).toBe('Mine shelves');
    expect(trailPosition(PLAINS_LEVEL, PLAINS_LEVEL.finish.x)).toBe(1);
  });
});

import { letterSupportY } from '../src/game/education';

it('resolves explicit letter support and terrain fallback without changing identities', () => {
  const letter = { id: 'quarry-letter-r', letter: 'R', x: 230, supportY: 140 };
  expect(letterSupportY(letter, vertical)).toBe(140);
  expect(letterSupportY({ id: 'legacy', letter: 'H', x: 230 }, vertical)).toBe(980);
  expect(letter.id).toBe('quarry-letter-r');
});

it('uses the same shelf anchor for letter contact, tile drawing and collection flight', () => {
  const { scene, live } = sceneFixture();
  const letter = { ...scene.education.pickups[0], x: 230, supportY: 140 };
  // Explicit placement fixture: reuse the real identity/session, replace only placement data.
  Object.defineProperty(scene.education, 'pickups', { value: [letter] });
  const drawn: unknown[][] = [];
  const ctx = new Proxy({}, { get: (_, key) => key === 'fillText' ? (...args: unknown[]) => drawn.push(args) : () => {}, set: () => true }) as CanvasRenderingContext2D;
  const view = scene as unknown as { drawLetters(ctx: CanvasRenderingContext2D): void; letterFlights: { x: number; y: number; letter: string }[]; camera: { position: { x: number; y: number } } };
  view.drawLetters(ctx);
  expect(drawn.find(args => args[0] === letter.letter)?.[2]).toBe(126 - view.camera.position.y);
  // The same X at the bottom cannot collect a letter planted on the rim.
  Object.assign(live.player, { x: 230, y: 980 - 34, onGround: true });
  scene.update(1 / 60, neutral);
  expect(scene.education.letterCount).toBe(0);
  Object.assign(live.player, { x: 230, y: 140 - 34, onGround: true });
  const cameraBefore = view.camera.position;
  scene.update(1 / 60, neutral);
  expect(scene.education.letterCount).toBe(1);
  expect(view.letterFlights).toEqual([{ letter: letter.letter, x: 230 - cameraBefore.x, y: 120 - cameraBefore.y, age: 0 }]);
  view.drawLetters(ctx);
  expect(drawn.filter(args => args[0] === letter.letter)).toHaveLength(1);
  scene.update(1 / 60, neutral);
  expect(scene.education.letterCount).toBe(1);
  expect(view.letterFlights).toHaveLength(1);
});
