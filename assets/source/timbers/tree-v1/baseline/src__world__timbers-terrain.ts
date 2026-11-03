import type { PlatformBody } from '../game/movement';
import type { LevelData } from './level';

export interface TimbersPlatformArt { image: string; width: number; height: number }
export interface TimbersTerrainManifest {
  version: number;
  ground: TimbersPlatformArt & { x: number; y: number };
  platforms: Record<string, TimbersPlatformArt>;
}
export interface TimbersTerrainAssets {
  manifest: TimbersTerrainManifest;
  ground: HTMLImageElement;
  platforms: Record<string, HTMLImageElement>;
}

/** This bounded preview is deliberately smaller than the full trail inventory. */
export function timbersPreviewIds(): string[] {
  return ['middle', 'spring', 'spring-reward', 'spring-catch', 'approach-1', 'approach-2', 'shared',
    'return-600', 'return-720', 'return-780', 'outer-catch-660', 'outer-catch-780'].map(name => `timber-${name}`);
}

export function validateTimbersTerrain(value: unknown): asserts value is TimbersTerrainManifest {
  const data = value as TimbersTerrainManifest;
  if (!data || data.version !== 1 || !data.platforms || !data.ground
    || data.ground.image !== 'ground.png' || data.ground.x !== 40 || data.ground.y !== 1080
    || data.ground.width !== 780 || data.ground.height !== 100) throw new Error('Invalid Timbers terrain metadata');
  const ids = timbersPreviewIds();
  const widths: Record<string, number> = { 'timber-middle': 580, 'timber-spring': 150, 'timber-spring-reward': 160,
    'timber-spring-catch': 150, 'timber-approach-1': 220, 'timber-approach-2': 240, 'timber-shared': 180,
    'timber-return-600': 160, 'timber-return-720': 160, 'timber-return-780': 140,
    'timber-outer-catch-660': 120, 'timber-outer-catch-780': 120 };
  if (Object.keys(data.platforms).length !== ids.length) throw new Error('Incomplete Timbers preview mapping');
  for (const id of ids) {
    const piece = data.platforms[id];
    if (!piece || piece.width !== widths[id]
      || piece.height !== 17 || piece.image !== `branch-${piece.width}.png`) throw new Error(`Invalid Timbers support art: ${id}`);
  }
}

/** Required when declared. A failed request is never cached, so normal Retry reloads it. */
export async function loadTimbersTerrain(base: string, path?: string): Promise<TimbersTerrainAssets | undefined> {
  if (path === undefined) return undefined;
  if (path !== 'terrain-kit-v1/manifest.json') throw new Error('Invalid Timbers terrain declaration');
  const response = await fetch(`${base}${path}`);
  if (!response.ok) throw new Error('Could not load Timbers terrain metadata');
  const manifest: unknown = await response.json();
  validateTimbersTerrain(manifest);
  const files = new Map<string, TimbersPlatformArt>([['ground.png', manifest.ground]]);
  for (const piece of Object.values(manifest.platforms)) files.set(piece.image, piece);
  const images = new Map(await Promise.all([...files].map(async ([file, piece]) => {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve(); image.onerror = () => reject(new Error(`Could not load Timbers terrain image: ${file}`));
      image.src = `${base}terrain-kit-v1/${file}`;
    });
    if (image.naturalWidth !== piece.width || image.naturalHeight !== piece.height) throw new Error(`Invalid Timbers terrain image dimensions: ${file}`);
    return [file, image] as const;
  })));
  return { manifest, ground: images.get('ground.png')!,
    platforms: Object.fromEntries(Object.entries(manifest.platforms).map(([id, piece]) => [id, images.get(piece.image)!])) };
}

export function drawTimbersGround(ctx: CanvasRenderingContext2D, kit: TimbersTerrainAssets, level: LevelData,
  offset: { x: number; y: number }): void {
  const ground = kit.manifest.ground;
  const supports = level.surfaces.filter(surface => surface.x1 === ground.x && surface.x2 === ground.x + ground.width
    && surface.y1 === ground.y && surface.y2 === ground.y);
  if (supports.length !== 1) throw new Error('Missing unique Timbers ground support');
  ctx.drawImage(kit.ground, ground.x - offset.x, ground.y - offset.y);
}

/** One native bitmap per support prevents internal seams at fractional camera offsets. */
export function drawTimbersPlatform(ctx: CanvasRenderingContext2D, kit: TimbersTerrainAssets,
  body: PlatformBody, offset: { x: number; y: number }): boolean {
  const piece = kit.manifest.platforms[body.id];
  if (!piece) return false;
  const image = kit.platforms[body.id];
  if (!image || piece.width !== body.width) throw new Error('Missing or misaligned Timbers platform artwork');
  ctx.drawImage(image, body.x - offset.x, body.y - offset.y);
  return true;
}
