/** Moved optionalgem world3240/242 relative to bay2 world3140/260, using shipped drawGem rounding. */
export function bay2GemOrigin(rock: readonly number[]): readonly number[] {
  return [Math.round(rock[0] + 100) - 16, Math.round(rock[1] - 18) - 24];
}
