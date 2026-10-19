import { expect, it } from 'vitest';
import { EducationSession, LETTER_PICKUPS } from '../src/game/education';
import { AdventureScene } from '../src/game/adventure-scene';
import { SilentAudio } from '../src/core/audio';
import { LEVELS, TREETOP_TIMBERS } from '../src/world/levels';
import { surfaceY, type Player } from '../src/game/movement';
import { damagePlayer, recoverFromFall, type RunState } from '../src/game/interactions';

it('bags every independent pickup without automatically assembling or earning a sticker', () => {
  const session = new EducationSession();
  for (const pickup of [...LETTER_PICKUPS].reverse()) {
    expect(session.collect(pickup.id)).toBe(true);
    expect(session.wordProgress).toBe('_ _ _ _');
    expect(session.hasWordSticker).toBe(false);
  }
  expect(session.stickers).toEqual([]);
  for (const pickup of LETTER_PICKUPS) expect(session.collect(pickup.id)).toBe(false);
  expect(session.collect('unknown')).toBe(false);
});

it('manually places only collected matching identities, with independent Es and forgiving rollback', () => {
  const session = new EducationSession();
  const [t, r, e1, e2] = LETTER_PICKUPS;
  expect(session.place(t.id, 0)).toBe(false);
  for (const pickup of LETTER_PICKUPS) session.collect(pickup.id);
  expect(session.pile.map(pickup => pickup.id).sort()).toEqual(LETTER_PICKUPS.map(pickup => pickup.id).sort());
  expect(session.pile.map(pickup => pickup.letter).join('')).not.toBe('TREE');
  expect(session.place(e2.id, 0)).toBe(false);
  expect(session.place(t.id, -1)).toBe(false);
  expect(session.place(t.id, 4)).toBe(false);
  expect(session.place(t.id, 0)).toBe(true);
  expect(session.place(r.id, 1)).toBe(true);
  expect(session.place(e2.id, 2)).toBe(true);
  expect(session.place(e2.id, 3)).toBe(false);
  expect(session.wordProgress).toBe('T R E _');
  expect(session.stickers).toEqual([]);
  expect(session.place(e1.id, 3)).toBe(true);
  expect(session.wordProgress).toBe('T R E E');
  expect(session.stickers).toEqual(['Timbers TREE']);
  expect(session.place(e1.id, 3)).toBe(false);
  expect(session.pile).toEqual([]);
  expect(session.stickers).toHaveLength(1);
});

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
  expect(scene.education.letterCount).toBe(4);
  expect(scene.education.wordProgress).toBe('_ _ _ _');
  const rewards = scene.education.stickers;
  recoverFromFall(live.run, live.player, [], TREETOP_TIMBERS);
  live.run.health = 1; live.run.invulnerableSeconds = 0;
  damagePlayer(live.run, live.player, 1, [], TREETOP_TIMBERS);
  expect(scene.education.stickers).toEqual(rewards);
  live.player.x = TREETOP_TIMBERS.finish.x;
  scene.update(1 / 60, neutral);
  scene.educationOverlay.close();
  scene.activateFinish('Replay');
  expect(scene.education.letterCount).toBe(4);
  expect(scene.education.wordProgress).toBe('_ _ _ _');
  expect(scene.education.stickers).toEqual([]);
  scene.returnToTrails();
  scene.selectDestination(0); scene.startSelected();
  expect(scene.education.stickers).toEqual(rewards);
  scene.returnToTrails(); scene.selectDestination(2); scene.startSelected();
  expect(scene.education.letterCount).toBe(4);
  expect(scene.education.wordProgress).toBe('_ _ _ _');
  expect(timbers().scene.education.stickers).toEqual([]);
});

it('does not collect pilot letters in another trail at the same position', () => {
  const { scene, live } = timbers();
  scene.returnToTrails(); scene.selectDestination(0); scene.startSelected();
  live.player.x = LETTER_PICKUPS[0].x;
  scene.update(1 / 60, neutral);
  expect(scene.education.wordProgress).toBe('_ _ _ _');
});

