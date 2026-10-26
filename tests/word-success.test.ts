import { expect, it } from 'vitest';
import { EducationSession, TRAIL_WORDS } from '../src/game/education';
import { EducationOverlay } from '../src/game/education-overlay';
import { AdventureScene } from '../src/game/adventure-scene';
import { SilentAudio } from '../src/core/audio';
import { LEVELS } from '../src/world/levels';

const neutral = { horizontal: 0, jumpHeld: false, jumpPressed: false, pausePressed: false, mutePressed: false };

it.each(TRAIL_WORDS)('$word completion selects only Done, replaces placement prompts and rearms held confirmation', config => {
  const session = new EducationSession(); session.selectTrail(config.id);
  config.pickups.forEach(pickup => session.collect(pickup.id));
  const overlay = new EducationOverlay(session); overlay.showAssembly(() => {});
  overlay.update(neutral);
  for (const [slot, pickup] of config.pickups.entries()) {
    const duplicates = config.pickups.filter(letter => letter.letter === pickup.letter);
    const label = `Letter ${pickup.letter}${duplicates.length > 1 ? ` ${duplicates.indexOf(pickup) + 1}` : ''}`;
    overlay.targets.find(target => target.label === label)!.action();
    overlay.targets.find(target => target.label === `Space ${slot + 1}: empty`)!.focus!();
    overlay.update({ ...neutral, jumpHeld: true, jumpPressed: true });
    if (slot < 3) expect(overlay.targets.at(-1)!.label).toBe('Leave activity');
  }
  expect(overlay.targets.map(target => [target.label, target.selected])).toEqual([['Done', true]]);
  expect(overlay.title).toBe(`Completed ${config.word}`);
  expect(overlay.description).toContain(session.wordProgress);
  const text: string[] = [];
  const ctx = new Proxy({}, { get: (_, key) => key === 'fillText' ? (value: string) => text.push(value) : () => {}, set: () => true }) as CanvasRenderingContext2D;
  overlay.draw(ctx);
  expect(text).toContain('WORD COMPLETE!'); expect(text).toContain('Done');
  for (const letter of new Set(config.word)) {
    expect(text.filter(glyph => glyph === letter)).toHaveLength([...config.word].filter(glyph => glyph === letter).length * 2);
  }
  expect(text).toContain('Done: return to trail results');
  expect(text.some(line => /Choose|another letter|letter → space/.test(line))).toBe(false);
  expect(session.stickers).toEqual([`${config.name} ${config.word}`]);
  for (let frame = 0; frame < 12; frame++) overlay.update({ ...neutral, jumpHeld: true, jumpPressed: true });
  expect(overlay.open).toBe(true);
  overlay.update(neutral); overlay.update({ ...neutral, jumpHeld: true, jumpPressed: true });
  expect(overlay.open).toBe(false);
  overlay.showAssembly(() => {});
  expect(overlay.targets.map(target => [target.label, target.selected])).toEqual([['Done', true]]);
  overlay.update({ ...neutral, jumpHeld: true, jumpPressed: true }); expect(overlay.open).toBe(true);
  overlay.update(neutral); overlay.update({ ...neutral, jumpPressed: true }); expect(overlay.open).toBe(false);
  expect(session.stickers).toHaveLength(1); expect(session.letterCount).toBe(4);
});

it.each(LEVELS.map((level, index) => ({ level, index })))('$level.id Done returns to the same results with the onward default and frozen run', ({ level, index }) => {
  const scene = new AdventureScene({} as never, {} as never, Object.fromEntries(LEVELS.map(item => [item.atlas, {} as never])), new SilentAudio(), level);
  scene.startSelected();
  const live = scene as unknown as { player: { x: number; y: number }; run: unknown };
  live.player.x = level.finish.x; live.player.y = level.finish.y - 34; scene.update(1 / 60, neutral);
  scene.activateFinish('Build your word');
  const before = JSON.stringify(live.run);
  for (const [slot, pickup] of scene.education.pickups.entries()) { scene.education.collect(pickup.id); scene.education.place(pickup.id, slot); }
  scene.update(90, { ...neutral, horizontal: 1, jumpHeld: true });
  expect(JSON.stringify(live.run)).toBe(before);
  scene.menuTargets.find(target => target.label === 'Done')!.action();
  const expected = index < LEVELS.length - 1 ? 'Next trail' : 'Map';
  expect(scene.menuTargets.find(target => target.selected)!.label).toBe(expected);
  expect(scene.selectedLevelName).toBe(level.name); expect(scene.screenState).toBe('finish');
  scene.activateFinish('Build your word');
  expect(scene.menuTargets.map(target => target.label)).toEqual(['Done']);
  scene.menuTargets[0].action();
  scene.menuTargets.find(target => target.selected)!.action();
  expect(scene.screenState).toBe(index < LEVELS.length - 1 ? 'playing' : 'title');
  expect(scene.selectedLevelName).toBe(LEVELS[Math.min(index + 1, LEVELS.length - 1)].name);
  expect(scene.education.progressFor(level.id).wordProgress).toBe([...TRAIL_WORDS[index].word].join(' '));
  expect(scene.education.stickers).toHaveLength(1);
});
