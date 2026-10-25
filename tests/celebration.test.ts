import { afterEach, expect, it, vi } from 'vitest';
import { CompletionCelebration, celebrationJump, celebrationSparkles } from '../src/game/celebration';
import { AdventureScene } from '../src/game/adventure-scene';
import { SimulationClock } from '../src/core/clock';
import { LEVELS } from '../src/world/levels';
import manifest from '../public/assets/henry/manifest.json';
import type { HenryManifest } from '../src/art/henry';
import type { Player } from '../src/game/movement';
import type { RunState } from '../src/game/interactions';

const neutral = { horizontal: 0, jumpHeld: false, jumpPressed: false, pausePressed: false, mutePressed: false };
const audio = { unlock: async () => {}, setMuted() {}, setSuspended() {}, startMusic: vi.fn(), play: vi.fn(), stop() {}, dispose() {} };
const worlds = Object.fromEntries(LEVELS.map(level => [level.atlas, {} as never]));
const landmarks = { naturalWidth: 300, naturalHeight: 200 } as HTMLImageElement;
const rumble = { play: vi.fn(), stop: vi.fn(), setGameplay() {}, setSuspended() {}, setEnabled() {} };
// Same positional dependencies as the shipped entry point: no picture-story artwork.
const make = (index = 0) => new AdventureScene({} as never, { manifest, atlas: {} } as never, worlds, audio, LEVELS[index], landmarks, {} as never, rumble as never);
type Live = { celebration: CompletionCelebration; player: Player; run: RunState };
const finish = (scene: AdventureScene, index = 0) => {
  (scene as unknown as Live).player.x = LEVELS[index].finish.x;
  scene.update(1 / 60, neutral);
  if (scene.educationOverlay.open) scene.menuTargets.find(target => target.label === 'Leave activity')!.action();
};
afterEach(() => vi.unstubAllGlobals());

it('plays all eight poses once in 1.2 seconds and holds victory indefinitely', () => {
  const celebration = new CompletionCelebration();
  const seen: number[] = [];
  for (let i = 0; i < 8; i++) { celebration.seconds = i * 0.15 + 0.001; seen.push(celebration.frame(manifest as HenryManifest, false)); }
  expect(seen).toEqual([16, 17, 18, 19, 20, 21, 22, 23]);
  celebration.update(1000);
  expect(celebration.frame(manifest as HenryManifest, false)).toBe(23);
  expect(celebrationJump(0)).toBe(0); expect(celebrationJump(0.525)).toBe(-8);
  expect(celebrationJump(0.75)).toBe(0);
  expect(celebrationSparkles(0.3)).toEqual([]);
  expect(celebrationSparkles(0.6)).toHaveLength(5);
  expect(celebrationSparkles(2)).toEqual([]);
});

it('reduced motion immediately holds victory and fixed sparkles', () => {
  const celebration = new CompletionCelebration();
  for (const time of [0, 0.3, 0.6, 1.2, 30]) {
    celebration.seconds = time;
    expect(celebration.frame(manifest as HenryManifest, true)).toBe(23);
    expect(celebrationJump(time, true)).toBe(0);
    expect(celebrationSparkles(time, true)).toEqual(celebrationSparkles(0, true));
  }
});

it.each(LEVELS.map((level, index) => ({ level, index })))('resets celebration on repeat completion of $level.name and advances while input waits for release', ({ index }) => {
  const scene = make(index); scene.startSelected();
  const live = scene as unknown as Live;
  scene.update(20, neutral); expect(live.celebration.seconds).toBe(0);
  finish(scene, index); expect(live.celebration.seconds).toBe(0);
  scene.update(0.6, { ...neutral, jumpHeld: true, horizontal: 1 });
  expect(live.celebration.seconds).toBe(0.6); expect(scene.screenState).toBe('finish');
  const simulationTime = live.run.seconds;
  scene.update(0.2, neutral); expect(live.run.seconds).toBe(simulationTime);
  scene.activateFinish('Replay'); expect(live.celebration.seconds).toBe(0);
  finish(scene, index); expect(live.celebration.seconds).toBe(0);
  expect(scene.menuTargets.some(target => target.label === 'Next trail')).toBe(index < LEVELS.length - 1);
});

