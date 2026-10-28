import type { LevelData } from './level';

/** World-anchored cues share the exact movement segment, never the camera's pixel grid. */
export function drawSurfaceMaterials(ctx: CanvasRenderingContext2D, level: LevelData,
  offset: { x: number; y: number }): void {
  for (const surface of level.surfaces) {
    const material = surface.material;
    if (!material || surface.x2 < offset.x || surface.x1 > offset.x + 426) continue;
    const yAt = (x: number): number => surface.y1 + (surface.y2 - surface.y1)
      * (x - surface.x1) / (surface.x2 - surface.x1) - offset.y;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(surface.x1 - offset.x, surface.y1 - offset.y);
    ctx.lineTo(surface.x2 - offset.x, surface.y2 - offset.y);
    ctx.lineTo(surface.x2 - offset.x, surface.y2 - offset.y + 8);
    ctx.lineTo(surface.x1 - offset.x, surface.y1 - offset.y + 8);
    ctx.closePath();
    ctx.fillStyle = material === 'ice' ? '#59c9e8' : material === 'sand' ? '#d5a34f' : '#298fab';
    ctx.fill();
    ctx.clip();
    ctx.fillStyle = material === 'sand' ? '#825b31' : '#e9fcff';
    const spacing = material === 'sand' ? 12 : 24;
    const start = Math.floor(Math.max(surface.x1, offset.x) / spacing) * spacing;
    for (let x = start; x < Math.min(surface.x2, offset.x + 426); x += spacing) {
      const y = yAt(x);
      if (material === 'ice') {
        ctx.fillRect(x - offset.x, y + 3, 7, 1);
        ctx.fillRect(x + 3 - offset.x, y + 1, 1, 5);
      } else if (material === 'sand') {
        ctx.fillRect(x - offset.x, y + 2, 2, 2);
        ctx.fillRect(x + 6 - offset.x, y + 5, 2, 2);
      } else {
        ctx.fillRect(x - offset.x, y + 3, 8, 1);
        ctx.fillRect(x + 8 - offset.x, y + 2, 4, 1);
        ctx.fillRect(x + 12 - offset.x, y + 3, 8, 1);
      }
    }
    ctx.restore();
  }
}
