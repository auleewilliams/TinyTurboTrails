import { expect, it } from 'vitest';
import { Feedback, MAX_EFFECTS } from '../src/game/feedback';
import { HudPresentation, TRAIL_RIBBON, areaName, controlHints, drawGameplayHud, drawTrailRibbon, trailPosition, RIBBON_INTRO } from '../src/game/hud';
import { LEVELS } from '../src/world/levels';
import { PLAINS_LEVEL } from '../src/world/level';
import { activateCheckpoint, createRun, recoverFromFall, stepEntities, type RunEvent } from '../src/game/interactions';
import { createPlayer, surfaceY } from '../src/game/movement';
import { fitViewport } from '../src/core/viewport';

it('consumes one gem/checkpoint/spring event per contact and expires bounded effects', () => {
  const feedback = new Feedback();
  const run = createRun(PLAINS_LEVEL);
  const gem = PLAINS_LEVEL.entities.find((entity) => entity.kind === 'gem')!;
  const player = createPlayer(gem.x, PLAINS_LEVEL);
  player.y = gem.y - 34;
  for (let index = 0; index < 10; index++) {
    const events: Parameters<Feedback['consume']>[0][number][] = [];
    stepEntities(run, PLAINS_LEVEL, player, 1 / 60, events);
    feedback.consume(events, PLAINS_LEVEL);
  }
  expect(feedback.effects.filter((effect) => effect.kind === 'gem')).toHaveLength(1);
  feedback.consume([{ type: 'checkpoint', entityId: PLAINS_LEVEL.checkpoints[0].id }], PLAINS_LEVEL);
  expect(feedback.checkpointSeconds).toBe(2);
  for (let index = 0; index < 100; index++) feedback.add('landing', index, 180);
  expect(feedback.effects).toHaveLength(MAX_EFFECTS);
  feedback.tick(1);
  expect(feedback.effects).toHaveLength(0);
  expect(feedback.checkpointSeconds).toBe(1);
  feedback.clear();
  expect(feedback.checkpointSeconds).toBe(0);
});

it('compresses and releases only the launched spring, with a motion-free alternative', () => {
  const feedback = new Feedback();
  feedback.add('spring', 100, 180, 'spring');
  expect(feedback.springScale('spring', false)).toBeLessThan(1);
  expect(feedback.springScale('other', false)).toBe(1);
  expect(feedback.springScale('spring', true)).toBe(1);
  feedback.tick(0.15);
  expect(feedback.springScale('spring', false)).toBeGreaterThan(1);
  feedback.tick(0.2);
  expect(feedback.springScale('spring', false)).toBe(1);
});

const neutral = { horizontal: 0, jumpPressed: false, jumpHeld: false, pausePressed: false, mutePressed: false };
it('teaches movement then jump briefly, switches device text, and clears learned hints', () => {
  const hud = new HudPresentation();
  hud.update(1 / 60, neutral, PLAINS_LEVEL, 50);
  expect(hud.hint).toBe('Arrows / A-D: move');
  hud.update(1 / 60, { ...neutral, horizontal: 1, source: 'controller' }, PLAINS_LEVEL, 52);
  expect(hud.hint).toBe('Buttons 1–4: jump');
  hud.update(1 / 60, { ...neutral, horizontal: 1, source: 'keyboard' }, PLAINS_LEVEL, 55);
  expect(hud.hint).toBe('Space: jump');
  hud.update(1 / 60, { ...neutral, jumpPressed: true }, PLAINS_LEVEL, 55);
  expect(hud.hint).toBe('');
  const idle = new HudPresentation();
  for (let index = 0; index < 300; index++) idle.update(1 / 60, neutral, PLAINS_LEVEL, 50);
  expect(idle.hint).toBe(RIBBON_INTRO);
  for (let index = 0; index < 300; index++) idle.update(1 / 60, neutral, PLAINS_LEVEL, 50);
  expect(idle.hint).toBe('');
  expect(controlHints('controller')).toContain('Start: resume');
});

