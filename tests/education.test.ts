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
