export interface AnimationClip {
  frames: readonly number[];
  frameSeconds: number;
  loop: boolean;
}

/** Clips are validated when loading the local asset manifest. */
export function animationFrame(clip: AnimationClip, seconds: number): number {
  const frame = Math.floor(Math.max(0, seconds) / clip.frameSeconds);
  return clip.frames[clip.loop ? frame % clip.frames.length : Math.min(frame, clip.frames.length - 1)];
}
