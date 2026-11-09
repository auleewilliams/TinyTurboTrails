export interface HudFixtureRect { x: number; y: number; width: number; height: number }

/** Positive-area intersection, with no tolerance or one-axis shortcut. */
export function hudFixtureRectanglesOverlap(a: HudFixtureRect, b: HudFixtureRect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x
    && a.y < b.y + b.height && a.y + a.height > b.y;
}