it('has no activity spot, target or activation on the trail, including the former sign position', () => {
  const { scene, live } = timbers();
  Object.assign(live.player, { x: 2350, y: surfaceY(TREETOP_TIMBERS, 2350) - 34, vx: 0, vy: 0, onGround: true });
  expect(scene.menuTargets).toEqual([]);
  for (const source of ['keyboard', 'controller'] as const) {
    scene.handleEducationInput({ ...neutral, activityPressed: true, source });
    expect(scene.educationOverlay.open).toBe(false);
  }
  const before = scene.playerX;
  scene.update(1 / 60, { ...neutral, horizontal: 1 });
  expect(scene.playerX).toBeGreaterThan(before);
});

it('offers only the word sticker with one return target and no removed reward or answer controls', () => {
  const { scene } = timbers();
  scene.returnToTrails();
  expect(scene.menuTargets.find(target => target.label === 'Open stickers')!.description).toContain('0 of 1 sticker');
  scene.handleEducationInput({ ...neutral, activityPressed: true });
  expect(scene.educationOverlay.description).toBe('0/1 stickers · Timbers TREE: find the letters');
  expect(scene.menuTargets.map(target => target.label)).toEqual(['Return to map']);
  for (const letter of LETTER_PICKUPS) scene.education.collect(letter.id);
  expect(scene.educationOverlay.description).toBe('0/1 stickers · Timbers TREE: find the letters');
  LETTER_PICKUPS.forEach((pickup, slot) => scene.education.place(pickup.id, slot));
  expect(scene.educationOverlay.description).toBe('1/1 stickers · Timbers TREE: earned');
  expect(scene.education.stickers).toEqual(['Timbers TREE']);
});

it('freezes the map while the collection is open and requires released confirmation', () => {
  const { scene } = timbers();
  scene.returnToTrails();
  scene.handleEducationInput({ ...neutral, activityPressed: true });
  const before = JSON.stringify(scene);
  scene.update(10, { ...neutral, horizontal: 1, jumpPressed: true, jumpHeld: true });
  expect(JSON.stringify(scene)).toBe(before);
  scene.handleEducationInput({ ...neutral, jumpPressed: true, jumpHeld: true });
  expect(scene.educationOverlay.open).toBe(true);
  scene.handleEducationInput(neutral);
  scene.handleEducationInput({ ...neutral, jumpPressed: true, source: 'controller' });
  expect(scene.educationOverlay.open).toBe(false);
  scene.update(1 / 60, neutral);
  expect(JSON.stringify(scene)).not.toBe(before);
});

it('publishes collection boundaries even when pointer exit and keyboard re-entry occur between frames', () => {
  const { scene } = timbers();
  scene.returnToTrails();
  scene.handleEducationInput({ ...neutral, activityPressed: true });
  const revision = scene.educationOverlay.revision;
  scene.menuTargets[0].action();
  scene.handleEducationInput({ ...neutral, activityPressed: true });
  expect(scene.educationOverlay.revision).toBe(revision + 2);
  expect(scene.menuTargets[0].selected).toBe(true);
  scene.handleEducationInput({ ...neutral, pausePressed: true });
  expect(scene.educationOverlay.open).toBe(false);
});

it('opens a small session sticker collection from the map by pointer or activity input without changing selection or rewards', () => {
  const { scene } = timbers();
  scene.returnToTrails();
  const selected = scene.selectedLevelName;
  expect(scene.menuTargets.filter(target => LEVELS.some(level => level.name === target.label))).toHaveLength(6);
  scene.menuTargets.find(target => target.label === 'Open stickers')!.action();
  expect(scene.educationOverlay.description).toContain('0/1 stickers');
  expect(scene.menuTargets.map(target => target.label)).toEqual(['Return to map']);
  scene.handleEducationInput({ ...neutral, pausePressed: true });
  for (const letter of LETTER_PICKUPS) scene.education.collect(letter.id);
  LETTER_PICKUPS.forEach((pickup, slot) => scene.education.place(pickup.id, slot));
  scene.handleEducationInput({ ...neutral, activityPressed: true, source: 'controller' });
  expect(scene.educationOverlay.description).toContain('1/1 stickers');
  expect(scene.educationOverlay.description).toContain('Timbers TREE: earned');
  scene.menuTargets[0].action();
  expect(scene.screenState).toBe('title');
  expect(scene.selectedLevelName).toBe(selected);
  expect(scene.education.stickers).toHaveLength(1);
});

