export type SoundEffect = 'jump' | 'gem' | 'spring' | 'damage' | 'checkpoint' | 'complete';

/** All methods remain safe if audio is unavailable. */
export interface GameAudio {
  unlock(): Promise<void>;
  setMuted(muted: boolean): void;
  setSuspended(suspended: boolean): void;
  startMusic(): void;
  play(effect: SoundEffect): void;
  stop(): void;
  dispose(): void;
}

export class SilentAudio implements GameAudio {
  async unlock(): Promise<void> {}
  setMuted(_muted: boolean): void {}
  setSuspended(_suspended: boolean): void {}
  startMusic(): void {}
  play(_effect: SoundEffect): void {}
  stop(): void {}
  dispose(): void {}
}
