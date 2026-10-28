import type { PlatformBody } from '../game/movement';
import type { LevelData } from './level';

export interface CovePiece { x: number; y: number; width: number; height: number }
export interface CoveTerrainManifest { version: number; image: string; width: number; height: number; pieces: Record<string, CovePiece> }
export interface CoveTerrainAssets { image: HTMLImageElement; manifest: CoveTerrainManifest }

/** Exact native dimensions are a presentation contract, independent of collision bodies. */
export function validateCoveTerrain(value: unknown): asserts value is CoveTerrainManifest {
  const data = value as CoveTerrainManifest;
  if (!data || data.version !== 1 || data.image !== 'atlas.png' || data.width !== 256 || data.height !== 128 || !data.pieces) {
    throw new Error('Invalid Cove terrain metadata');
  }
  const sizes: Record<string, [number, number]> = {
    'sand-lip': [64, 16], 'wet-sand-lip': [64, 8], 'sand-fill': [64, 64],
    'cliff-left': [16, 64], 'cliff-right': [16, 64],
    'flat-to-up': [16, 16], 'up-to-flat': [16, 16], 'flat-to-down': [16, 16], 'down-to-flat': [16, 16],
    'stone-thin-left': [16, 6], 'stone-thin-repeat': [32, 6], 'stone-thin-right': [16, 6],
    'stone-regular-left': [16, 12], 'stone-regular-repeat': [32, 12], 'stone-regular-right': [16, 12], 'stone-regular-repeat-alt': [32, 12],
  };
  const occupied = new Set<number>();
  for (const [name, [width, height]] of Object.entries(sizes)) {
    const p = data.pieces[name];
    if (!p || ![p.x, p.y, p.width, p.height].every(Number.isInteger) || p.x < 0 || p.y < 0
      || p.width !== width || p.height !== height || p.x + width > data.width || p.y + height > data.height) {
      throw new Error(`Invalid Cove terrain piece: ${name}`);
    }
    for (let y = p.y; y < p.y + height; y++) for (let x = p.x; x < p.x + width; x++) {
      const index = y * data.width + x;
      if (occupied.has(index)) throw new Error('Overlapping Cove terrain pieces');
      occupied.add(index);
    }
  }
}

/** Required when declared. No rejected promise is cached, so ordinary Retry can recover. */
export async function loadCoveTerrain(base: string, path?: string): Promise<CoveTerrainAssets | undefined> {
  if (path === undefined) return undefined;
  if (path !== 'terrain-kit/manifest.json') throw new Error('Invalid Cove terrain declaration');
  const response = await fetch(`${base}${path}`);
  if (!response.ok) throw new Error('Could not load Cove terrain metadata');
  const manifest: unknown = await response.json();
  validateCoveTerrain(manifest);
  const image = new Image();
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error('Could not load Cove terrain image'));
    image.src = `${base}terrain-kit/${manifest.image}`;
  });
  if (image.naturalWidth !== manifest.width || image.naturalHeight !== manifest.height) throw new Error('Invalid Cove terrain image dimensions');
  return { image, manifest };
}

/** A mirrored repeat preserves original generated boundary pixels, without painting seam fixes. */
export function coveRepeatColumn(x: number, width: number): number {
  const phase = ((x % (width * 2)) + width * 2) % (width * 2);
  return phase < width ? phase : width * 2 - phase - 1;
}

/** Read the existing contour for decorative clipping; never modifies a surface. */
export function coveGroundY(level: LevelData, x: number): number {
  const surface = level.surfaces.find(part => x >= part.x1 && x <= part.x2);
  if (!surface) throw new Error('Missing Cove visual support');
  return surface.y1 + (surface.y2 - surface.y1) * (x - surface.x1) / (surface.x2 - surface.x1);
}