it.each(LEVELS)('names every $name area without internal identifiers and expires location text', (level) => {
  const hud = new HudPresentation();
  if (level.id === 'cove') {
    for(const section of level.sections!) {
      hud.update(1/60,neutral,level,section.x,false,surfaceY(level,section.x));
      expect(hud.location).toBe(section.name);
      expect(hud.location).not.toMatch(/checkpoint|-/);
      hud.update(3,neutral,level,section.x,false,surfaceY(level,section.x));
      expect(hud.locationSeconds).toBe(0);
    }
    return;
  }
  if (level.id === 'frost') {
    const areas = [[1, 'FIRST SLIDE'], [701, 'FIR CLIMB'], [1401, 'ICE BOWL'],
      [2801, 'HIGH LEDGES'], [3451, 'UPPER GLIDE'], [4201, 'SNOWY SUMMIT']] as const;
    for (const [x, name] of areas) {
      hud.update(1 / 60, neutral, level, x, false, surfaceY(level, x));
      expect(hud.location).toBe(name);
      expect(hud.location).not.toMatch(/checkpoint|-/);
      hud.update(3, neutral, level, x, false, surfaceY(level, x));
      expect(hud.locationSeconds).toBe(0);
    }
    return;
  }
  level.checkpoints.forEach((checkpoint, index) => {
    const name = areaName(level, index);
    expect(name).not.toBe(level.name);
    expect(name).not.toMatch(/checkpoint|-/);
    hud.update(1 / 60, neutral, level, checkpoint.x - 100, false, checkpoint.y);
    expect(hud.location).toBe(name);
    hud.update(3, neutral, level, checkpoint.x - 100, false, checkpoint.y);
    expect(hud.locationSeconds).toBe(0);
  });
});

it('keeps simulation untouched when presenting events and clears every pending effect', () => {
  const feedback = new Feedback();
  const run = createRun(PLAINS_LEVEL);
  const before = structuredClone(run);
  feedback.consume([
    { type: 'gem', entityId: 'gem-001' }, { type: 'spring', entityId: 'spring-001' },
    { type: 'checkpoint', entityId: PLAINS_LEVEL.checkpoints[0].id },
  ], PLAINS_LEVEL);
  expect(feedback.effects.map((effect) => effect.kind)).toEqual(['gem', 'spring', 'checkpoint']);
  expect(run).toEqual(before);
  feedback.clear();
  expect(feedback.effects).toEqual([]);
  expect(feedback.checkpointSeconds).toBe(0);
});

it.each(LEVELS.filter(level => level.progressAxis !== 'y'))('maps $name progress from the real start to the exact finish trigger', level => {
  expect(trailPosition(level, level.start.x - 100)).toBe(0);
  expect(trailPosition(level, level.start.x)).toBe(0);
  expect(trailPosition(level, (level.start.x + level.finish.x) / 2)).toBe(0.5);
  expect(trailPosition(level, level.finish.x - 0.01)).toBeLessThan(1);
  expect(trailPosition(level, level.finish.x)).toBe(1);
  expect(trailPosition(level, level.finish.x + 100)).toBe(1);
  const progress = new HudPresentation().progress(level, level.start.x);
  expect(progress.checkpoints.map(point => point.id)).toEqual(level.checkpoints.map(point => point.id));
  progress.checkpoints.forEach((point, index) => {
    expect(point.position).toBe(trailPosition(level, level.checkpoints[index].x));
    expect(point.activated).toBe(false);
  });
});

