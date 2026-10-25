import { expect, it, vi } from 'vitest';
import manifest from '../public/assets/henry/manifest.json';
import { AdventureScene, FINISH_LAYOUT, celebrationHenryRect, celebrationStarRects, type Rect } from '../src/game/adventure-scene';
import { INTERFACE_PIECES } from '../src/art/interface-kit';
import { TRAIL_WORDS } from '../src/game/education';
import { surfaceY, type Player } from '../src/game/movement';
import type { RunState } from '../src/game/interactions';
import { LEVELS } from '../src/world/levels';

const neutral = { horizontal: 0, jumpHeld: false, jumpPressed: false, pausePressed: false, mutePressed: false };
const audio = { unlock: async () => {}, setMuted() {}, setSuspended() {}, startMusic: vi.fn(), play: vi.fn(), stop() {}, dispose() {} };
const worlds = Object.fromEntries(LEVELS.map(level => [level.atlas, {} as never]));
const landmarks = { naturalWidth: 300, naturalHeight: 200 } as HTMLImageElement;
type Live = { player: Player; run: RunState; celebration: { seconds: number } };
const last = LEVELS.length - 1;
const labelsFor = (index: number) => index < last ? ['Next trail', 'Map', 'Build your word', 'Replay'] : ['Map', 'Build your word', 'Replay'];

function finished(index: number) {
  const scene = new AdventureScene({} as never, { manifest, atlas: {} } as never, worlds, audio, LEVELS[index], landmarks);
  scene.startSelected();
  const live = scene as unknown as Live;
  live.player.x = LEVELS[index].finish.x;
  scene.update(1 / 60, neutral);
  return { scene, live };
}
const labels = (scene: AdventureScene) => scene.menuTargets.map(target => target.label);
const selected = (scene: AdventureScene) => scene.menuTargets.find(target => target.selected)?.label;
const target = (scene: AdventureScene, label: string) => scene.menuTargets.find(candidate => candidate.label === label)!;

function finishText(scene: AdventureScene) {
  const text: { text: string; x: number; y: number; font: string; align: string }[] = [];
  const state: Record<string, unknown> = { fillStyle: '#000', font: '10px monospace', textAlign: 'left' };
  const ctx = new Proxy(state, { get: (store, key) => {
    if (key === 'fillText') return (value: string, x: number, y: number) => text.push({ text: value, x, y, font: String(store.font), align: String(store.textAlign) });
    return Reflect.get(store, key) ?? (() => {});
  }, set: (store, key, value) => Reflect.set(store, key, value) }) as unknown as CanvasRenderingContext2D;
  (scene as unknown as { drawFinish(ctx: CanvasRenderingContext2D): void }).drawFinish(ctx);
  return text;
}
const overlaps = (a: Rect, b: Rect) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

it.each(LEVELS.map((level, index) => ({ level, index })))('$level.name shows results first with Build your word, Next trail/Map and Replay', ({ index }) => {
  const { scene } = finished(index);
  expect(scene.screenState).toBe('finish');
  expect(scene.educationOverlay.open).toBe(false);
  expect(labels(scene)).toEqual(labelsFor(index));
  expect(selected(scene)).toBe(index < last ? 'Next trail' : 'Map');
  // A long held press from the finishing run neither opens the activity nor navigates.
  scene.update(3, { ...neutral, jumpHeld: true, horizontal: 1 });
  expect(scene.educationOverlay.open).toBe(false);
  expect(scene.screenState).toBe('finish');
  expect(selected(scene)).toBe(index < last ? 'Next trail' : 'Map');
});

