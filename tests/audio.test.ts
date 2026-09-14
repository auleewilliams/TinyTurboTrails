import { afterEach, describe, expect, it, vi } from 'vitest';
import { RetroAudio } from '../src/core/retro-audio';

class Param {
  value = 0;
  setValueAtTime(value: number) { this.value = value; }
  linearRampToValueAtTime(value: number) { this.value = value; }
  exponentialRampToValueAtTime(value: number) { this.value = value; }
}
class Node {
  gain = new Param();
  frequency = new Param();
  type = '';
  onended: (() => void) | null = null;
  stopped = false;
  disconnected = false;
  connect() {}
  disconnect() { this.disconnected = true; }
  start() {}
  stop(time?: number) { if (time === undefined) this.stopped = true; }
}
class Context {
  state = 'suspended';
  currentTime = 0;
  destination = new Node();
  oscillators: Node[] = [];
  resume = vi.fn(async () => { this.state = 'running'; });
  suspend = vi.fn(async () => { this.state = 'suspended'; });
  close = vi.fn(async () => { this.state = 'closed'; });
  createGain() { return new Node(); }
  createOscillator() { const node = new Node(); this.oscillators.push(node); return node; }
}
function setup() {
  const context = new Context();
  const create = vi.fn(() => context as unknown as AudioContext);
  const audio = new RetroAudio(create);
  return { audio, context, create };
}
afterEach(() => vi.useRealTimers());
describe('RetroAudio lifecycle', () => {
  it('does not create audio until an interaction unlocks it', async () => {
    const { audio, context, create } = setup();
    audio.startMusic(); audio.play('jump'); audio.setSuspended(false);
    expect(create).not.toHaveBeenCalled();
    await audio.unlock();
    expect(create).toHaveBeenCalledTimes(1);
    expect(context.oscillators.length).toBeGreaterThan(0);
    audio.dispose();
  });
  it('contains unavailable APIs and rejected browser resume attempts', async () => {
    const audio = new RetroAudio(() => { throw Error('unavailable'); });
    await expect(audio.unlock()).resolves.toBeUndefined();
    expect(() => { audio.startMusic(); audio.play('damage'); audio.stop(); audio.dispose(); }).not.toThrow();
    const retry = setup();
    retry.context.resume.mockRejectedValueOnce(Error('blocked'));
    await retry.audio.unlock();
    retry.audio.play('gem');
    expect(retry.context.oscillators).toHaveLength(0);
    await retry.audio.unlock();
    retry.audio.play('gem');
    expect(retry.context.oscillators.length).toBeGreaterThan(0);
    retry.audio.dispose();
  });
  it('stops all voices when muted and does not play effects until unmuted', async () => {
    const { audio, context } = setup(); await audio.unlock(); audio.play('jump');
    audio.setMuted(true);
    expect(context.oscillators.every(node => node.stopped && node.disconnected)).toBe(true);
    const count = context.oscillators.length;
    audio.play('gem'); expect(context.oscillators).toHaveLength(count);
    audio.setMuted(false); audio.play('gem');
    expect(context.oscillators.length).toBeGreaterThan(count);
    audio.dispose();
  });
  it('bounds simultaneous voices during rapid repeated effects', async () => {
    const { audio, context } = setup(); await audio.unlock();
    for (let i = 0; i < 100; i++) audio.play('complete');
    expect(context.oscillators.filter(node => !node.stopped).length).toBeLessThanOrEqual(24);
    audio.dispose();
    expect(context.oscillators.every(node => node.disconnected)).toBe(true);
  });
  it('clears the music scheduler and all scheduled notes on scene stop', async () => {
    vi.useFakeTimers();
    const { audio, context } = setup(); audio.startMusic(); await audio.unlock();
    audio.stop(); const count = context.oscillators.length;
    context.currentTime += 10; vi.advanceTimersByTime(1000);
    expect(context.oscillators).toHaveLength(count);
    expect(context.oscillators.every(node => node.stopped)).toBe(true);
    audio.startMusic(); expect(context.oscillators.length).toBeGreaterThan(count);
    audio.dispose(); expect(vi.getTimerCount()).toBe(0);
  });
  it('suspends on pause and restores music after resume', async () => {
    const { audio, context } = setup(); audio.startMusic(); await audio.unlock();
    audio.setSuspended(true); await Promise.resolve(); await Promise.resolve();
    expect(context.state).toBe('suspended');
    expect(context.oscillators.every(node => node.stopped)).toBe(true);
    const count = context.oscillators.length;
    audio.play('jump'); expect(context.oscillators).toHaveLength(count);
    audio.setSuspended(false); await audio.unlock();
    expect(context.state).toBe('running');
    expect(context.oscillators.length).toBeGreaterThan(count);
    audio.dispose();
  });
  it('keeps scheduling the looping melody without accumulating expired voices', async () => {
    vi.useFakeTimers();
    const { audio, context } = setup(); audio.startMusic(); await audio.unlock();
    const first = context.oscillators.length;
    for (let i = 0; i < 120; i++) {
      for (const node of context.oscillators) node.onended?.();
      context.currentTime += 0.1;
      vi.advanceTimersByTime(100);
    }
    expect(context.oscillators.length).toBeGreaterThan(first + 40);
    expect(context.oscillators.filter(node => !node.disconnected).length).toBeLessThanOrEqual(3);
    audio.dispose();
  });
  it('does not restart after disposal while unlocking is pending', async () => {
    const { audio, context } = setup();
    let finish!: () => void;
    context.resume.mockImplementation(() => new Promise<void>(resolve => { finish = resolve; }));
    audio.startMusic(); const pending = audio.unlock(); audio.dispose(); finish(); await pending;
    expect(context.oscillators).toHaveLength(0);
    expect(context.close).toHaveBeenCalledTimes(1);
    await audio.unlock(); expect(context.resume).toHaveBeenCalledTimes(1);
  });
});
