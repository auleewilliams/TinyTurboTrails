import { describe, expect, it } from 'vitest';
import { ScreenController } from '../src/game/screens';

describe('game screen flow', () => {
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
