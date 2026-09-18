import type { PlatformBody } from './movement';

/** Slab thickness in pixels. Only the top face is solid, so a jump passes through from below. */
export const PLATFORM_HEIGHT = 10;
/** Platforms stay far below Henry's 220 px/s run so a six-year-old can read and time one. */
export const PLATFORM_MAX_SPEED = 90;

export interface MovingPlatform {
  id: string;
  /** Top-left corner of the slab at each end of the path. */
  from: { x: number; y: number };
  to: { x: number; y: number };
  width: number;
  /** One-way travel time in seconds. */
  seconds: number;
  /** Seconds parked at each end, so stepping aboard is never a timing puzzle. */
  pause?: number;
  /** Fraction of the full cycle already elapsed when the run starts. */
  offset?: number;
}

export function platformDistance(platform: MovingPlatform): number {
  return Math.hypot(platform.to.x - platform.from.x, platform.to.y - platform.from.y);
}

export function platformSpeed(platform: MovingPlatform): number {
  return platform.seconds > 0 ? platformDistance(platform) / platform.seconds : Infinity;
}

export function platformCycleSeconds(platform: MovingPlatform): number {
  return 2 * (platform.seconds + (platform.pause ?? 0));
}

/**
 * Progress along the path at a run time: a triangle wave that dwells at both ends.
 * Motion is a pure function of run seconds, so the simulation stays deterministic
 * and a platform never drifts after a pause, a checkpoint recovery or a replay.
 */
export function platformPhase(platform: MovingPlatform, seconds: number): { progress: number; direction: -1 | 0 | 1 } {
  if (!(platform.seconds > 0)) return { progress: 0, direction: 0 };
  const pause = Math.max(0, platform.pause ?? 0);
  const cycle = platformCycleSeconds(platform);
  const phase = (((seconds + (platform.offset ?? 0) * cycle) % cycle) + cycle) % cycle;
  if (phase < pause) return { progress: 0, direction: 0 };
  if (phase < pause + platform.seconds) return { progress: (phase - pause) / platform.seconds, direction: 1 };
  if (phase < 2 * pause + platform.seconds) return { progress: 1, direction: 0 };
  return { progress: 1 - (phase - 2 * pause - platform.seconds) / platform.seconds, direction: -1 };
}

export function platformBodyAt(platform: MovingPlatform, seconds: number): PlatformBody {
  const { progress, direction } = platformPhase(platform, seconds);
  const dx = platform.to.x - platform.from.x;
  const dy = platform.to.y - platform.from.y;
  const rate = platform.seconds > 0 ? direction / platform.seconds : 0;
  return {
    id: platform.id,
    x: platform.from.x + dx * progress,
    y: platform.from.y + dy * progress,
    width: platform.width,
    height: PLATFORM_HEIGHT,
    vx: dx * rate,
    vy: dy * rate,
  };
}

/**
 * Platform bodies for one moment of a run; scenes hand these to movement and the renderer.
 * Given the step just taken, each body reports the velocity it actually travelled at over
 * that step rather than its instantaneous one: at a turnaround the two disagree, and a rider
 * carried by the instantaneous velocity would be left behind by the slab.
 */
export function platformBodiesAt(platforms: readonly MovingPlatform[] | undefined, seconds: number,
  stepSeconds = 0): PlatformBody[] {
  return (platforms ?? []).map((platform) => {
    const body = platformBodyAt(platform, seconds);
    if (stepSeconds <= 0) return body;
    const previous = platformBodyAt(platform, seconds - stepSeconds);
    return { ...body, vx: (body.x - previous.x) / stepSeconds, vy: (body.y - previous.y) / stepSeconds };
  });
}
