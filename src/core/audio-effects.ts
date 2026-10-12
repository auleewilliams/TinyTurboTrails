import type { SoundEffect } from './audio';

export type Tone = readonly [frequency: number, duration: number, type: OscillatorType, endFrequency?: number];
export interface EffectScore { readonly tones: readonly Tone[]; readonly volume: number }

/** Original oscillator scores, also used by the offline listening samples. */
export const EFFECTS: Readonly<Record<SoundEffect, EffectScore>> = {
  footstep: { tones: [[180, 0.035, 'triangle', 70]], volume: 0.045 },
  landing: { tones: [[110, 0.095, 'sine', 45]], volume: 0.075 },
  jump: { tones: [[260, 0.12, 'square', 620]], volume: 0.48 },
  gem: { tones: [[1047, 0.07, 'sine'], [1568, 0.13, 'sine']], volume: 0.48 },
  spring: { tones: [[130, 0.22, 'triangle', 1100]], volume: 0.48 },
  damage: { tones: [[170, 0.12, 'sawtooth', 55], [95, 0.13, 'square', 35]], volume: 0.48 },
  checkpoint: { tones: [[523, 0.1, 'triangle'], [659, 0.1, 'triangle'], [784, 0.22, 'triangle']], volume: 0.48 },
  complete: { tones: [[523, 0.1, 'square'], [659, 0.1, 'square'], [784, 0.1, 'square'], [1047, 0.34, 'triangle']], volume: 0.48 },
};
