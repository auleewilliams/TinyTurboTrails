import type { PlatformBody } from '../game/movement';
import type { LevelData } from './level';

export interface CovePiece { x: number; y: number; width: number; height: number }
export interface CoveTerrainManifest { version: number; image: string; width: number; height: number; pieces: Record<string, CovePiece>; platforms: Record<string, CovePiece>; ground: { image: string; width: number; height: number } }
export interface CoveTerrainAssets { image: HTMLImageElement; ground: HTMLImageElement; bay1?: HTMLImageElement; bay2?: HTMLImageElement; hollowB?: HTMLImageElement; pool3B?: HTMLImageElement; manifest: CoveTerrainManifest }

/** Exact native dimensions are a presentation contract, independent of collision bodies. */
export function validateCoveTerrain(value: unknown): asserts value is CoveTerrainManifest {
  const data = value as CoveTerrainManifest;
  if (!data || data.version !== 2 || data.image !== 'atlas.png' || data.width !== 512 || data.height !== 256 || !data.pieces) {
    throw new Error('Invalid Cove terrain metadata');
  }
  const sizes: Record<string, [number, number]> = {
    'sand-lip': [64, 16], 'wet-sand-lip': [64, 8], 'sand-fill': [64, 64],
    'cliff-left': [16, 64], 'cliff-right': [16, 64],
    'flat-to-up': [16, 16], 'up-to-flat': [16, 16], 'flat-to-down': [16, 16], 'down-to-flat': [16, 16],
    'stone-thin-left': [14, 6], 'stone-thin-repeat': [38, 6], 'stone-thin-right': [14, 6],
    'stone-regular-left': [12, 12], 'stone-regular-repeat': [22, 12], 'stone-regular-right': [12, 12], 'stone-regular-repeat-alt': [22, 12],
  };
  if (!data.platforms || data.ground?.image !== 'ground.png' || data.ground.width !== 4200 || data.ground.height !== 480) throw new Error('Invalid Cove terrain composition');
  for (const kind of ['thin', 'regular']) for (const width of [90, 100, 140, 160, 180]) sizes[`${kind}-${width}`] = [width, kind === 'thin' ? 6 : 12];
  sizes['hollow-140'] = [140, 6]; sizes['regular-alt-160'] = [160, 12];
  const occupied = new Set<number>();
  for (const [name, [width, height]] of Object.entries(sizes)) {
    const p = data.pieces[name] ?? data.platforms[name];
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
  const images = await Promise.all([`terrain-kit/${manifest.image}`, `terrain-kit/${manifest.ground.image}`, 'bay1-b-v1/platform.png', 'bay2-whole-v1/platform.png', 'remaining-two-v1/hollow.png', 'remaining-two-v1/pool3.png'].map(async name => {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve(); image.onerror = () => reject(new Error('Could not load Cove terrain image'));
      image.src = `${base}${name}`;
    });
    return image;
  }));
  const [image, ground, bay1, bay2, hollowB, pool3B] = images;
  if (image.naturalWidth !== manifest.width || image.naturalHeight !== manifest.height
    || ground.naturalWidth !== manifest.ground.width || ground.naturalHeight !== manifest.ground.height
    || bay1.naturalWidth !== 140 || bay1.naturalHeight !== 30
    || bay2.naturalWidth !== 160 || bay2.naturalHeight !== 35
    || hollowB.naturalWidth !== 140 || hollowB.naturalHeight !== 6
    || pool3B.naturalWidth !== 90 || pool3B.naturalHeight !== 18) throw new Error('Invalid Cove terrain image dimensions');
  return { image, ground, bay1, bay2, hollowB, pool3B, manifest };
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

/** The prepared native world bitmap has no internal compositing boundaries. The caller clips to the exact contour. */
export function drawCoveGround(ctx: CanvasRenderingContext2D, kit: CoveTerrainAssets, _level: LevelData,
  offset: { x: number; y: number }, _left: number, _right: number): void {
  ctx.save();
  try {
    ctx.imageSmoothingEnabled = false;
    const { width, height } = kit.manifest.ground;
    ctx.drawImage(kit.ground, 0, 0, width, height, -offset.x, -offset.y, width, height);
  } finally { ctx.restore(); }
}

/** One native bitmap per support: fractional camera positions cannot expose joins between separate draws. */
export function drawCovePlatform(ctx: CanvasRenderingContext2D, kit: CoveTerrainAssets, _level: LevelData,
  body: PlatformBody, offset: { x: number; y: number }): void {
  const replacement = body.id === 'cove-hollow-shelf' ? kit.hollowB : body.id === 'cove-pool-stone-3' ? kit.pool3B : undefined;
  if (replacement) {
    const width = body.id === 'cove-hollow-shelf' ? 140 : 90;
    const height = body.id === 'cove-hollow-shelf' ? 6 : 18;
    if (body.width !== width) throw new Error('Invalid Cove remaining support width');
    ctx.save();
    try {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(replacement, 0, 0, width, height, body.x - offset.x, body.y - offset.y, width, height);
    } finally { ctx.restore(); }
    return;
  }
  if (body.id === 'cove-bay-ledge-2' && kit.bay2) {
    if (body.width !== 160) throw new Error('Invalid Cove bay2 presentation width');
    ctx.save();
    try {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(kit.bay2, 0, 0, 160, 35, body.x - offset.x, body.y - offset.y, 160, 35);
    } finally { ctx.restore(); }
    return;
  }
  if (body.id === 'cove-bay-ledge-1' && kit.bay1) {
    if (body.width !== 140) throw new Error('Invalid Cove bay1 presentation width');
    ctx.save();
    try {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(kit.bay1, 0, 0, 140, 30, body.x - offset.x, body.y - offset.y, 140, 30);
    } finally { ctx.restore(); }
    return;
  }
  const thin = body.id === 'cove-pool-stone-1' || body.id === 'cove-pool-stone-2';
  const key = body.id === 'cove-hollow-shelf' ? 'hollow-140' : body.id === 'cove-bay-ledge-2'
    ? 'regular-alt-160' : `${thin ? 'thin' : 'regular'}-${body.width}`;
  const p = kit.manifest.platforms[key];
  if (!p || p.width !== body.width) throw new Error('Missing Cove native support span');
  ctx.save();
  try {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(kit.image, p.x, p.y, p.width, p.height, body.x - offset.x, body.y - offset.y, p.width, p.height);
  } finally { ctx.restore(); }
}
