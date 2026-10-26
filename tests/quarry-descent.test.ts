import { QUARRY_DESCENT, QUARRY_RETURN, QUARRY_STARS, type QuarryWaypoint } from './quarry-route';
import { expect, it } from 'vitest';
import { AdventureScene } from '../src/game/adventure-scene';
import { SilentAudio } from '../src/core/audio';
import { type Player } from '../src/game/movement';
import { type RunState } from '../src/game/interactions';
import { LEVELS, QUARRY_RUN } from '../src/world/levels';
import { hasFixedSupport, validateLevel } from '../src/world/level';
import { TRAIL_WORDS } from '../src/game/education';
import { platformBodiesAt, platformSpeed } from '../src/game/platforms';

it('authors four fixed Quarry levels, a continuous floor, three alternating vertical lifts and optional rewards', () => {
  expect(QUARRY_RUN.progressAxis).toBe('y');
  expect(QUARRY_RUN.start.y).toBe(140);
  expect(QUARRY_RUN.finish).toMatchObject({ y: 980, supportOnly: true });
  expect(QUARRY_RUN.checkpoints.map(p => p.y)).toEqual([420, 700, 980]);
  expect(QUARRY_RUN.surfaces).toEqual([{ x1: 0, x2: QUARRY_RUN.width, y1: 980, y2: 980 }]);
  expect(QUARRY_RUN.entities.filter(p => p.kind === 'gem')).toHaveLength(37);
  expect(QUARRY_RUN.entities.filter(p => p.kind === 'special')).toHaveLength(3);
  const lifts = QUARRY_RUN.platforms!.filter(p => platformSpeed(p) > 0);
  expect(lifts.map(p => p.id)).toEqual(['quarry-lift-a', 'quarry-lift-b', 'quarry-lift-c']);
  expect(lifts.map(p => [p.from.y, p.to.y])).toEqual([[140, 420], [420, 700], [700, 980]]);
  for (const lift of lifts) { expect(lift.width).toBe(96); expect(lift.pause).toBe(1.5); expect(lift.from.x).toBe(lift.to.x); }
  expect(lifts[1].from.x).toBeGreaterThan(lifts[0].from.x);
  expect(lifts[2].from.x).toBe(lifts[0].from.x);
  expect(TRAIL_WORDS[1].pickups.map(p => [p.letter, p.supportY])).toEqual([['R',140], ['O',420], ['C',700], ['K',980]]);
  for (const point of [QUARRY_RUN.start, ...QUARRY_RUN.checkpoints, QUARRY_RUN.retrace!]) expect(hasFixedSupport(QUARRY_RUN, point)).toBe(true);
  expect(() => validateLevel(QUARRY_RUN)).not.toThrow();
});

const neutral = { horizontal: 0, jumpPressed: false, jumpHeld: false, pausePressed: false, mutePressed: false };
function createScene() {
  const scene = new AdventureScene({} as never, {} as never, Object.fromEntries(LEVELS.map(l => [l.atlas, {} as never])), new SilentAudio(), QUARRY_RUN);
  scene.startSelected();
  return { scene, live: scene as unknown as { player: Player; run: RunState; events: { type: string }[] } };
}
function drive(scene: AdventureScene, route: QuarryWaypoint[]) {
  const live = scene as unknown as { player: Player; run: RunState; events: { type: string }[] };
  for (const target of route) {
    let elapsed = 0, jumped = false, reached = false;
    for (; elapsed < 900 && scene.screenState === 'playing'; elapsed++) {
      const p = live.player;
      const stop = p.x + Math.sign(p.vx) * p.vx ** 2 / 2400;
      const horizontal = stop < target.x - 3 ? 1 : stop > target.x + 3 ? -1 : 0;
      const jump = Boolean(target.jump && !jumped && p.onGround);
      if (jump) jumped = true;
      scene.update(1 / 60, { ...neutral, horizontal, jumpPressed: jump, jumpHeld: Boolean(target.jump && elapsed < 24) });
      expect(live.events.some(e => e.type === 'recover'), target.tag).toBe(false);
      const dock = target.waitFor;
      const deck = dock && platformBodiesAt(QUARRY_RUN.platforms, live.run.seconds).find(p => p.id === dock.id)!;
      if (Math.abs(p.x - target.x) < 7 && Math.abs(p.y + 34 - target.y) < 1 && p.onGround
        && (!target.jump || elapsed > 24) && (!dock || (Math.abs(deck!.y - dock.y) < 0.1 && deck!.vy === 0))) { reached = true; break; }
    }
    expect(reached, `${target.tag}: x=${live.player.x}, feet=${live.player.y + 34}`).toBe(true);
  }
}
it('descends through every broad terrace with actual inputs, without any letter, star or lift ride', () => {
  const { scene, live } = createScene();
  drive(scene, QUARRY_DESCENT);
  expect(scene.education.letterCount).toBe(0);
  expect(scene.specialTotal).toBe(0);
  expect(live.run.checkpointId).toBe(QUARRY_RUN.checkpoints[2].id);
  for (let i = 0; i < 120 && scene.screenState === 'playing'; i++) scene.update(1 / 60, { ...neutral, horizontal: 1 });
  expect(scene.screenState).toBe('finish');
});

it('retraces from the actual finish action through C, B, A, all missed ROCK letters and stars, then finishes again', () => {
  const { scene, live } = createScene();
  drive(scene, QUARRY_DESCENT);
  for (let i = 0; i < 120 && scene.screenState === 'playing'; i++) scene.update(1 / 60, { ...neutral, horizontal: 1 });
  expect(scene.screenState).toBe('finish');
  expect(scene.education.letterCount).toBe(0);
  const run = live.run;
  scene.activateFinish('Build your word');
  scene.menuTargets.find(t => t.label === 'Find more letters')!.action();
  expect(scene.playerX).toBe(470);
  drive(scene, QUARRY_RETURN);
  expect(scene.education.letterCount).toBe(4);
  expect(live.run.checkpointId).toBe(QUARRY_RUN.checkpoints[0].id);
  expect(scene.session.results.has('quarry')).toBe(true);
  expect(live.run).toBe(run);
  drive(scene, QUARRY_STARS);
  expect(scene.specialTotal).toBe(3);
  for (let i = 0; i < 120 && scene.screenState === 'playing'; i++) scene.update(1 / 60, { ...neutral, horizontal: 1 });
  expect(scene.screenState).toBe('finish');
  expect(scene.education.letterCount).toBe(4);
  expect(live.run).toBe(run);
  scene.activateFinish('Replay');
  expect(scene.playerY + 34).toBe(140);
  expect(scene.education.letterCount).toBe(4);
  expect(scene.specialTotal).toBe(0);
});
