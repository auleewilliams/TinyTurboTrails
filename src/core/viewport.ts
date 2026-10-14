export const LOGICAL_WIDTH = 426;
export const LOGICAL_HEIGHT = 240;

export interface ViewportSize { width: number; height: number }
export interface GameViewport extends ViewportSize { left: number; top: number }

export function fitViewport(width: number, height: number): ViewportSize {
  // Uniform fractional fit preserves the full camera and the artwork's proportions.
  const scale = Math.max(0, Math.min(width / LOGICAL_WIDTH, height / LOGICAL_HEIGHT));
  return { width: LOGICAL_WIDTH * scale, height: LOGICAL_HEIGHT * scale };
}

/** Reuse letterboxing for the bottom-right controls before reserving any space. */
export function fitGameViewport(width: number, height: number, controls: ViewportSize): GameViewport {
  const railHeight = controls.height + 8; // Four pixels above and below the buttons.
  const railWidth = controls.width + 16; // Eight pixels either side.
  let size = fitViewport(width, height);
  let left = (width - size.width) / 2;
  let top = (height - size.height) / 2;
  if (height - size.height >= railHeight) {
    top = Math.min(top, height - railHeight - size.height);
  } else if (width - size.width >= railWidth) {
    left = Math.min(left, width - railWidth - size.width);
  } else {
    // No empty corner can hold the controls: choose the larger of two safe fits.
    const below = fitViewport(width, Math.max(0, height - railHeight));
    const beside = fitViewport(Math.max(0, width - railWidth), height);
    if (below.width >= beside.width) {
      size = below;
      left = (width - size.width) / 2;
      top = Math.max(0, (height - railHeight - size.height) / 2);
    } else {
      size = beside;
      left = Math.max(0, (width - railWidth - size.width) / 2);
      top = (height - size.height) / 2;
    }
  }
  return { ...size, left, top };
}
