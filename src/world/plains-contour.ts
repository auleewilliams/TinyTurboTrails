import type { LevelData } from './level';
import type { WorldAssets } from './assets';

export interface PlainsContourColumn {
  x: number;
  surfaceIndex: number;
  contactY: number;
  pixelContactY: number;
  sourceX: number;
}
export interface PlainsContourAssets {
  image: HTMLImageElement;
  soil?: HTMLImageElement;
  ribbon?: { level: LevelData; canvas: HTMLCanvasElement; top: number; bottom: number; soil?: HTMLImageElement };
}

/** Bounded owner-approved prototype, aligned to complete authored segments. */
export function plainsContourRange(level: LevelData): { from: number; to: number } | undefined {
  return level.id === 'plains' ? { from: 580, to: 1060 } : undefined;
}

/** Half-open column ownership: a join column belongs to the segment on its right. */
export function plainsContourColumns(level: LevelData): PlainsContourColumn[] {
  const range = plainsContourRange(level);
  if (!range) return [];
  const columns: PlainsContourColumn[] = [];
  for (let x = range.from; x < range.to; x++) {
    const surfaceIndex = level.surfaces.findIndex(part => x >= part.x1 && x < part.x2);
    if (surfaceIndex < 0) throw new Error('Plains contour preview has a gap');
    const surface = level.surfaces[surfaceIndex];
    const contactY = surface.y1 + (surface.y2 - surface.y1) * (x + 0.5 - surface.x1) / (surface.x2 - surface.x1);
    columns.push({ x, surfaceIndex, contactY, pixelContactY: Math.round(contactY), sourceX: 20 + (x - range.from) % 40 });
  }
  return columns;
}

/** Bend the unchanged designed repeat at native grain, then scroll ONE bitmap.
 * Building integer columns once avoids separately antialiased fractional strips.
 * Optional opaque C replaces the bounded lower body behind exact unchanged A.
 */
export function drawPlainsContourGround(ctx: CanvasRenderingContext2D, assets: WorldAssets,
  level: LevelData, offset: { x: number; y: number }): boolean {
  const range = plainsContourRange(level);
  const kit = assets.plainsContour;
  if (!range || !kit) return false;
  if (kit.image.naturalWidth !== 80 || kit.image.naturalHeight !== 16) throw new Error('Invalid Plains contour image dimensions');
  if (kit.soil && (kit.soil.naturalWidth !== 64 || kit.soil.naturalHeight !== 64)) throw new Error('Invalid Plains contour soil image dimensions');
  const viewportBottom = Math.ceil(offset.y + 240);
  if (!kit.ribbon || kit.ribbon.level !== level || kit.ribbon.soil !== kit.soil || (kit.soil && kit.ribbon.bottom < viewportBottom)) {
    const columns = plainsContourColumns(level);
    const top = Math.min(...columns.map(column => column.pixelContactY)) - 2;
    const grassBottom = Math.max(...columns.map(column => column.pixelContactY)) + 14;
    const bottom = kit.soil ? Math.max(grassBottom, viewportBottom) : grassBottom;
    const canvas = document.createElement('canvas');
    canvas.width = range.to - range.from; canvas.height = bottom - top;
    const paint = canvas.getContext('2d');
    if (!paint) throw new Error('Could not prepare Plains contour canvas');
    paint.imageSmoothingEnabled = false;
    for (const column of columns) {
      if (kit.soil) {
        const sourceX = (column.x - range.from) % 64;
        for (let y = column.pixelContactY + 8; y < bottom; y += 64) {
          const height = Math.min(64, bottom - y);
          paint.drawImage(kit.soil, sourceX, 0, 1, height,
            column.x - range.from, y - top, 1, height);
        }
      }
      paint.drawImage(kit.image, column.sourceX, 0, 1, 16,
        column.x - range.from, column.pixelContactY - 2 - top, 1, 16);
    }
    kit.ribbon = { level, canvas, top, bottom, soil: kit.soil };
  }
  ctx.save();
  try {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(kit.ribbon.canvas, range.from - offset.x, kit.ribbon.top - offset.y);
  } finally { ctx.restore(); }
  return true;
}
