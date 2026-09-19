import { MUSIC, MUSIC_STEPS, musicForLevel, musicNotes, type MusicId } from '../src/core/music';
import { LEVELS } from '../src/world/levels';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RetroAudio } from '../src/core/retro-audio';

class Param {
  value = 0;
  peak = 0;
  setValueAtTime(value: number) { this.value = value; }
  linearRampToValueAtTime(value: number) { this.value = value; this.peak = Math.max(this.peak, value); }
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
  gains: Node[] = [];
  resume = vi.fn(async () => { this.state = 'running'; });
  suspend = vi.fn(async () => { this.state = 'suspended'; });
  close = vi.fn(async () => { this.state = 'closed'; });
  createGain() { const node = new Node(); this.gains.push(node); return node; }
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
  it('keeps worst-case summed amplitude below full scale during an effect burst', async () => {
    const { audio, context } = setup(); await audio.unlock();
    for (let i = 0; i < 100; i++) audio.play('jump');
    const activeGains = context.gains.slice(1).filter(node => !node.disconnected);
    const worstPeak = activeGains.reduce((sum, node) => sum + node.gain.peak, 0) * context.gains[0].gain.value;
    expect(worstPeak).toBeLessThan(1);
    audio.dispose();
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


describe('level scores and scheduling', () => {
  it('covers the registry with distinct melodies, rhythms and instrumentation', () => {
    expect(Object.keys(MUSIC).sort()).toEqual(LEVELS.map(level => level.id).sort());
    expect(new Set(Object.values(MUSIC).map(track => JSON.stringify(track.phrases))).size).toBe(6);
    for (const level of LEVELS) expect(musicForLevel(level.id)).toBe(level.id);
    expect(musicForLevel('unknown')).toBe('plains');
    for (const id of Object.keys(MUSIC) as MusicId[]) {
      expect(MUSIC[id].phrases.every(phrase => phrase.length === 16)).toBe(true);
      for (let step = 0; step < MUSIC_STEPS; step++) {
        const notes = musicNotes(id, step);
        expect(notes.length).toBeLessThanOrEqual(4);
        expect(notes.every(note => note.volume <= 0.25 && note.duration > 0)).toBe(true);
        expect(musicNotes(id, step + MUSIC_STEPS)).toEqual(notes);
      }
    }
  });
  it('switches immediately, retains a repeated selection, and does not catch up after a long stall', async () => {
    vi.useFakeTimers();
    const { audio, context } = setup();
    audio.startMusic('plains'); await audio.unlock();
    const old = [...context.oscillators];
    audio.startMusic('frost');
    expect(old.every(node => node.stopped)).toBe(true);
    const count = context.oscillators.length;
    audio.startMusic('frost');
    expect(context.oscillators).toHaveLength(count);
    context.currentTime += 300;
    vi.advanceTimersByTime(75);
    expect(context.oscillators.length - count).toBeLessThanOrEqual(4);
    expect(vi.getTimerCount()).toBe(1);
    audio.stop(); audio.startMusic('frost');
    expect(context.oscillators.at(-2)?.frequency.value).toBeCloseTo(440 * 2 ** ((86 - 69) / 12));
    audio.dispose();
    expect(vi.getTimerCount()).toBe(0);
  });
  it('bounds resources across three full loops of every score and repeated muted switches', async () => {
    vi.useFakeTimers();
    const { audio, context } = setup(); await audio.unlock();
    for (const id of Object.keys(MUSIC) as MusicId[]) {
      audio.setMuted(true); audio.startMusic(id); audio.setMuted(false);
      const seconds = 60 / MUSIC[id].bpm / 2;
      for (let step = 0; step < MUSIC_STEPS * 3; step++) {
        for (const node of context.oscillators) node.onended?.();
        context.currentTime += seconds;
        vi.advanceTimersByTime(75);
        expect(context.oscillators.filter(node => !node.disconnected).length).toBeLessThanOrEqual(4);
      }
      expect(vi.getTimerCount()).toBe(1);
    }
    audio.dispose();
    expect(context.oscillators.every(node => node.disconnected)).toBe(true);
  });
});