it.each(LEVELS)('fills only activated $name checkpoints and preserves them through backtracking and recovery', level => {
  const hud = new HudPresentation();
  const run = createRun(level);
  const player = createPlayer(level.start.x, level);
  const checkpoint = level.checkpoints[1];
  const events: RunEvent[] = [];
  // A position beyond a checkpoint is not proof that Henry touched its flag.
  expect(hud.progress(level, level.finish.x).checkpoints.every(point => !point.activated)).toBe(true);
  activateCheckpoint(run, checkpoint.id, events);
  const before = structuredClone(run);
  hud.consume(events);
  hud.consume(events); // repeated activation cannot create another tick
  expect(run).toEqual(before);
  expect(hud.progress(level, level.start.x).checkpoints.filter(point => point.activated).map(point => point.id)).toEqual([checkpoint.id]);
  recoverFromFall(run, player, events, level);
  hud.consume(events);
  const recovered = hud.progress(level, player.x);
  expect(recovered.position).toBe(trailPosition(level, checkpoint.x));
  expect(recovered.checkpoints.filter(point => point.activated).map(point => point.id)).toEqual([checkpoint.id]);
  // Returning to an earlier flag changes recovery but must not erase the later fill.
  const earlierEvents: RunEvent[] = [];
  activateCheckpoint(run, level.checkpoints[0].id, earlierEvents);
  hud.consume(earlierEvents);
  recoverFromFall(run, player, earlierEvents, level);
  hud.consume(earlierEvents);
  expect(hud.progress(level, player.x).checkpoints.filter(point => point.activated).map(point => point.id))
    .toEqual([level.checkpoints[0].id, checkpoint.id]);
  expect(hud.progress(level, player.x).position).toBe(trailPosition(level, level.checkpoints[0].x));
  // Replay, map selection and next all construct a new presentation with the new run.
  const fresh = new HudPresentation().progress(level, level.start.x);
  expect(fresh.position).toBe(0);
  expect(fresh.checkpoints.every(point => !point.activated)).toBe(true);
});

function hudDrawing(): { ctx: CanvasRenderingContext2D; rects: number[][]; texts: string[] } {
  const rects: number[][] = [];
  const texts: string[] = [];
  const ctx = {
    save() {}, restore() {},
    fillRect: (...rect: number[]) => rects.push(rect),
    fillText: (text: string) => texts.push(text),
    measureText: (text: string) => ({ width: text.length * 6 }),
  } as unknown as CanvasRenderingContext2D;
  return { ctx, rects, texts };
}

it.each(LEVELS)('insets the wordless $name ribbon at bottom-right, clear of HUD panels, hints and notices at both sizes', level => {
  for (const width of [426, 320]) {
    const size = fitViewport(width, 240);
    const scale = size.width / 426;
    for (const notice of [level.name, ...level.checkpoints.map((_, index) => areaName(level, index)), 'Checkpoint reached!']) {
      const hud = hudDrawing();
      drawGameplayHud(hud.ctx, createRun(level), controlHints('keyboard')[0], notice);
      const ribbon = hudDrawing();
      drawTrailRibbon(ribbon.ctx, new HudPresentation().progress(level, level.start.x));
      expect(ribbon.texts).toEqual([]);
      const [panelX, panelY, panelWidth, panelHeight] = ribbon.rects[0];
      expect((panelX + panelWidth + 5) * scale).toBeCloseTo(size.width);
      expect((panelY + panelHeight + 5) * scale).toBeCloseTo(size.height);
      for (const [x, y, w, h] of ribbon.rects) {
        expect(x * scale).toBeGreaterThanOrEqual(0);
        expect(y * scale).toBeGreaterThanOrEqual(0);
        expect((x + w) * scale).toBeLessThanOrEqual(size.width);
        expect((y + h) * scale).toBeLessThanOrEqual(size.height);
        for (const [hx, hy, hw, hh] of hud.rects) {
          expect(x + w <= hx || hx + hw <= x || y + h <= hy || hy + hh <= y).toBe(true);
        }
      }
    }
  }
});

it('keeps Henry short of the finish flag until the finish threshold, including pixel rounding', () => {
  for (const [x, expected] of [[PLAINS_LEVEL.finish.x - 0.01, TRAIL_RIBBON.finishX - 1], [PLAINS_LEVEL.finish.x, TRAIL_RIBBON.finishX]]) {
    const drawing = hudDrawing();
    drawTrailRibbon(drawing.ctx, new HudPresentation().progress(PLAINS_LEVEL, x));
    const pointer = drawing.rects.at(-1)!;
    expect(pointer[0]).toBe(expected);
  }
});
