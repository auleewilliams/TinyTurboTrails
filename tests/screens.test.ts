import { describe, expect, it } from 'vitest';
import { AdventureScene } from '../src/game/adventure-scene';
import type { GameAudio } from '../src/core/audio';
import { PLAINS_LEVEL } from '../src/world/level';
import { ScreenController } from '../src/game/screens';

describe('game screen flow', () => {
  it('plays the completion effect once when the adventure reaches the finish', () => {
    const effects: string[] = [];
    const audio: GameAudio = {
      unlock: async () => {}, setMuted: () => {}, setSuspended: () => {}, startMusic: () => {},
      play: (effect) => effects.push(effect), stop: () => {}, dispose: () => {},
    };
    const scene = new AdventureScene({} as never, {} as never, audio);
    scene.enter();
    scene.update(1 / 60, { horizontal: 0, jumpHeld: false, jumpPressed: true, pausePressed: false, mutePressed: false });
    scene.update(1 / 60, { horizontal: 0, jumpHeld: true, jumpPressed: true, pausePressed: false, mutePressed: false });
    expect(effects.filter((effect) => effect === 'jump')).toHaveLength(1);
    (scene as unknown as { player: { x: number } }).player.x = PLAINS_LEVEL.finish.x;
    scene.update(1 / 60, { horizontal: 0, jumpHeld: false, jumpPressed: false, pausePressed: false, mutePressed: false });
    scene.update(1 / 60, { horizontal: 0, jumpHeld: false, jumpPressed: false, pausePressed: false, mutePressed: false });
    expect(effects.filter((effect) => effect === 'complete')).toHaveLength(1);
  });

  it('moves title through loading and gameplay, then finish and replay', () => {
    const screens = new ScreenController();
    expect(screens.state).toBe('title');
    screens.start();
    expect(screens.state).toBe('loading');
    screens.loaded();
    expect(screens.state).toBe('playing');
    screens.pause();
    expect(screens.state).toBe('paused');
    screens.resume();
    screens.complete(7);
    expect(screens.state).toBe('finish');
    expect(screens.gems).toBe(7);
    screens.replay();
    expect(screens.state).toBe('title');
  });
  it('keeps loading errors readable and retryable', () => {
    const screens = new ScreenController();
    screens.start();
    screens.fail('Atlas missing');
    expect(screens.state).toBe('error');
    expect(screens.error).toBe('Atlas missing');
    screens.retry();
    expect(screens.state).toBe('loading');
  });
  it('does not advance simulation while paused or on non-gameplay screens', () => {
    const screens = new ScreenController();
    let updates = 0;
    screens.update(() => updates++);
    screens.start(); screens.loaded(); screens.update(() => updates++);
    screens.pause(); screens.update(() => updates++);
    screens.resume(); screens.update(() => updates++);
    screens.complete(0); screens.update(() => updates++);
    expect(updates).toBe(2);
  });
});
