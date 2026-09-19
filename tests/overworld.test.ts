import { expect, it } from 'vitest';
import { AdventureScene } from '../src/game/adventure-scene';
import { MAP_POINTS } from '../src/game/overworld';
import { LEVELS } from '../src/world/levels';
import { createPlayer, type Player } from '../src/game/movement';
import { createRun, type RunState } from '../src/game/interactions';
import { platformBodiesAt } from '../src/game/platforms';
import type { Camera } from '../src/world/camera';
import type { Feedback } from '../src/game/feedback';

const neutral = { horizontal: 0, jumpHeld: false, jumpPressed: false, pausePressed: false, mutePressed: false };
const audio = { unlock: async () => {}, setMuted() {}, setSuspended() {}, startMusic() {}, play() {}, stop() {}, dispose() {} };
const worlds = Object.fromEntries(LEVELS.map(level => [level.atlas, {} as never]));
const make = (index = 0) => new AdventureScene({} as HTMLImageElement, {} as never, worlds, audio, LEVELS[index]);
type Live = { player: Player; run: RunState; camera: Camera; platforms: ReturnType<typeof platformBodiesAt>; feedback: Feedback; elapsed: number };

it.each(LEVELS.map((level, index) => ({ level, index })))('resets every run domain for Replay and Next trail from $level.name', ({ level, index }) => {
  for (const action of ['Replay', ...(index < LEVELS.length - 1 ? ['Next trail'] : [])]) {
    const scene = make(index); scene.startSelected();
    const live = scene as unknown as Live;
    live.run.health = 1; live.run.checkpointId = level.checkpoints[0].id;
    live.run.collectedGems.add(level.entities.find(e => e.kind === 'gem')!.id);
    live.run.seconds = 20; live.feedback.add('gem', 20, 30);
    live.player.x = level.finish.x;
    scene.update(1 / 60, neutral);
    expect(scene.screenState).toBe('finish');
    scene.activateFinish(action);
    const next = LEVELS[index + (action === 'Next trail' ? 1 : 0)];
    expect(scene.screenState).toBe('playing');
    expect(live.player).toEqual(createPlayer(next.start.x, next));
    expect(live.run).toEqual(createRun(next));
    expect(live.camera.position).toEqual({ x: 0, y: 0 });
    expect(live.platforms).toEqual(platformBodiesAt(next.platforms, 0));
    expect(live.feedback.effects).toEqual([]);
    expect(live.elapsed).toBe(0);
    expect(scene.session.completed).toEqual(new Set([level.id]));
  }
});

it.each(LEVELS.map((level, index) => ({ level, index })))('returns to $level.name with only cosmetic completion retained', ({ level, index }) => {
  const scene = make(index); scene.startSelected();
  (scene as unknown as Live).player.x = level.finish.x;
  scene.update(1 / 60, neutral);
  expect(scene.menuTargets.some(target => target.label === 'Next trail')).toBe(index < LEVELS.length - 1);
  scene.activateFinish('Choose trail');
  expect(scene.screenState).toBe('title');
  expect(scene.selectedLevelName).toBe(level.name);
  expect(scene.session.returnedSeconds).toBeGreaterThan(0);
  scene.update(1 / 60, { ...neutral, jumpHeld: true, jumpPressed: true });
  expect(scene.screenState).toBe('title');
  scene.update(1 / 60, neutral);
  scene.update(1 / 60, { ...neutral, horizontal: 1 });
  expect(scene.selectedLevelName).toBe(LEVELS[(index + 1) % LEVELS.length].name);
  expect(make(index).session.completed.size).toBe(0);
});

it('requires neutral input after finishing and never advances gameplay on the map', () => {
  const scene = make();
  const live = scene as unknown as Live;
  for (let frame = 0; frame < 100; frame++) scene.update(1 / 60, { ...neutral, horizontal: 1 });
  expect(live.run.seconds).toBe(0);
  scene.startSelected(); live.player.x = LEVELS[1].finish.x;
  scene.update(1 / 60, { ...neutral, jumpHeld: true, horizontal: 1 });
  for (let frame = 0; frame < 20; frame++) scene.update(1 / 60, { ...neutral, jumpHeld: true, horizontal: 1 });
  expect(scene.screenState).toBe('finish');
  scene.update(1 / 60, neutral);
  scene.update(1 / 60, { ...neutral, jumpPressed: true });
  expect(scene.screenState).toBe('playing');
});

it('keeps every landmark hit area clear of the preview, prompts and other destinations', () => {
  expect(MAP_POINTS).toHaveLength(LEVELS.length);
  const targets = make().menuTargets;
  for (let i = 0; i < targets.length; i++) {
    const a = targets[i];
    expect(a.x).toBeGreaterThanOrEqual(0); expect(a.y).toBeGreaterThanOrEqual(0);
    expect(a.x + a.width).toBeLessThanOrEqual(426); expect(a.y + a.height).toBeLessThan(220);
    for (const b of targets.slice(i + 1)) expect(a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height).toBe(false);
  }
});