it.each(LEVELS.map((level, index) => ({ level, index })))('$level.name renders every finish label exactly, inside its button quiet interior', ({ index }) => {
  const { scene } = finished(index);
  const targets = scene.menuTargets, text = finishText(scene), inset = INTERFACE_PIECES.button.slice, panelInset = INTERFACE_PIECES.panel.slice;
  const { panel } = FINISH_LAYOUT;
  for (const action of targets) {
    const line = text.find(entry => entry.text === action.label);
    expect(line, action.label).toBeDefined();
    const size = Number(line!.font.match(/(\d+)px/)![1]);
    expect(size).toBeGreaterThanOrEqual(12);
    const width = action.label.length * size * 0.6;
    const left = line!.align === 'center' ? line!.x - width / 2 : line!.x;
    expect(left).toBeGreaterThanOrEqual(action.x + inset.left);
    expect(left + width).toBeLessThanOrEqual(action.x + action.width - inset.right);
    expect(line!.y - size * 0.75).toBeGreaterThanOrEqual(action.y + inset.top);
    expect(line!.y + size * 0.2).toBeLessThanOrEqual(action.y + action.height - inset.bottom);
    expect(action.x).toBeGreaterThanOrEqual(panel.x + panelInset.left);
    expect(action.x + action.width).toBeLessThanOrEqual(panel.x + panel.width - panelInset.right);
    expect(action.y + action.height).toBeLessThanOrEqual(panel.y + panel.height - panelInset.bottom);
    const art = [FINISH_LAYOUT.landmark, celebrationHenryRect(manifest.anchor, -8), celebrationHenryRect(manifest.anchor, 0),
      ...Array.from({ length: 121 }, (_, step) => celebrationStarRects(step / 60)).flat(), ...celebrationStarRects(0, true)];
    for (const rect of art) expect(overlaps(rect, action)).toBe(false);
  }
  for (let a = 0; a < targets.length; a++) for (let b = a + 1; b < targets.length; b++) expect(overlaps(targets[a], targets[b])).toBe(false);
  expect(text.map(entry => entry.text)).toEqual(expect.arrayContaining(['TRAIL COMPLETE!', 'Another trail explored!']));
});

it.each(LEVELS.map((level, index) => ({ level, index })))('$level.name enters word building only deliberately and returns to default navigation', ({ index }) => {
  const { scene, live } = finished(index);
  const config = TRAIL_WORDS.find(word => word.id === LEVELS[index].id)!;
  // Keyboard/controller: release, step right to Build your word, then press.
  scene.update(1 / 60, neutral);
  const steps = labelsFor(index).indexOf('Build your word');
  for (let step = 0; step < steps; step++) { scene.update(1 / 60, { ...neutral, horizontal: 1 }); scene.update(1 / 60, neutral); }
  expect(selected(scene)).toBe('Build your word');
  scene.update(1 / 60, { ...neutral, jumpPressed: true, jumpHeld: true });
  expect(scene.educationOverlay.open).toBe(true);
  expect(scene.educationOverlay.title).toBe(`Build ${config.word}`);
  expect(scene.screenState).toBe('finish');
  // Simulation and the celebration freeze while the activity is open.
  const frozen = JSON.stringify(live.run), celebration = live.celebration.seconds;
  scene.update(5, { ...neutral, horizontal: 1, jumpHeld: true });
  expect(JSON.stringify(live.run)).toBe(frozen);
  expect(live.celebration.seconds).toBe(celebration);
  target(scene, 'Leave activity').action();
  expect(scene.educationOverlay.open).toBe(false);
  expect(labels(scene)).toEqual(labelsFor(index));
  expect(selected(scene)).toBe(index < last ? 'Next trail' : 'Map');
  // The press still held from leaving cannot activate the default action.
  scene.update(1 / 60, { ...neutral, jumpHeld: true, jumpPressed: true, horizontal: -1 });
  expect(scene.screenState).toBe('finish');
  expect(selected(scene)).toBe(index < last ? 'Next trail' : 'Map');
  scene.update(1 / 60, neutral);
  scene.update(1 / 60, { ...neutral, jumpPressed: true, jumpHeld: true });
  // Next trail starts the successor; the final trail's Map fallback returns to the map without wrapping.
  expect(scene.screenState).toBe(index < last ? 'playing' : 'title');
  expect(scene.selectedLevelName).toBe(index < last ? LEVELS[index + 1].name : LEVELS[index].name);
});

it('final trail defaults to Map, never wraps to a new progression and ignores Next trail', () => {
  const { scene } = finished(last);
  expect(labels(scene)).not.toContain('Next trail');
  scene.activateFinish('Next trail');
  expect(scene.screenState).toBe('finish');
  scene.update(1 / 60, neutral);
  scene.update(1 / 60, { ...neutral, jumpPressed: true, jumpHeld: true });
  expect(scene.screenState).toBe('title');
  expect(scene.selectedLevelName).toBe(LEVELS[last].name);
});

