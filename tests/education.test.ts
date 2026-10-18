import { expect, it } from 'vitest';
import { EducationSession, LETTER_PICKUPS } from '../src/game/education';

it('matches TREE in any order by stable identity, including two separate Es', () => {
  const session = new EducationSession();
  const [t, r, e1, e2] = LETTER_PICKUPS;
  expect(session.wordProgress).toBe('_ _ _ _');
  expect(session.collect(e2.id)).toBe(true);
  expect(session.wordProgress).toBe('_ _ E _');
  expect(session.collect(e2.id)).toBe(false);
  expect(session.collect('unknown')).toBe(false);
  expect(session.collect(r.id)).toBe(true);
  expect(session.collect(e1.id)).toBe(true);
  expect(session.wordProgress).toBe('_ R E E');
  expect(session.stickers).toEqual([]);
  expect(session.collect(t.id)).toBe(true);
  expect(session.wordProgress).toBe('T R E E');
  expect(session.stickers).toEqual(['Timbers TREE']);
  for (const letter of LETTER_PICKUPS) expect(session.collect(letter.id)).toBe(false);
  expect(session.stickers).toHaveLength(1);
  expect(new EducationSession().wordProgress).toBe('_ _ _ _');
});

it('supports every pickup permutation and fills exactly one matching slot per pickup', () => {
  function permutations(ids: string[]): string[][] {
    return ids.length === 0 ? [[]] : ids.flatMap(id => permutations(ids.filter(other => other !== id)).map(rest => [id, ...rest]));
  }
  for (const order of permutations(LETTER_PICKUPS.map(letter => letter.id))) {
    const session = new EducationSession();
    order.forEach((id, index) => {
      session.collect(id);
      expect(session.wordProgress.split(' ').filter(letter => letter !== '_')).toHaveLength(index + 1);
    });
    expect(session.wordProgress).toBe('T R E E');
    expect(session.stickers).toEqual(['Timbers TREE']);
  }
});

import { AdventureScene } from '../src/game/adventure-scene';
import { SilentAudio } from '../src/core/audio';
import { LEVELS, TREETOP_TIMBERS } from '../src/world/levels';
import { surfaceY, type Player } from '../src/game/movement';
import { damagePlayer, recoverFromFall, type RunState } from '../src/game/interactions';

const neutral = { horizontal: 0, jumpHeld: false, jumpPressed: false, pausePressed: false, mutePressed: false };
function timbers() {
  const scene = new AdventureScene({} as never, {} as never,
    Object.fromEntries(LEVELS.map(level => [level.atlas, {} as never])), new SilentAudio(), TREETOP_TIMBERS);
  scene.startSelected();
  return { scene, live: scene as unknown as { player: Player; run: RunState } };
}

it('collects on Timbers only and retains education through health/pit recovery, replay, map and other trails', () => {
  const { scene, live } = timbers();
  for (const letter of [...LETTER_PICKUPS].reverse()) {
    Object.assign(live.player, { x: letter.x, y: surfaceY(TREETOP_TIMBERS, letter.x) - 34, vx: 0, vy: 0, onGround: true });
    scene.update(1 / 60, neutral);
  }
  expect(scene.education.wordProgress).toBe('T R E E');
  scene.education.answerMaths(scene.education.maths.answer);
  const rewards = scene.education.stickers;
  recoverFromFall(live.run, live.player, [], TREETOP_TIMBERS);
  live.run.health = 1; live.run.invulnerableSeconds = 0;
  damagePlayer(live.run, live.player, 1, [], TREETOP_TIMBERS);
  expect(scene.education.stickers).toEqual(rewards);
  live.player.x = TREETOP_TIMBERS.finish.x;
  scene.update(1 / 60, neutral);
  scene.activateFinish('Replay');
  expect(scene.education.wordProgress).toBe('T R E E');
  scene.returnToTrails();
  scene.selectDestination(0); scene.startSelected();
  expect(scene.education.stickers).toEqual(rewards);
  scene.returnToTrails(); scene.selectDestination(2); scene.startSelected();
  expect(scene.education.wordProgress).toBe('T R E E');
  expect(timbers().scene.education.stickers).toEqual([]);
});

