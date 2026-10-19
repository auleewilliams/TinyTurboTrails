import { expect, it } from 'vitest';
import { EducationSession, LETTER_PICKUPS } from '../src/game/education';
import { AdventureScene } from '../src/game/adventure-scene';
import { SilentAudio } from '../src/core/audio';
import { LEVELS, TREETOP_TIMBERS } from '../src/world/levels';
import { surfaceY, type Player } from '../src/game/movement';
import { damagePlayer, recoverFromFall, type RunState } from '../src/game/interactions';

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
  const rewards = scene.education.stickers;
  recoverFromFall(live.run, live.player, [], TREETOP_TIMBERS);
  live.run.health = 1; live.run.invulnerableSeconds = 0;
  damagePlayer(live.run, live.player, 1, [], TREETOP_TIMBERS);
  expect(scene.education.stickers).toEqual(rewards);
  live.player.x = TREETOP_TIMBERS.finish.x;
  scene.update(1 / 60, neutral);
  scene.activateFinish('Replay');
  expect(scene.education.wordProgress).toBe('T R E E');
  expect(scene.educationDescription).toContain('TREE complete');
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
  scene.handleEducationInput({ ...neutral, activityPressed: true, source: 'controller' });
  expect(scene.educationOverlay.description).toContain('1/1 stickers');
  expect(scene.educationOverlay.description).toContain('Timbers TREE: earned');
  scene.menuTargets[0].action();
  expect(scene.screenState).toBe('title');
  expect(scene.selectedLevelName).toBe(selected);
  expect(scene.education.stickers).toHaveLength(1);
});
