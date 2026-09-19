import { expect, it } from 'vitest';
import { Feedback, MAX_EFFECTS } from '../src/game/feedback';
import { HudPresentation, areaName, controlHints } from '../src/game/hud';
import { LEVELS } from '../src/world/levels';
import { PLAINS_LEVEL } from '../src/world/level';
import { createRun, stepEntities } from '../src/game/interactions';
import { createPlayer } from '../src/game/movement';

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
  expect(hud.hint).toBe('Face button: jump');
  hud.update(1 / 60, { ...neutral, horizontal: 1, source: 'keyboard' }, PLAINS_LEVEL, 55);
  expect(hud.hint).toBe('Space: jump');
  hud.update(1 / 60, { ...neutral, jumpPressed: true }, PLAINS_LEVEL, 55);
  expect(hud.hint).toBe('');
  const idle = new HudPresentation();
  for (let index = 0; index < 300; index++) idle.update(1 / 60, neutral, PLAINS_LEVEL, 50);
  expect(idle.hint).toBe('');
  expect(controlHints('controller')).toContain('Start: resume');
});

it.each(LEVELS)('names every $name area without internal identifiers and expires location text', (level) => {
  const hud = new HudPresentation();
  level.checkpoints.forEach((checkpoint, index) => {
    const name = areaName(level, index);
    expect(name).not.toBe(level.name);
    expect(name).not.toMatch(/checkpoint|-/);
    hud.update(1 / 60, neutral, level, checkpoint.x - 100);
    expect(hud.location).toBe(name);
    hud.update(3, neutral, level, checkpoint.x - 100);
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