it('does not collect pilot letters in another trail at the same position', () => {
  const { scene, live } = timbers();
  scene.returnToTrails(); scene.selectDestination(0); scene.startSelected();
  live.player.x = LETTER_PICKUPS[0].x;
  scene.update(1 / 60, neutral);
  expect(scene.education.wordProgress).toBe('_ _ _ _');
});

import { mathsQuestion } from '../src/game/education';

it('exhausts every valid operand pair for both operations with exactly one correct, distinct bounded choice', () => {
  const operations = new Set<string>(), operands = new Set<number>(), answers = new Set<number>(), pairs = new Set<string>();
  for (let index = 0; index < 2652; index++) {
    const question = mathsQuestion(index);
    expect(mathsQuestion(index)).toEqual(question);
    operations.add(question.operation);
    operands.add(question.left); operands.add(question.right); answers.add(question.answer);
    pairs.add(`${question.left}${question.operation}${question.right}`);
    for (const number of [question.left, question.right, question.answer, ...question.choices]) {
      expect(Number.isInteger(number)).toBe(true);
      expect(number).toBeGreaterThanOrEqual(0); expect(number).toBeLessThanOrEqual(50);
    }
    expect(question.answer).toBe(question.operation === '+' ? question.left + question.right : question.left - question.right);
    expect(new Set(question.choices).size).toBe(3);
    expect(question.choices.filter(choice => choice === question.answer)).toHaveLength(1);
  }
  expect(operations).toEqual(new Set(['+', '−']));
  expect(pairs.size).toBe(2652);
  expect([...operands].sort((a, b) => a - b)).toEqual(Array.from({ length: 51 }, (_, index) => index));
  expect(answers.has(0) && answers.has(50)).toBe(true);
});

it('retries the same maths question without penalty and awards a distinct maths sticker exactly once', () => {
  const session = new EducationSession();
  const question = session.maths;
  expect(session.answerMaths(question.choices.find(choice => choice !== question.answer)!)).toBe(false);
  expect(session.maths).toEqual(question);
  expect(session.mathsComplete).toBe(false);
  expect(session.stickers).toEqual([]);
  expect(session.answerMaths(question.answer)).toBe(true);
  expect(session.answerMaths(question.answer)).toBe(false);
  expect(session.stickers).toEqual(['Timbers number leaf']);
  for (const letter of LETTER_PICKUPS) session.collect(letter.id);
  expect(session.stickers).toEqual(['Timbers TREE', 'Timbers number leaf']);
  expect(new EducationSession().mathsComplete).toBe(false);
});

import { MATHS_SPOT } from '../src/game/education';

it('requires deliberate nearby entry and freezes all simulation and feedback including the opening frame', () => {
  const { scene, live } = timbers();
  scene.handleEducationInput({ ...neutral, activityPressed: true });
  expect(scene.educationOverlay.open).toBe(false);
  Object.assign(live.player, { x: MATHS_SPOT.x, y: surfaceY(TREETOP_TIMBERS, MATHS_SPOT.x) - 34, vx: 80, vy: 0, onGround: true });
  scene.update(1 / 60, neutral);
  expect(scene.educationOverlay.open).toBe(false);
  expect(scene.menuTargets.map(target => target.label)).toContain('Open optional maths');
  scene.handleEducationInput({ ...neutral, activityPressed: true });
  const before = JSON.stringify(scene);
  scene.update(10, { ...neutral, horizontal: 1, jumpPressed: true, jumpHeld: true });
  expect(JSON.stringify(scene)).toBe(before);
  expect(scene.educationOverlay.open).toBe(true);
  scene.handleEducationInput({ ...neutral, pausePressed: true });
  expect(scene.educationOverlay.open).toBe(false);
  scene.update(1 / 60, neutral);
  expect(JSON.stringify(scene)).not.toBe(before);
});

