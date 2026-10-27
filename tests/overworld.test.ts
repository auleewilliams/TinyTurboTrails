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
const startCamera = (id: string) => id === 'timbers' ? { x: 0, y: 940 }
  : id === 'quarry' ? { x: 50, y: 2 } : id === 'sunset' ? { x: 0, y: 422 } : { x: 0, y: 0 };

it.each(LEVELS.map((level, index) => ({ level, index })))('abandons $level.name cleanly while keeping completed session results', ({ level, index }) => {
  const scene = make(index); scene.startSelected();
  const stop = vi.spyOn(audio, 'stop'); stop.mockClear();
  scene.session.mark(LEVELS[0], 2, 1);
  const results = new Map(scene.session.results);
  const live = scene as unknown as Live;
  live.run.health = 1; live.run.checkpointId = level.checkpoints[0].id;
  live.run.collectedGems.add(level.entities.find(entity => entity.kind === 'gem')!.id);
  live.run.collectedSpecials.add('unfinished-star');
  live.run.seconds = 20; live.feedback.add('gem', 20, 30); live.player.x += 150;
  scene.returnToTrails();
  expect(stop).toHaveBeenCalledOnce(); stop.mockRestore();
  expect(scene.screenState).toBe('title');
  expect(scene.selectedLevelName).toBe(level.name);
  expect(scene.session.results).toEqual(results);
  expect(scene.session.returnedSeconds).toBe(0);
  expect(live.player).toEqual(createPlayer(level.start.x, level, level.start.y));
  expect(live.run).toEqual(createRun(level));
  expect(live.feedback.effects).toEqual([]);
  expect(live.platforms).toEqual(platformBodiesAt(level.platforms, 0));
  expect(live.camera.position).toEqual(startCamera(level.id));
  expect(live.elapsed).toBe(0);
  scene.update(1 / 60, { ...neutral, jumpPressed: true });
  expect(scene.screenState).toBe('playing');
  expect(live.run).toEqual(createRun(level));
});

it.each(LEVELS.map((level, index) => ({ level, index })))('resets every run domain for Replay and Next trail from $level.name', ({ level, index }) => {
  for (const action of ['Replay', ...(index < LEVELS.length - 1 ? ['Next trail'] : [])]) {
    const scene = make(index); scene.startSelected();
    const live = scene as unknown as Live;
    live.run.health = 1; live.run.checkpointId = level.checkpoints[0].id;
    live.run.collectedGems.add(level.entities.find(e => e.kind === 'gem')!.id);
    live.run.seconds = 20; live.feedback.add('gem', 20, 30);
    live.player.x = level.finish.x; live.player.y = level.finish.y - 34;
    scene.update(1 / 60, neutral);
    expect(scene.screenState).toBe('finish');
    const result = { gems: live.run.collectedGems.size, stars: live.run.collectedSpecials.size };
    expect(result.gems).toBeGreaterThanOrEqual(1);
    scene.activateFinish(action);
    const next = LEVELS[index + (action === 'Next trail' ? 1 : 0)];
    expect(scene.screenState).toBe('playing');
    expect(live.player).toEqual(createPlayer(next.start.x, next, next.start.y));
    expect(live.run).toEqual(createRun(next));
    expect(live.camera.position).toEqual(startCamera(next.id));
    expect(live.platforms).toEqual(platformBodiesAt(next.platforms, 0));
    expect(live.feedback.effects).toEqual([]);
    expect(live.elapsed).toBe(0);
    expect(scene.session.results).toEqual(new Map([[level.id, result]]));
  }
});