it('pause/focus clock suspension freezes finish time without a catch-up jump', () => {
  const scene = make(); scene.startSelected(); finish(scene);
  const clock = new SimulationClock(); const update = (seconds: number) => scene.update(seconds, neutral);
  clock.advance(0, update); clock.advance(100, update);
  const before = (scene as unknown as Live).celebration.seconds;
  clock.setPaused(true); clock.advance(10000, update);
  expect((scene as unknown as Live).celebration.seconds).toBe(before);
  clock.setPaused(false); clock.advance(20000, update);
  expect((scene as unknown as Live).celebration.seconds).toBe(before);
  clock.advance(20017, update);
  expect((scene as unknown as Live).celebration.seconds).toBeCloseTo(before + 1 / 60);
});

/** Records every image destination and live text on the finish screen. */
function finishRecording(scene: AdventureScene) {
  const images: { image: unknown; rect: number[] }[] = [], text: string[] = [];
  const state: Record<string, unknown> = { fillStyle: '#000', font: '10px monospace' };
  const ctx = new Proxy(state, { get: (target, key) => {
    if (key === 'drawImage') return (image: unknown, ...args: number[]) => images.push({ image, rect: args.slice(-4) });
    if (key === 'fillText') return (value: string) => text.push(value);
    return Reflect.get(target, key) ?? (() => {});
  }, set: (target, key, value) => Reflect.set(target, key, value) }) as unknown as CanvasRenderingContext2D;
  (scene as unknown as { drawFinish(ctx: CanvasRenderingContext2D): void }).drawFinish(ctx);
  return { images, text };
}

it('starts on the trail map with Plains selected and only map, Play and sticker targets', () => {
  const scene = make(); const live = scene as unknown as Live;
  expect(scene.screenState).toBe('title');
  expect(scene.selectedLevelName).toBe(LEVELS[0].name);
  expect(scene).not.toHaveProperty('storyDescription');
  expect(scene.menuTargets.map(target => target.label)).toEqual([...LEVELS.map(level => level.name), `Play ${LEVELS[0].name}`, 'Open stickers']);
  // A long wait on the map, a stray retired story edge and held input never start or advance a trail.
  scene.update(500, { ...neutral, storyPressed: true } as never);
  expect(scene.screenState).toBe('title'); expect(live.run.seconds).toBe(0);
  scene.update(1 / 60, { ...neutral, jumpPressed: true, jumpHeld: true });
  expect(scene.screenState).toBe('playing'); expect(scene.selectedLevelName).toBe(LEVELS[0].name);
});

it.each(LEVELS.map((level, index) => ({ level, index })))('$level.name finishes with its landmark, cheer and ordinary results', ({ index }) => {
  const scene = make(index); scene.startSelected(); finish(scene, index);
  expect(scene.screenState).toBe('finish');
  const labels = scene.menuTargets.map(target => target.label);
  expect(labels).toEqual(index < LEVELS.length - 1 ? ['Replay', 'Next trail', 'Choose trail'] : ['Replay', 'Choose trail']);
  scene.update(1 / 60, { ...neutral, storyPressed: true } as never);
  expect(scene.screenState).toBe('finish');
  const { images, text } = finishRecording(scene);
  // Exactly one landmark and Henry's cheer: no picture-story sheet on any trail.
  expect(images.filter(draw => draw.image === landmarks)).toEqual([{ image: landmarks, rect: [88, 90, 80, 66] }]);
  const henry = (scene as unknown as { henry: { atlas: unknown } }).henry.atlas;
  expect(images.filter(draw => draw.image === henry)).toHaveLength(1);
  expect(images).toHaveLength(2);
  expect(text).toContain('Another trail explored!');
  expect(text).toContain('TRAIL COMPLETE!');
  expect(text.join(' ')).not.toMatch(/friend|picture|reunion/i);
  expect(text).toContain('← → + Space');
});
