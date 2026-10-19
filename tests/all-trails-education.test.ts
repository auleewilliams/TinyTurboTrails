import { expect, it } from 'vitest';
import { EducationSession } from '../src/game/education';
import { LEVELS } from '../src/world/levels';

const words = ['HILL', 'ROCK', 'TREE', 'BEAM', 'SNOW', 'SAND'];

it('keeps all six manual words, repeated identities and stickers independent within one session', () => {
  const session = new EducationSession();
  for (const [index, level] of LEVELS.entries()) {
    session.selectTrail(level.id);
    expect(session.config.word).toBe(words[index]);
    expect(session.letterCount).toBe(0);
    expect(session.wordProgress).toBe('_ _ _ _');
    expect(session.pickups.map(pickup => pickup.letter).join('')).toBe(words[index]);
    expect(new Set(session.pickups.map(pickup => pickup.id)).size).toBe(4);
    expect(session.collect('foreign-letter')).toBe(false);
    const foreign = session.progressFor(LEVELS[(index + 1) % 6].id).config.pickups[0].id;
    expect(session.collect(foreign)).toBe(false);
    for (const pickup of [...session.pickups].reverse()) expect(session.collect(pickup.id)).toBe(true);
    expect(session.hasWordSticker).toBe(false);
    expect(session.pile.map(pickup => pickup.letter).join('')).not.toBe(words[index]);
    expect(session.place(session.pickups[3].id, 0)).toBe(false);
    for (const [slot, pickup] of session.pickups.entries()) {
      expect(session.place(pickup.id, slot)).toBe(true);
      expect(session.place(pickup.id, (slot + 1) % 4)).toBe(false);
      expect(session.collect(pickup.id)).toBe(false);
    }
    expect(session.hasWordSticker).toBe(true);
    expect(session.stickers).toHaveLength(index + 1);
  }
  for (const [index, level] of LEVELS.entries()) {
    session.selectTrail(level.id);
    expect(session.wordProgress).toBe([...words[index]].join(' '));
    expect(session.letterCount).toBe(4);
    expect(session.pile).toEqual([]);
  }
  expect(new EducationSession().stickers).toEqual([]);
});

import { AdventureScene } from '../src/game/adventure-scene';
import { SilentAudio } from '../src/core/audio';
import { surfaceY, type Player } from '../src/game/movement';
import { damagePlayer, recoverFromFall, type RunState } from '../src/game/interactions';

const neutral = { horizontal: 0, jumpHeld: false, jumpPressed: false, pausePressed: false, mutePressed: false };
function adventure(index: number) {
  const scene = new AdventureScene({} as never, {} as never,
    Object.fromEntries(LEVELS.map(level => [level.atlas, {} as never])), new SilentAudio(), LEVELS[index]);
  scene.startSelected();
  return { scene, live: scene as unknown as { player: Player; run: RunState } };
}