it.each(LEVELS.map((level, index) => ({ level, index })))('returns to $level.name with only cosmetic completion retained', ({ level, index }) => {
  const scene = make(index); scene.startSelected();
  (scene as unknown as Live).player.x = level.finish.x; (scene as unknown as Live).player.y = level.finish.y - 34;
  scene.update(1 / 60, neutral);
  const live = scene as unknown as Live;
  const result = { gems: live.run.collectedGems.size, stars: live.run.collectedSpecials.size };
  expect(scene.educationOverlay.open).toBe(false);
  expect(scene.menuTargets.some(target => target.label === 'Next trail')).toBe(index < LEVELS.length - 1);
  expect(scene.educationOverlay.open).toBe(false);
  scene.activateFinish('Map');
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
  expect(scene.educationOverlay.open).toBe(false);
  scene.activateFinish('Map');
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
  const { panel, preview, results, play } = OVERWORLD_LAYOUT;
  const gemTotal = level.entities.filter(entity => entity.kind === 'gem').length;
  const starTotal = level.entities.filter(entity => entity.kind === 'special').length;
  const row = [rewardResultRect(`${gemTotal}/${gemTotal}`, starTotal ? results.gemCenter : results.center, results.baseline)];
  if (starTotal) row.push(rewardResultRect(`${starTotal}/${starTotal}`, results.starCenter, results.baseline));
  for (const bounds of row) {
    expect(bounds.x).toBeGreaterThanOrEqual(panel.x);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(panel.x + panel.width);
    expect(bounds.y).toBeGreaterThanOrEqual(panel.y);
    expect(bounds.y + bounds.height).toBeLessThan(220);
    for (const other of [preview, play, ...make().menuTargets]) expect(overlaps(bounds, other)).toBe(false);
  }
  if (row.length === 2) expect(overlaps(row[0], row[1])).toBe(false);
});

it.each(LEVELS.map((level, index) => ({ level, index })))('draws only visited $level.name results, omitting absent stars', ({ level, index }) => {
  const methods = ['save', 'restore', 'fillRect', 'drawImage', 'fillText', 'strokeRect', 'translate', 'scale', 'beginPath', 'moveTo', 'lineTo', 'closePath', 'fill'];
  const ctx = Object.fromEntries(methods.map(name => [name, vi.fn()])) as unknown as CanvasRenderingContext2D;
  const text = vi.mocked(ctx.fillText);
  const session = new TrailSession();
  const gemAtlas = {} as HTMLImageElement;
  const numericRows = () => text.mock.calls.map(([label]) => label).filter(label => /^\d+\/\d+$/.test(label));
  const render = () => drawOverworld(ctx, LEVELS, index, session.results, { naturalWidth: 1, naturalHeight: 1 } as HTMLImageElement, gemAtlas);
  render(); expect(numericRows()).toEqual([]);
  expect(session.description(level)).toBe('Ready to explore');
  const gemTotal = level.entities.filter(entity => entity.kind === 'gem').length;
  const starTotal = level.entities.filter(entity => entity.kind === 'special').length;
  session.mark(level, 0, 0); text.mockClear(); render();
  expect(vi.mocked(ctx.drawImage).mock.calls.some(call => call[0] === gemAtlas)).toBe(true);
  expect(numericRows()).toEqual([`0/${gemTotal}`, ...(starTotal ? [`0/${starTotal}`] : [])]);
  expect(session.description(level)).toBe(`Session best: 0 of ${gemTotal} gems${starTotal ? `, 0 of ${starTotal} stars` : ''}`);
});