it('uses matching native pointer and keyboard/controller targets, retries safely and explains completion on revisit', () => {
  const { scene, live } = timbers();
  Object.assign(live.player, { x: MATHS_SPOT.x, y: surfaceY(TREETOP_TIMBERS, MATHS_SPOT.x) - 34 });
  scene.menuTargets.find(target => target.label === 'Open optional maths')!.action();
  const question = scene.education.maths;
  const before = JSON.stringify(live.run);
  scene.menuTargets.find(target => target.label === `Answer ${question.choices.find(choice => choice !== question.answer)}`)!.action();
  expect(scene.educationOverlay.message).toContain('Try again');
  expect(scene.education.maths).toEqual(question);
  expect(JSON.stringify(live.run)).toBe(before);
  const correctIndex = question.choices.indexOf(question.answer);
  scene.menuTargets[correctIndex].focus!();
  // Opening/held confirmation must release before a keyboard or pad confirms.
  scene.handleEducationInput({ ...neutral, jumpPressed: true, jumpHeld: true });
  expect(scene.education.mathsComplete).toBe(false);
  scene.handleEducationInput(neutral);
  scene.handleEducationInput({ ...neutral, jumpPressed: true, jumpHeld: true, source: 'controller' });
  expect(scene.education.mathsComplete).toBe(true);
  expect(scene.educationOverlay.message).toContain('Sticker earned');
  scene.menuTargets.find(target => target.label === 'Leave activity')!.action();
  expect(scene.educationOverlay.open).toBe(false);
  scene.handleEducationInput({ ...neutral, activityPressed: true });
  expect(scene.educationOverlay.message).toContain('Already complete');
  expect(scene.menuTargets.map(target => target.label)).toEqual(['Leave activity']);
  expect(scene.education.stickers).toEqual(['Timbers number leaf']);
});

it('publishes every overlay boundary even when a pointer exit and keyboard re-entry happen between frames', () => {
  const { scene, live } = timbers();
  Object.assign(live.player, { x: MATHS_SPOT.x, y: surfaceY(TREETOP_TIMBERS, MATHS_SPOT.x) - 34 });
  scene.handleEducationInput({ ...neutral, activityPressed: true });
  const revision = scene.educationOverlay.revision;
  scene.menuTargets.at(-1)!.action();
  scene.handleEducationInput({ ...neutral, activityPressed: true });
  expect(scene.educationOverlay.revision).toBe(revision + 2);
  expect(scene.menuTargets[0].selected).toBe(true);
});

it('opens a small session sticker collection from the map by pointer or activity input without changing selection or rewards', () => {
  const { scene } = timbers();
  scene.returnToTrails();
  const selected = scene.selectedLevelName;
  expect(scene.menuTargets.filter(target => LEVELS.some(level => level.name === target.label))).toHaveLength(6);
  scene.menuTargets.find(target => target.label === 'Open stickers')!.action();
  expect(scene.educationOverlay.description).toContain('0/2 stickers');
  expect(scene.menuTargets.map(target => target.label)).toEqual(['Return to map']);
  scene.handleEducationInput({ ...neutral, pausePressed: true });
  for (const letter of LETTER_PICKUPS) scene.education.collect(letter.id);
  scene.education.answerMaths(scene.education.maths.answer);
  scene.handleEducationInput({ ...neutral, activityPressed: true, source: 'controller' });
  expect(scene.educationOverlay.description).toContain('2/2 stickers');
  expect(scene.educationOverlay.description).toContain('Timbers TREE: earned');
  expect(scene.educationOverlay.description).toContain('Timbers number leaf: earned');
  scene.menuTargets[0].action();
  expect(scene.screenState).toBe('title');
  expect(scene.selectedLevelName).toBe(selected);
  expect(scene.education.stickers).toHaveLength(2);
});