it('skipping the activity keeps completion, letters, repeated identities and rewards across Next trail, Map and Replay', () => {
  const index = LEVELS.findIndex(level => level.id === 'timbers');
  const { scene, live } = finished(index);
  const config = TRAIL_WORDS.find(word => word.id === 'timbers')!;
  // Collected letters stay in the bag, untouched by finishing without the activity.
  scene.activateFinish('Replay');
  for (const pickup of config.pickups) {
    Object.assign(live.player, { x: pickup.x, y: surfaceY(LEVELS[index], pickup.x) - 34, vx: 0, vy: 0, onGround: true });
    scene.update(1 / 60, neutral);
  }
  live.player.x = LEVELS[index].finish.x; scene.update(1 / 60, neutral);
  expect(scene.educationOverlay.open).toBe(false);
  const result = scene.session.results.get('timbers');
  expect(result).toBeDefined();
  scene.activateFinish('Next trail');
  expect(scene.screenState).toBe('playing');
  scene.returnToTrails(); scene.selectDestination(index); scene.startSelected();
  expect(scene.education.letterCount).toBe(4);
  expect(scene.education.pile.map(pickup => pickup.id).sort()).toEqual(config.pickups.map(pickup => pickup.id).sort());
  expect(scene.education.stickers).toEqual([]);
  expect(scene.session.results.get('timbers')).toEqual(result);
  live.player.x = LEVELS[index].finish.x; scene.update(1 / 60, neutral);
  scene.activateFinish('Map');
  expect(scene.screenState).toBe('title');
  expect(scene.education.letterCount).toBe(4);
});

it('Find more letters retraces beside the same finish, and only explicit Build your word reopens after collecting', () => {
  const index = LEVELS.findIndex(level => level.id === 'plains');
  const { scene, live } = finished(index);
  const config = TRAIL_WORDS.find(word => word.id === 'plains')!;
  const run = live.run, before = JSON.stringify(run);
  scene.activateFinish('Build your word');
  expect(scene.educationOverlay.open).toBe(true);
  target(scene, 'Find more letters').action();
  expect(scene.screenState).toBe('playing');
  expect(live.run).toBe(run);
  expect(JSON.stringify(run)).toBe(before);
  expect(Math.abs(scene.playerX - LEVELS[index].finish.x)).toBeLessThan(40);
  // Standing still beside the finish neither retriggers it nor reopens the activity.
  for (let frame = 0; frame < 60; frame++) scene.update(1 / 60, neutral);
  expect(scene.screenState).toBe('playing');
  // Ordinary collection of the furthest letter, then re-entry by running through the finish.
  const pickup = config.pickups[3];
  Object.assign(live.player, { x: pickup.x, y: surfaceY(LEVELS[index], pickup.x) - 34, vx: 0, vy: 0, onGround: true });
  scene.update(1 / 60, neutral);
  expect(scene.education.letterCount).toBe(1);
  for (let frame = 0; frame < 60 * 30 && scene.screenState === 'playing'; frame++) scene.update(1 / 60, { ...neutral, horizontal: 1 });
  expect(scene.screenState).toBe('finish');
  expect(scene.educationOverlay.open).toBe(false);
  expect(live.run).toBe(run);
  expect(selected(scene)).toBe('Next trail');
  scene.activateFinish('Build your word');
  expect(scene.educationOverlay.open).toBe(true);
  expect(scene.education.pile.map(letter => letter.id)).toEqual([pickup.id]);
  expect(scene.education.collect(pickup.id)).toBe(false);
});

it('re-entering a completed word cannot duplicate its sticker', () => {
  const index = LEVELS.findIndex(level => level.id === 'timbers');
  const { scene } = finished(index);
  const config = TRAIL_WORDS.find(word => word.id === 'timbers')!;
  for (const pickup of config.pickups) scene.education.collect(pickup.id);
  scene.activateFinish('Build your word');
  config.pickups.forEach((pickup, slot) => scene.education.place(pickup.id, slot));
  expect(scene.education.stickers).toEqual(['Timbers TREE']);
  target(scene, 'Done').action();
  scene.activateFinish('Build your word');
  expect(scene.educationOverlay.open).toBe(true);
  expect(labels(scene)).not.toContain('Find more letters');
  config.pickups.forEach((pickup, slot) => expect(scene.education.place(pickup.id, slot)).toBe(false));
  target(scene, 'Done').action();
  scene.activateFinish('Replay');
  expect(scene.education.stickers).toEqual(['Timbers TREE']);
});
