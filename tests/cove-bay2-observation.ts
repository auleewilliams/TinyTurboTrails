/** Low gem world3240/299 relative to bay2 world3140/260, using shipped drawGem rounding. */
export function bay2LowGemOrigin(rock: readonly number[]): readonly number[] {
  return [Math.round(rock[0] + 100) - 16, Math.round(rock[1] + 39) - 24];
}