it('opens optional manual assembly at finish and accepts select/place through native targets and controller input', () => {
  const { scene, live } = timbers();
  for (const pickup of LETTER_PICKUPS) scene.education.collect(pickup.id);
  live.player.x = TREETOP_TIMBERS.finish.x;
  scene.update(1 / 60, neutral);
  expect(scene.screenState).toBe('finish');
  expect(scene.educationOverlay.open).toBe(true);
  expect(scene.educationOverlay.description).toContain('Build TREE');
  const snapshot = JSON.stringify(scene);
  scene.update(9, { ...neutral, horizontal: 1, jumpHeld: true });
  expect(JSON.stringify(scene)).toBe(snapshot);
  expect(scene.education.stickers).toEqual([]);
  expect(scene.menuTargets.filter(target => target.label.startsWith('Letter ')).map(target => target.label)).toEqual(['Letter E 2', 'Letter R', 'Letter T', 'Letter E 1']);
  for (const [slot, name] of ['T', 'R', 'E 2', 'E 1'].entries()) {
    scene.menuTargets.find(target => target.label === `Letter ${name}`)!.action();
    const target = scene.menuTargets.find(target => target.label.startsWith(`Space ${slot + 1}:`))!;
    if (slot === 0) {
      target.focus!();
      scene.handleEducationInput(neutral);
      scene.handleEducationInput({ ...neutral, source: 'controller', jumpPressed: true });
    } else target.action();
  }
  expect(scene.education.stickers).toEqual(['Timbers TREE']);
  scene.menuTargets.find(target => target.label === 'Leave activity')!.action();
  expect(scene.educationOverlay.open).toBe(false);
  expect(scene.menuTargets.map(target => target.label)).toEqual(['Replay', 'Next trail', 'Choose trail']);
});

it('returns missing-letter play beside finish in the identical completed run and rearms only after leaving', () => {
  const { scene, live } = timbers();
  scene.education.collect(LETTER_PICKUPS[0].id);
  scene.education.place(LETTER_PICKUPS[0].id, 0);
  live.run.collectedGems.add('retained-gem');
  live.run.collectedSpecials.add('retained-star');
  live.player.x = TREETOP_TIMBERS.finish.x;
  scene.update(1 / 60, neutral);
  const run = live.run, before = JSON.stringify(run);
  expect(scene.session.results.has('timbers')).toBe(true);
  scene.menuTargets.find(target => target.label === 'Find more letters')!.action();
  expect(scene.educationOverlay.open).toBe(false);
  expect(scene.screenState).toBe('playing');
  expect(live.run).toBe(run);
  expect(JSON.stringify(run)).toBe(before);
  expect(Math.abs(scene.playerX - TREETOP_TIMBERS.finish.x)).toBeLessThan(40);
  expect(scene.education.wordProgress).toBe('T _ _ _');
  for (let frame = 0; frame < 50; frame++) scene.update(1 / 60, { ...neutral, horizontal: 1 });
  expect(scene.educationOverlay.open).toBe(false);
  for (let frame = 0; frame < 150 && scene.playerX >= TREETOP_TIMBERS.finish.x - 100; frame++) scene.update(1 / 60, { ...neutral, horizontal: -1 });
  expect(scene.playerX).toBeLessThan(TREETOP_TIMBERS.finish.x - 100);
  for (let frame = 0; frame < 150 && scene.screenState === 'playing'; frame++) scene.update(1 / 60, { ...neutral, horizontal: 1 });
  expect(scene.educationOverlay.open).toBe(true);
  expect(scene.screenState).toBe('finish');
  expect(live.run).toBe(run);
  expect(scene.session.results.has('timbers')).toBe(true);
});