/** Draw within the renderer's single connected ground clip. Coordinates remain world anchored. */
export function drawCoveGround(ctx: CanvasRenderingContext2D, kit: CoveTerrainAssets, level: LevelData,
  offset: { x: number; y: number }, left: number, right: number): void {
  ctx.save(); ctx.imageSmoothingEnabled = false;
  const pieces = kit.manifest.pieces, fill = pieces['sand-fill'];
  const from = Math.max(left, Math.floor(offset.x)), to = Math.min(right, Math.ceil(offset.x + 426));
  // Mirrored square neighbours share their boundary pixels in both axes.
  for (let x = Math.floor(from / 64) * 64; x < to; x += 64) {
    for (let y = Math.floor(offset.y / 64) * 64; y < offset.y + 240; y += 64) {
      const flipX = (Math.floor(x / 64) & 1) !== 0, flipY = (Math.floor(y / 64) & 1) !== 0;
      ctx.save(); ctx.translate(x - offset.x + (flipX ? 64 : 0), y - offset.y + (flipY ? 64 : 0));
      ctx.scale(flipX ? -1 : 1, flipY ? -1 : 1);
      ctx.drawImage(kit.image, fill.x, fill.y, 64, 64, 0, 0, 64, 64); ctx.restore();
    }
  }
  for (const surface of level.surfaces) {
    const start = Math.max(from, surface.x1), end = Math.min(to, surface.x2);
    const slope = (surface.y2 - surface.y1) / (surface.x2 - surface.x1);
    const lip = pieces[surface.material === 'water' ? 'wet-sand-lip' : 'sand-lip'];
    for (let x = start; x < end; x++) {
      const width = Math.min(1, end - x), y = surface.y1 + (x - surface.x1) * slope;
      ctx.save(); ctx.transform(1, slope, 0, 1, x - offset.x, y - offset.y);
      ctx.drawImage(kit.image, lip.x + coveRepeatColumn(x, lip.width), lip.y, width, lip.height, 0, 0, width, lip.height);
      ctx.restore();
    }
    // Junction detail is below the same sheared top, with no new horizontal foothold.
    if (slope !== 0) {
      for (const atEnd of [false, true]) {
        const name = slope < 0 ? (atEnd ? 'up-to-flat' : 'flat-to-up') : (atEnd ? 'down-to-flat' : 'flat-to-down');
        const p = pieces[name], x = atEnd ? surface.x2 - 16 : surface.x1;
        if (x + 16 < from || x > to) continue;
        const y = surface.y1 + (x - surface.x1) * slope;
        ctx.save(); ctx.transform(1, slope, 0, 1, x - offset.x, y - offset.y);
        ctx.drawImage(kit.image, p.x, p.y, 16, 16, 0, 0, 16, 16); ctx.restore();
      }
    }
  }
  for (const [x, side] of [[level.minX, 'left'], [level.maxX - 16, 'right']] as const) {
    if (x + 16 < from || x > to) continue;
    const p = pieces[`cliff-${side}`], y = coveGroundY(level, side === 'left' ? level.minX : level.maxX);
    for (let row = y; row < offset.y + 240; row += 64) ctx.drawImage(kit.image, p.x, p.y, 16, 64, x - offset.x, row - offset.y, 16, 64);
  }
  ctx.restore();
}

/** Native columns: end caps stay inside supported width; partial repeats are cropped. */
export function drawCovePlatform(ctx: CanvasRenderingContext2D, kit: CoveTerrainAssets, level: LevelData,
  body: PlatformBody, offset: { x: number; y: number }): void {
  const thin = body.id === 'cove-hollow-shelf' || body.id === 'cove-pool-stone-1' || body.id === 'cove-pool-stone-2';
  const prefix = thin ? 'stone-thin-' : 'stone-regular-';
  ctx.save(); ctx.imageSmoothingEnabled = false;
  for (let x = 0; x < body.width; x++) {
    const side = x < 16 ? 'left' : x >= body.width - 16 ? 'right' : 'repeat';
    const p = kit.manifest.pieces[prefix + side];
    const column = side === 'left' ? x : side === 'right' ? x - (body.width - 16) : coveRepeatColumn(x - 16, p.width);
    const depth = body.id === 'cove-hollow-shelf' ? Math.min(6, Math.max(1, Math.floor(coveGroundY(level, body.x + x) - body.y - 42))) : p.height;
    ctx.drawImage(kit.image, p.x + column, p.y, 1, depth, body.x + x - offset.x, body.y - offset.y, 1, depth);
  }
  ctx.restore();
}
