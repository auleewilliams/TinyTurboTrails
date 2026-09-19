import { MUSIC, MUSIC_STEPS, musicNotes, type MusicId } from './music';
import type { GameAudio, SoundEffect } from './audio';

type Tone = readonly [frequency: number, duration: number, type: OscillatorType, endFrequency?: number];
const EFFECTS: Record<SoundEffect, readonly Tone[]> = {
  jump: [[260, 0.12, 'square', 620]],
  gem: [[1047, 0.07, 'sine'], [1568, 0.13, 'sine']],
  spring: [[130, 0.22, 'triangle', 1100]],
  damage: [[170, 0.12, 'sawtooth', 55], [95, 0.13, 'square', 35]],
  checkpoint: [[523, 0.1, 'triangle'], [659, 0.1, 'triangle'], [784, 0.22, 'triangle']],
  complete: [[523, 0.1, 'square'], [659, 0.1, 'square'], [784, 0.1, 'square'], [1047, 0.34, 'triangle']],
};
const VOICE_LIMIT = 24;
// 24 simultaneous voices × 0.48 maximum voice gain × 0.075 = 0.864 peak.
const MASTER_GAIN = 0.075;
const frequency = (midi: number): number => 440 * 2 ** ((midi - 69) / 12);

function browserContext(): AudioContext {
  const host = globalThis as typeof globalThis & { webkitAudioContext?: typeof AudioContext };
  const Constructor = host.AudioContext ?? host.webkitAudioContext;
  if (!Constructor) throw new Error('Web Audio unavailable');
  return new Constructor();
}

/** Locally synthesized audio. Call unlock directly inside a user interaction. */
export class RetroAudio implements GameAudio {
  private context?: AudioContext;
  private master?: GainNode;
  private voices = new Map<OscillatorNode, GainNode>();
  private timer?: ReturnType<typeof setInterval>;
  private unlocked = false;
  private muted = false;
  private suspended = false;
  private disposed = false;
  private musicWanted = false;
  private track: MusicId = 'plains';
  private step = 0;
  private nextNote = 0;
  private pendingUnlock?: Promise<void>;

  constructor(private readonly createContext: () => AudioContext = browserContext) {}

  unlock(): Promise<void> {
    if (this.disposed) return Promise.resolve();
    if (this.pendingUnlock) return this.pendingUnlock;
    try {
      if (!this.context) {
        this.context = this.createContext();
        this.master = this.context.createGain();
        this.master.gain.value = this.muted || this.suspended ? 0 : MASTER_GAIN;
        this.master.connect(this.context.destination);
      }
      // Invoke resume synchronously so the browser can associate it with the gesture.
      this.pendingUnlock = this.context.resume().then(() => {
        if (this.disposed) return;
        this.unlocked = this.context?.state === 'running';
        if (this.suspended) this.suspendContext();
        else this.scheduleMusic();
      }).catch(() => { this.unlocked = false; }).finally(() => { this.pendingUnlock = undefined; });
      return this.pendingUnlock;
    } catch {
      return Promise.resolve();
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    this.updateGain();
    if (muted) this.clearPlayback();
    else this.scheduleMusic();
  }

  setSuspended(suspended: boolean): void {
    if (this.suspended === suspended || this.disposed) return;
    this.suspended = suspended;
    this.updateGain();
    if (suspended) {
      this.clearPlayback();
      this.suspendContext();
    } else if (this.unlocked) {
      // Reconcile again after any in-flight suspend; focus changes may race.
      void this.context?.resume().then(() => {
        if (this.disposed) return;
        if (this.suspended) this.suspendContext();
        else this.scheduleMusic();
      }).catch(() => {});
    }
  }

  private suspendContext(): void {
    try {
      void this.context?.suspend().then(() => {
        if (!this.suspended && !this.disposed && this.unlocked) void this.unlock();
      }).catch(() => {});
    } catch { /* Audio may have been closed by the browser. */ }
  }

  private updateGain(): void {
    if (this.master) this.master.gain.value = this.muted || this.suspended ? 0 : MASTER_GAIN;
  }

  private get audible(): boolean {
    return !this.disposed && this.unlocked && !this.muted && !this.suspended && this.context?.state === 'running';
  }

  startMusic(track: MusicId = 'plains'): void {
    if (this.disposed) return;
    if (track !== this.track) {
      this.stop();
      this.track = track;
    }
    this.musicWanted = true;
    this.scheduleMusic();
  }

  private scheduleMusic(): void {
    if (!this.audible || !this.musicWanted || this.timer !== undefined) return;
    this.nextNote = this.context!.currentTime + 0.015;
    this.tick();
    this.timer = setInterval(() => this.tick(), 75);
  }

  private tick(): void {
    if (!this.audible || !this.context) return;
    const now = this.context.currentTime;
    // Never catch up a backlog following a throttled tab or blocked main thread.
    if (this.nextNote < now) this.nextNote = now + 0.015;
    while (this.nextNote < now + 0.16) {
      for (const note of musicNotes(this.track, this.step)) {
        this.tone([frequency(note.midi), note.duration, note.type,
          note.endMidi === undefined ? undefined : frequency(note.endMidi)], this.nextNote, note.volume);
      }
      this.step = (this.step + 1) % MUSIC_STEPS;
      this.nextNote += 60 / MUSIC[this.track].bpm / 2;
    }
  }

  play(effect: SoundEffect): void {
    if (!this.audible || !this.context) return;
    let when = this.context.currentTime + 0.005;
    for (const tone of EFFECTS[effect]) {
      this.tone(tone, when, 0.48);
      when += tone[1];
    }
  }

  private tone([hz, duration, type, endHz]: Tone, when: number, volume: number): void {
    if (!this.context || !this.master) return;
    while (this.voices.size >= VOICE_LIMIT) this.release(this.voices.keys().next().value!);
    let oscillator: OscillatorNode | undefined;
    let gain: GainNode | undefined;
    try {
      oscillator = this.context.createOscillator();
      gain = this.context.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(hz, when);
      if (endHz) oscillator.frequency.exponentialRampToValueAtTime(endHz, when + duration);
      gain.gain.setValueAtTime(0, when);
      gain.gain.linearRampToValueAtTime(volume, when + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.001, when + duration);
      gain.gain.linearRampToValueAtTime(0, when + duration + 0.009);
      oscillator.connect(gain);
      gain.connect(this.master);
      const voice = oscillator;
      oscillator.onended = () => this.release(voice);
      this.voices.set(oscillator, gain);
      oscillator.start(when);
      oscillator.stop(when + duration + 0.01);
    } catch {
      if (oscillator) this.release(oscillator);
      gain?.disconnect();
    }
  }

  private release(oscillator: OscillatorNode): void {
    oscillator.onended = null;
    try { oscillator.stop(); } catch { /* Already ended. */ }
    oscillator.disconnect();
    this.voices.get(oscillator)?.disconnect();
    this.voices.delete(oscillator);
  }

  private clearPlayback(): void {
    if (this.timer !== undefined) clearInterval(this.timer);
    this.timer = undefined;
    for (const oscillator of this.voices.keys()) this.release(oscillator);
  }

  stop(): void {
    this.musicWanted = false;
    this.clearPlayback();
    this.step = 0;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.stop();
    this.master?.disconnect();
    try { void this.context?.close().catch(() => {}); } catch { /* Already closed. */ }
  }
}
