import type { InputSource } from './input';

export type RumbleEffect = 'damage' | 'spring' | 'star';
export interface GameRumble {
  play(effect: RumbleEffect): void;
  stop(): void;
}

interface Pulse { duration: number; strongMagnitude: number; weakMagnitude: number }
interface Actuator {
  playEffect?: (type: 'dual-rumble', parameters: Pulse & { startDelay: number }) => unknown;
  pulse?: (value: number, duration: number) => unknown;
  reset?: () => unknown;
}
type RumblePad = Pick<Gamepad, 'connected' | 'mapping' | 'index'> & {
  vibrationActuator?: Actuator | null;
  hapticActuators?: readonly Actuator[];
};

const EFFECTS: Record<RumbleEffect, readonly Pulse[]> = {
  damage: [{ duration: 100, strongMagnitude: 0.55, weakMagnitude: 0.3 }],
  spring: [
    { duration: 45, strongMagnitude: 0.12, weakMagnitude: 0.22 },
    { duration: 70, strongMagnitude: 0.24, weakMagnitude: 0.45 },
  ],
  star: [{ duration: 45, strongMagnitude: 0.05, weakMagnitude: 0.45 }],
};

/** Browser output only: no simulation state, queue, or storage. */
export class BrowserRumble implements GameRumble {
  private pad: RumblePad | null = null;
  private actuator: Actuator | null = null;
  private active: Actuator | null = null;
  private enabled = true;
  private suspended = false;
  private gameplay = false;
  private nextEffectAt = 0;
  private timer: ReturnType<typeof setTimeout> | undefined;

  setController(pad: RumblePad | null, source: InputSource): void {
    let actuator: Actuator | null = null;
    try {
      if (source === 'controller' && pad?.connected && pad.mapping === 'standard') {
        const candidate = pad.vibrationActuator ?? pad.hapticActuators?.[0];
        if (candidate && (typeof candidate.playEffect === 'function' || typeof candidate.pulse === 'function')) actuator = candidate;
      }
    } catch { /* Unsupported browser properties must be silent. */ }
    if (actuator !== this.actuator || pad?.index !== this.pad?.index) this.stop();
    this.pad = pad;
    this.actuator = actuator;
  }

  setEnabled(enabled: boolean): void { this.enabled = enabled; if (!enabled) this.stop(); }
  setSuspended(suspended: boolean): void { this.suspended = suspended; if (suspended) this.stop(); }
  setGameplay(gameplay: boolean): void { this.gameplay = gameplay; if (!gameplay) this.stop(); }

  private get allowed(): boolean {
    return this.enabled && !this.suspended && this.gameplay && !!this.actuator && !!this.pad?.connected;
  }

  play(effect: RumbleEffect): void {
    const now = performance.now();
    if (!this.allowed || now < this.nextEffectAt) return;
    // Drop repeats, including during catch-up simulation steps. Never extend or queue them.
    this.nextEffectAt = now + 300;
    clearTimeout(this.timer);
    this.timer = undefined;
    const pulses = EFFECTS[effect];
    this.send(pulses[0]);
    if (pulses.length > 1) {
      const timer = setTimeout(() => {
        if (this.timer !== timer) return;
        this.timer = undefined;
        if (this.allowed && performance.now() - now <= 90) this.send(pulses[1]);
      }, pulses[0].duration);
      this.timer = timer;
    }
  }

  private send(pulse: Pulse): void {
    const actuator = this.actuator;
    if (!actuator) return;
    this.active = actuator;
    this.silently(() => typeof actuator.playEffect === 'function'
      ? actuator.playEffect('dual-rumble', { ...pulse, startDelay: 0 })
      : actuator.pulse?.(Math.max(pulse.strongMagnitude, pulse.weakMagnitude), pulse.duration));
  }

  stop(): void {
    clearTimeout(this.timer);
    this.timer = undefined;
    const actuator = this.active;
    this.active = null;
    if (!actuator) return;
    this.silently(() => {
      if (typeof actuator.reset === 'function') return actuator.reset();
      if (typeof actuator.playEffect === 'function') return actuator.playEffect('dual-rumble', { duration: 0, startDelay: 0, strongMagnitude: 0, weakMagnitude: 0 });
      return actuator.pulse?.(0, 0);
    });
  }

  private silently(call: () => unknown): void {
    try { void Promise.resolve(call()).catch(() => {}); } catch { /* No actuator error may interrupt play. */ }
  }
}
