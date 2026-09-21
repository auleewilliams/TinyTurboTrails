import { afterEach, expect, it, vi } from 'vitest';
import { CompletionCelebration, celebrationJump, celebrationSparkles } from '../src/game/celebration';
import { AdventureScene } from '../src/game/adventure-scene';
import { StoryBook } from '../src/game/story';
import { SimulationClock } from '../src/core/clock';
import { LEVELS } from '../src/world/levels';
import manifest from '../public/assets/henry/manifest.json';
import type { HenryManifest } from '../src/art/henry';
import type { Player } from '../src/game/movement';
import type { RunState } from '../src/game/interactions';

const neutral = { horizontal: 0, jumpHeld: false, jumpPressed: false, pausePressed: false, mutePressed: false };
const audio = { unlock: async () => {}, setMuted() {}, setSuspended() {}, startMusic: vi.fn(), play: vi.fn(), stop() {}, dispose() {} };
const worlds = Object.fromEntries(LEVELS.map(level => [level.atlas, {} as never]));
const make = (index = 0) => new AdventureScene({} as never, { manifest } as never, worlds, audio, LEVELS[index], undefined, undefined, {} as never);
type Live = { celebration: CompletionCelebration; player: Player; run: RunState };
const dismiss = (scene: AdventureScene) => scene.menuTargets.find(target => target.label === 'Skip story')!.action();
const finish = (scene: AdventureScene, index = 0) => {
  (scene as unknown as Live).player.x = LEVELS[index].finish.x;
  scene.update(1 / 60, neutral);
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
  const scene = make(index); dismiss(scene); scene.startSelected();
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
  const scene = make(); dismiss(scene); scene.startSelected(); finish(scene);
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

it('keeps pictures player-paced, dismissible and replayable with no simulation or music', () => {
  const scene = make(); const live = scene as unknown as Live;
  scene.update(500, neutral); expect(scene.screenState).toBe('story'); expect(live.run.seconds).toBe(0);
  scene.update(1 / 60, { ...neutral, jumpPressed: true, jumpHeld: true });
  expect(scene.storyDescription).toContain('Rain');
  for (let i = 0; i < 30; i++) scene.update(1 / 60, { ...neutral, jumpHeld: true });
  expect(scene.storyDescription).toContain('Rain');
  dismiss(scene); expect(scene.screenState).toBe('title');
  scene.update(1 / 60, { ...neutral, jumpHeld: true, jumpPressed: true }); expect(scene.screenState).toBe('title');
  scene.update(1 / 60, neutral);
  scene.update(1 / 60, { ...neutral, storyPressed: true }); expect(scene.screenState).toBe('story');
  expect(scene.storyDescription).toContain('prepare a picnic');
  dismiss(scene); scene.startSelected(); finish(scene);
  scene.activateFinish('Replay'); expect(scene.screenState).toBe('playing');
  finish(scene); scene.activateFinish('Next trail'); expect(scene.screenState).toBe('playing');
});

it('reunion picture returns to unchanged results and celebration; no automatic replay of opening', () => {
  const scene = make(); dismiss(scene); scene.startSelected(); finish(scene);
  scene.update(0.4, neutral);
  scene.menuTargets.find(target => target.label === 'View reunion picture')!.action();
  expect(scene.storyDescription).toContain('high-five');
  scene.update(40, neutral); expect((scene as unknown as Live).celebration.seconds).toBe(0.4);
  scene.menuTargets.find(target => target.label === 'Return to results')!.action();
  expect(scene.screenState).toBe('finish');
  scene.activateFinish('Choose trail'); expect(scene.screenState).toBe('title');
});

it('story controls expose meaningful labels and previous/next/skip actions', () => {
  const book = new StoryBook(); book.targets[0].action(); expect(book.page).toBe(0);
  book.targets[1].action(); expect(book.page).toBe(1);
  book.targets[0].action(); expect(book.page).toBe(0);
  book.advance(); book.advance(); expect(book.active).toBe(true);
  book.advance(); expect(book.active).toBe(false);
});