it.each(LEVELS.map((level, index) => ({ level, index })))('$level.id collects its own letters and keeps partial assembly through recovery, finish return, replay and switching', ({ level, index }) => {
  const { scene, live } = adventure(index);
  expect(scene.education.config.id).toBe(level.id);
  expect(scene.educationDescription).toBe('Letter bag: 0/4');
  const first = scene.education.pickups[0];
  Object.assign(live.player, { x: first.x, y: surfaceY(level, first.x) - 34, vx: 0, vy: 0, onGround: true });
  scene.update(1 / 60, neutral);
  expect(scene.education.letterCount).toBe(1);
  expect(scene.educationDescription).toContain(`${first.letter} → bag`);
  expect(scene.education.place(first.id, 0)).toBe(true);
  const partial = scene.education.wordProgress;
  recoverFromFall(live.run, live.player, [], level);
  live.run.health = 1; live.run.invulnerableSeconds = 0;
  damagePlayer(live.run, live.player, 1, [], level);
  expect(scene.education.wordProgress).toBe(partial);
  live.player.x = level.finish.x;
  scene.update(1 / 60, neutral);
  expect(scene.educationOverlay.open).toBe(true);
  expect(scene.educationOverlay.description).toContain(`Build ${words[index]}`);
  const run = live.run, before = JSON.stringify(run);
  scene.menuTargets.find(target => target.label === 'Find more letters')!.action();
  expect(live.run).toBe(run);
  expect(JSON.stringify(run)).toBe(before);
  expect(scene.session.results.has(level.id)).toBe(true);
  expect(scene.playerX).toBe(level.finish.x - 28);
  for (let frame = 0; frame < 40; frame++) scene.update(1 / 60, neutral);
  expect(scene.screenState).toBe('playing');
  for (let frame = 0; frame < 100 && scene.playerX > level.finish.x - 100; frame++) scene.update(1 / 60, { ...neutral, horizontal: -1 });
  for (let frame = 0; frame < 100 && scene.screenState === 'playing'; frame++) scene.update(1 / 60, { ...neutral, horizontal: 1 });
  expect(scene.educationOverlay.open).toBe(true);
  expect(scene.education.wordProgress).toBe(partial);
  scene.menuTargets.find(target => target.label === 'Leave activity')!.action();
  expect(scene.menuTargets.map(target => target.label)).toContain('Replay');
  scene.activateFinish('Replay');
  expect(scene.education.wordProgress).toBe(partial);
  scene.returnToTrails(); scene.selectDestination((index + 1) % 6); scene.startSelected();
  expect(scene.education.letterCount).toBe(0);
  expect(scene.education.wordProgress).toBe('_ _ _ _');
  scene.returnToTrails(); scene.selectDestination(index); scene.startSelected();
  expect(scene.education.wordProgress).toBe(partial);
});

it.each(LEVELS.map((level, index) => ({ level, index })))('$level.id exposes mixed accessible identities and matching target letters for pointer and controller assembly', ({ level, index }) => {
  const { scene, live } = adventure(index);
  scene.education.pickups.forEach(pickup => scene.education.collect(pickup.id));
  live.player.x = level.finish.x; scene.update(1 / 60, neutral);
  const letters = scene.menuTargets.filter(target => target.label.startsWith('Letter '));
  expect(new Set(letters.map(target => target.label)).size).toBe(4);
  expect(new Set(letters.map(target => target.x)).size).toBe(4);
  expect(letters.every(target => target.x >= 111 && target.x <= 267)).toBe(true);
  const texts: string[] = [];
  const ctx = new Proxy({}, { get: (_, key) => key === 'fillText' ? (value: string) => texts.push(value) : () => {}, set: () => true }) as CanvasRenderingContext2D;
  scene.educationOverlay.draw(ctx);
  expect(texts).toContain(`BUILD ${words[index]}`);
  for (const [slot, pickup] of scene.education.pickups.entries()) {
    // Pointer drag into the first correct slot, controller select/place for the rest.
    if (!slot) {
      scene.educationOverlay.beginDrag(pickup.id, 132, 132);
      scene.educationOverlay.endDrag(132, 80);
    } else {
      const duplicates = scene.education.pickups.filter(letter => letter.letter === pickup.letter);
      const label = `Letter ${pickup.letter}${duplicates.length > 1 ? ` ${duplicates.indexOf(pickup) + 1}` : ''}`;
      for (const name of [label, `Space ${slot + 1}: empty`]) {
        scene.menuTargets.find(target => target.label === name)!.focus!();
        scene.handleEducationInput(neutral);
        scene.handleEducationInput({ ...neutral, jumpPressed: true, source: 'controller' });
      }
    }
  }
  expect(scene.education.hasWordSticker).toBe(true);
  expect(scene.education.stickers).toHaveLength(1);
  expect(scene.educationOverlay.description).toContain(`${words[index] === 'TREE' ? 'Tree' : words[index]} sticker earned!`);
});
