import { expect, it, vi } from 'vitest';
import { AdventureScene } from '../src/game/adventure-scene';
import { drawOverworld, MAP_POINTS, OVERWORLD_LAYOUT, TrailSession } from '../src/game/overworld';
import { rewardResultRect } from '../src/game/reward-result';
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
    const result = { gems: live.run.collectedGems.size, stars: live.run.collectedSpecials.size };
    expect(result.gems).toBeGreaterThanOrEqual(1);
    scene.activateFinish(action);
    const next = LEVELS[index + (action === 'Next trail' ? 1 : 0)];
    expect(scene.screenState).toBe('playing');
    expect(live.player).toEqual(createPlayer(next.start.x, next));
    expect(live.run).toEqual(createRun(next));
    expect(live.camera.position).toEqual({ x: 0, y: 0 });
    expect(live.platforms).toEqual(platformBodiesAt(next.platforms, 0));
    expect(live.feedback.effects).toEqual([]);
    expect(live.elapsed).toBe(0);
    expect(scene.session.results).toEqual(new Map([[level.id, result]]));
  }
});

it.each(LEVELS.map((level, index) => ({ level, index })))('returns to $level.name with only cosmetic completion retained', ({ level, index }) => {
  const scene = make(index); scene.startSelected();
  (scene as unknown as Live).player.x = level.finish.x;
  scene.update(1 / 60, neutral);
  const live = scene as unknown as Live;
  const result = { gems: live.run.collectedGems.size, stars: live.run.collectedSpecials.size };
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
  expect(scene.session.results.get(level.id)).toEqual(result);
  expect(make(index).session.results.size).toBe(0);
});

it('retains each collectible best independently when replay results are worse', () => {
  const session = new TrailSession();
  session.mark(LEVELS[0], 12, 2);
  session.mark(LEVELS[0], 9, 3);
  session.mark(LEVELS[0], 1, 0);
  session.mark(LEVELS[1], 5, 1);
  expect(session.results.get(LEVELS[0].id)).toEqual({ gems: 12, stars: 3 });
  expect(session.results.get(LEVELS[1].id)).toEqual({ gems: 5, stars: 1 });
  expect(session.results.has(LEVELS[2].id)).toBe(false);
  expect(new TrailSession().results.size).toBe(0);
});

it('records a finished run and preserves it through a worse replay and a new trail', () => {
  const scene = make(); scene.startSelected();
  const live = scene as unknown as Live;
  live.run.collectedGems.add('gem-001'); live.run.collectedGems.add('gem-002');
  live.run.collectedSpecials.add('star-001');
  live.player.x = LEVELS[0].finish.x;
  scene.update(1 / 60, neutral);
  expect(scene.session.results.get(LEVELS[0].id)).toEqual({ gems: 2, stars: 1 });
  scene.activateFinish('Replay');
  expect(live.run).toEqual(createRun(LEVELS[0]));
  live.player.x = LEVELS[0].finish.x;
  scene.update(1 / 60, neutral);
  scene.activateFinish('Choose trail');
  expect(scene.session.results.get(LEVELS[0].id)).toEqual({ gems: 2, stars: 1 });
  expect(scene.menuTargets[0].description).toBe(`Session best: 2 of ${live.run.gemTotal} gems, 1 of 3 stars`);
  scene.selectDestination(1); scene.startSelected();
  expect(live.run).toEqual(createRun(LEVELS[1]));
  expect(scene.session.results.get(LEVELS[0].id)).toEqual({ gems: 2, stars: 1 });
});

function overlaps(a: { x: number; y: number; width: number; height: number }, b: typeof a): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

it.each(LEVELS)('keeps $name session symbols and counts clear of previews, controls and prompts', level => {
  const { panel, preview, storyPreview, results, play } = OVERWORLD_LAYOUT;
  const gemTotal = level.entities.filter(entity => entity.kind === 'gem').length;
  const starTotal = level.entities.filter(entity => entity.kind === 'special').length;
  const row = [rewardResultRect(`${gemTotal}/${gemTotal}`, starTotal ? results.gemCenter : results.center, results.baseline)];
  if (starTotal) row.push(rewardResultRect(`${starTotal}/${starTotal}`, results.starCenter, results.baseline));
  for (const bounds of row) {
    expect(bounds.x).toBeGreaterThanOrEqual(panel.x);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(panel.x + panel.width);
    expect(bounds.y).toBeGreaterThanOrEqual(panel.y);
    expect(bounds.y + bounds.height).toBeLessThan(220);
    for (const other of [preview, storyPreview, play, ...make().menuTargets]) expect(overlaps(bounds, other)).toBe(false);
  }
  if (row.length === 2) expect(overlaps(row[0], row[1])).toBe(false);
});

it.each(LEVELS.map((level, index) => ({ level, index })))('draws only visited $level.name results, omitting absent stars', ({ level, index }) => {
  const methods = ['save', 'restore', 'fillRect', 'drawImage', 'fillText', 'strokeRect', 'translate', 'scale', 'beginPath', 'moveTo', 'lineTo', 'closePath', 'fill'];
  const ctx = Object.fromEntries(methods.map(name => [name, vi.fn()])) as unknown as CanvasRenderingContext2D;
  const text = vi.mocked(ctx.fillText);
  const session = new TrailSession();
  const numericRows = () => text.mock.calls.map(([label]) => label).filter(label => /^\d+\/\d+$/.test(label));
  const render = () => drawOverworld(ctx, LEVELS, index, session.results, { naturalWidth: 1, naturalHeight: 1 } as HTMLImageElement);
  render(); expect(numericRows()).toEqual([]);
  expect(session.description(level)).toBe('Ready to explore');
  const gemTotal = level.entities.filter(entity => entity.kind === 'gem').length;
  const starTotal = level.entities.filter(entity => entity.kind === 'special').length;
  session.mark(level, 0, 0); text.mockClear(); render();
  expect(numericRows()).toEqual([`0/${gemTotal}`, ...(starTotal ? [`0/${starTotal}`] : [])]);
  expect(session.description(level)).toBe(`Session best: 0 of ${gemTotal} gems${starTotal ? `, 0 of ${starTotal} stars` : ''}`);
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