it('requires neutral input after finishing and never advances gameplay on the map', () => {
  const scene = make();
  const live = scene as unknown as Live;
  for (let frame = 0; frame < 100; frame++) scene.update(1 / 60, { ...neutral, horizontal: 1 });
  expect(live.run.seconds).toBe(0);
  scene.startSelected(); live.player.x = LEVELS[1].finish.x; live.player.y = LEVELS[1].finish.y - 34;
  scene.update(1 / 60, { ...neutral, jumpHeld: true, horizontal: 1 });
  for (let frame = 0; frame < 20; frame++) scene.update(1 / 60, { ...neutral, jumpHeld: true, horizontal: 1 });
  expect(scene.screenState).toBe('finish');
  expect(scene.educationOverlay.open).toBe(false);
  const trail = scene.selectedLevelName;
  scene.update(1 / 60, neutral);
  // As before #210, confirm Replay: it sits left of the default Next trail.
  scene.update(1 / 60, { ...neutral, horizontal: -1 }); scene.update(1 / 60, neutral);
  expect(scene.menuTargets.find(target => target.selected)?.label).toBe('Replay');
  scene.update(1 / 60, { ...neutral, jumpPressed: true });
  expect(scene.screenState).toBe('playing');
  expect(scene.selectedLevelName).toBe(trail);
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

it('describes each unvisited destination as a standalone outing, Plains over grassy hills', () => {
  const lines: string[] = [];
  const ctx = new Proxy({} as Record<string, unknown>, { get: (target, key) => key === 'fillText'
    ? (value: string) => lines.push(value) : Reflect.get(target, key) ?? (() => {}),
  set: (target, key, value) => Reflect.set(target, key, value) }) as unknown as CanvasRenderingContext2D;
  const descriptions = LEVELS.map((_, index) => { lines.length = 0; drawOverworld(ctx, LEVELS, index, new Map(), { naturalWidth: 1, naturalHeight: 1 } as HTMLImageElement, {} as HTMLImageElement); return lines.at(-2); });
  expect(descriptions).toEqual(['Over grassy hills', 'Along quarry paths', 'Through tall trees', 'Past the busy yard', 'Over snowy hills', 'Down to the seaside']);
  expect(OVERWORLD_LAYOUT).not.toHaveProperty('story');
});

it.each(LEVELS.map((level, index) => ({ level, index })))('labels every landmark while retaining $level.name selection and session results', ({ level, index }) => {
  const scene = make();
  const shortNames = ['Plains', 'Quarry', 'Timbers', 'Sunset', 'Frost', 'Cove'];
  const texts: { text: string; x: number; y: number }[] = [];
  const ctx = new Proxy({} as Record<string, unknown>, {
    get: (target, key) => key === 'fillText' ? (text: string, x: number, y: number) => texts.push({ text, x, y })
      : Reflect.get(target, key) ?? (() => {}),
    set: (target, key, value) => Reflect.set(target, key, value),
  }) as unknown as CanvasRenderingContext2D;
  for (const completed of [false, true]) {
    if (completed) LEVELS.forEach(trail => scene.session.mark(trail, 2, 1));
    scene.selectDestination(index);
    texts.length = 0;
    drawOverworld(ctx, LEVELS, index, scene.session.results, { naturalWidth: 1, naturalHeight: 1 } as HTMLImageElement, {} as HTMLImageElement);
    shortNames.forEach((name, i) => {
      const label = texts.filter(draw => draw.text === name);
      expect(label).toHaveLength(1);
      const [x, y] = MAP_POINTS[i], target = scene.menuTargets[i];
      expect(label[0].y).toBeGreaterThan(y + 32); // Below the selected frame, including its stroke.
      expect(label[0].y).toBeLessThan(target.y + target.height);
      expect(target).toMatchObject({ label: LEVELS[i].name, x: x - 35, y: y - 30, width: 70, height: 73 });
      expect(target.description).toMatch(completed ? /^Session best: 2 of / : /^Ready to explore$/);
    });
    const words = level.name.split(' ');
    expect(texts).toContainEqual({ text: words.slice(0, -1).join(' ') || words[0], x: 350, y: 63 });
    if (words.length > 1) expect(texts).toContainEqual({ text: words.at(-1)!, x: 350, y: 76 });
    expect(scene.menuTargets).toHaveLength(8);
    expect(scene.menuTargets.some(target => /story|replay|view/i.test(target.label))).toBe(false);
    expect(scene.menuTargets[6].label).toBe(`Play ${level.name}`);
  }
  scene.menuTargets[6].action();
  expect(scene.screenState).toBe('playing');
  expect(scene.selectedLevelName).toBe(level.name);
});

it('keeps travelling Henry on a row or a landmark column, including mid-travel retargeting', () => {
  const scene = make();
  const marker = (scene as unknown as { marker: { x: number; y: number } }).marker;
  for (const destination of [3, 0, 4, 2, 5, 1]) {
    scene.selectDestination(destination);
    for (let frame = 0; frame < 90; frame++) {
      const before = { ...marker };
      scene.update(1 / 60, neutral);
      const changedX = Math.abs(marker.x - before.x) > 0.5;
      const changedY = Math.abs(marker.y - before.y) > 0.5;
      expect(changedX && changedY).toBe(false);
      if (changedX) expect([88, 176]).toContain(Math.round(marker.y));
      if (changedY) expect([48, 140, 232]).toContain(Math.round(marker.x));
      // Retarget while the cosmetic marker is moving; selection is immediate.
      if (frame === 8) scene.selectDestination((destination + 2) % 6);
    }
    const target = MAP_POINTS[(destination + 2) % 6];
    expect(marker.x).toBeCloseTo(target[0], 0);
    expect(marker.y).toBeCloseTo(target[1], 0);
  }
});
