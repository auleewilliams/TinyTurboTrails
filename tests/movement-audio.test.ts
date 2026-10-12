import { describe, expect, it, vi } from 'vitest';
import { SilentAudio } from '../src/core/audio';
import { SimulationClock } from '../src/core/clock';
import { AdventureScene } from '../src/game/adventure-scene';
import { FootstepCadence } from '../src/game/movement-audio';
import { createPlayer, DEFAULT_MOVEMENT, type Player } from '../src/game/movement';
import type { Feedback } from '../src/game/feedback';
import { LEVELS } from '../src/world/levels';
import type { LevelData } from '../src/world/level';

const neutral = { horizontal: 0, jumpHeld: false, jumpPressed: false, pausePressed: false, mutePressed: false };
const worlds = Object.fromEntries(LEVELS.map(level => [level.atlas, {} as never]));
function setup() {
  const audio = new SilentAudio();
  const play = vi.spyOn(audio, 'play');
  const scene = new AdventureScene({} as HTMLImageElement, {} as never, worlds, audio, LEVELS[0]);
  scene.startSelected();
  const live = scene as unknown as { player: Player; feedback: Feedback; level: LevelData };
  return { scene, play, live, player: live.player, feedback: live.feedback };
}

describe('footstep cadence', () => {
  it('tracks distance at walking and running speeds in either direction, independently of update rate', () => {
    const count = (speed: number, hz: number) => {
      const cadence = new FootstepCadence();
      const player = createPlayer(80, LEVELS[0]); player.vx = speed;
      let steps = 0;
      for (let frame = 0; frame < hz * 6; frame++) {
        const x = player.x; player.x += speed / hz;
        if (cadence.step(1 / hz, player, x)) steps++;
      }
      return steps;
    };
    for (const hz of [30, 60, 120]) {
      expect(count(80, hz)).toBe(10);
      expect(count(220, hz)).toBe(27);
      expect(count(-220, hz)).toBe(27);
    }
  });

  it('drops partial strides on jump, idle, wall contact and reset without mutating the player', () => {
    const cadence = new FootstepCadence();
    const player = createPlayer(80, LEVELS[0]); player.vx = 220;
    const step = () => { const x = player.x; player.x += 22; return cadence.step(0.1, player, x); };
    for (const interrupt of ['jump', 'idle', 'wall', 'reset']) {
      cadence.reset(); player.onGround = true; player.vx = 220;
      expect(step()).toBe(false); expect(step()).toBe(false);
      if (interrupt === 'reset') cadence.reset();
      else {
        player.onGround = interrupt !== 'jump'; player.vx = interrupt === 'idle' ? 0 : 220;
        const before = { ...player };
        expect(cadence.step(0.1, player, player.x)).toBe(false);
        expect(player).toEqual(before);
      }
      player.onGround = true; player.vx = 220;
      expect(step()).toBe(false);
    }
  });

  it('does not count a stationary rider carried by a moving platform or catch up a stalled frame', () => {
    const cadence = new FootstepCadence();
    const player = createPlayer(80, LEVELS[0]);
    player.platformId = 'ferry'; player.groundVelocityX = 100; player.x += 50;
    expect(cadence.step(0.1, player, player.x - 50)).toBe(false);
    player.vx = 220; player.x += 22;
    expect(cadence.step(10, player, player.x - 22)).toBe(false);
  });

  it('counts walking relative to a platform even when opposing carry cancels world movement', () => {
    for (const carry of [-90, -100]) {
      const cadence = new FootstepCadence();
      const player = createPlayer(80, LEVELS[0]);
      player.platformId = 'ferry'; player.groundVelocityX = carry; player.vx = 100;
      let steps = 0;
      for (let i = 0; i < 60; i++) {
        const previousX = player.x; player.x += (100 + carry) * 0.1;
        if (cadence.step(0.1, player, previousX)) steps++;
      }
      expect(steps).toBe(12);
    }
  });
});

describe('adventure movement sounds', () => {
  it.each([180, 181, 400])('pairs a single landing with the existing dust threshold at %i px/s', velocity => {
    const { scene, player, play, feedback } = setup();
    player.x = 100; player.y = LEVELS[0].start.y - DEFAULT_MOVEMENT.height - 1;
    player.onGround = false; player.vy = velocity;
    scene.update(1 / 60, neutral);
    expect(play.mock.calls.filter(([effect]) => effect === 'landing')).toHaveLength(velocity > 180 ? 1 : 0);
    expect(feedback.effects.filter(effect => effect.kind === 'landing')).toHaveLength(velocity > 180 ? 1 : 0);
    for (let i = 0; i < 60; i++) scene.update(1 / 60, neutral);
    expect(play.mock.calls.filter(([effect]) => effect === 'landing')).toHaveLength(velocity > 180 ? 1 : 0);
    expect(play.mock.calls.some(([effect]) => effect === 'footstep')).toBe(false);
  });

  it('stops footsteps on jump and fall recovery, and stays silent on title and finish', () => {
    const { scene, player, play, live } = setup();
    for (let i = 0; i < 24; i++) scene.update(1 / 60, { ...neutral, horizontal: 1 });
    expect(play.mock.calls.some(([effect]) => effect === 'footstep')).toBe(true);
    play.mockClear();
    scene.update(1 / 60, { ...neutral, horizontal: 1, jumpPressed: true, jumpHeld: true });
    expect(player.onGround).toBe(false);
    expect(play).toHaveBeenCalledWith('jump');
    for (let i = 0; i < 8; i++) scene.update(1 / 60, neutral);
    expect(play.mock.calls.some(([effect]) => effect === 'footstep')).toBe(false);
    // A pit's terrain lies below the recovery boundary, unlike the continuous Plains ground.
    live.level = { ...LEVELS[0], surfaces: [{ x1: 0, x2: LEVELS[0].width, y1: 10_000, y2: 10_000 }] };
    player.y = LEVELS[0].height + 100; player.vy = 400;
    play.mockClear(); scene.update(1 / 60, neutral);
    expect(player.onGround).toBe(true); expect(play).not.toHaveBeenCalled();
    live.level = LEVELS[0];
    player.x = LEVELS[0].finish.x;
    scene.update(1 / 60, neutral); play.mockClear();
    for (let i = 0; i < 60; i++) scene.update(1 / 60, neutral);
    expect(play).not.toHaveBeenCalled();
    scene.activateFinish('Choose trail');
    for (let i = 0; i < 60; i++) scene.update(1 / 60, neutral);
    expect(play).not.toHaveBeenCalled();
  });

  it('does not advance cadence or replay a backlog while the main simulation clock is paused', () => {
    const { scene, player, play } = setup();
    const clock = new SimulationClock();
    const update = (seconds: number) => scene.update(seconds, { ...neutral, horizontal: 1 });
    clock.advance(0, update); clock.advance(100, update);
    const before = { ...player }; const count = play.mock.calls.length;
    clock.setPaused(true); clock.advance(10_000, update);
    expect(player).toEqual(before); expect(play).toHaveBeenCalledTimes(count);
    clock.setPaused(false); clock.advance(10_100, update);
    expect(player).toEqual(before); expect(play).toHaveBeenCalledTimes(count);
    clock.advance(10_117, update);
    expect(play.mock.calls.length - count).toBeLessThanOrEqual(1);
  });
});
