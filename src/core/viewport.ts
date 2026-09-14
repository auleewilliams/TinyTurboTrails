export const LOGICAL_WIDTH = 426;
export const LOGICAL_HEIGHT = 240;

export function fitViewport(width: number, height: number): { width: number; height: number } {
  const fit = Math.max(0, Math.min(width / LOGICAL_WIDTH, height / LOGICAL_HEIGHT));
  // Whole logical pixels at desktop sizes; shrink only when one-times cannot fit.
  const scale = fit >= 1 ? Math.floor(fit) : fit;
  return { width: LOGICAL_WIDTH * scale, height: LOGICAL_HEIGHT * scale };
}
