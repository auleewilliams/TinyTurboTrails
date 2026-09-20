import { animationFrame } from '../art/animation';
import type { HenryManifest } from '../art/henry';

/** Presentation only. The scene's fixed updates already stop for pause/focus loss. */
export class CompletionCelebration {
  seconds = 0;
  reset(): void { this.seconds = 0; }
  update(seconds: number): void { this.seconds = Math.min(2, this.seconds + Math.max(0, seconds)); }
  frame(manifest: HenryManifest, reduced: boolean): number {
    const clip = manifest.animations.celebrate;
    return reduced ? clip.frames[clip.frames.length - 1] : animationFrame(clip, this.seconds);
  }
}

export function celebrationJump(seconds: number, reduced = false): number {
  if (reduced || seconds < 0.3 || seconds >= 0.75) return 0;
  return -Math.round(Math.sin((seconds - 0.3) / 0.45 * Math.PI) * 8);
}

export interface Sparkle { x: number; y: number; size: number }
export function celebrationSparkles(seconds: number, reduced = false): Sparkle[] {
  if (!reduced && (seconds < 0.45 || seconds >= 1.8)) return [];
  const t = reduced ? 0.5 : (seconds - 0.45) / 1.35;
  return [[-32, -28], [31, -34], [-39, -8], [40, -12], [18, -47]].map(([x, y]) => ({
    x: 280 + x + (reduced ? 0 : Math.round(x * t * 0.12)),
    y: 147 + y + (reduced ? 0 : Math.round(t * 9)),
    size: !reduced && t > 0.7 ? 2 : 4,
  }));
}
