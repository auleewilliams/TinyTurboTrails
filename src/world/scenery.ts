import type { LevelData, WorldEntity } from './level';

export const SCENERY_SPRITES = ['oak-round', 'oak-young', 'bush-round', 'bush-wide', 'grass', 'daisies', 'mossy-rock', 'pebbles'] as const;
export type ScenerySpriteName = typeof SCENERY_SPRITES[number];
export interface ScenerySprite {
  source: { x: number; y: number; width: number; height: number };
  anchor: { x: number; y: number };
  logicalSize: { width: number; height: number };
}
export interface SceneryManifest {
  background: { image: string; width: number; height: number };
  foreground: { image: string; width: number; height: number; sprites: Record<ScenerySpriteName, ScenerySprite> };
}
export interface SceneryAssets { background: HTMLImageElement; foreground: HTMLImageElement; manifest: SceneryManifest }

export function validateScenery(manifest: SceneryManifest): void {
  for (const sheet of [manifest.background, manifest.foreground]) {
    if (!sheet || typeof sheet.image !== 'string' || !sheet.image ||
      !Number.isFinite(sheet.width) || sheet.width <= 0 || !Number.isFinite(sheet.height) || sheet.height <= 0) {
      throw new Error('Invalid scenery image metadata');
    }
  }
  for (const name of SCENERY_SPRITES) {
    const sprite = manifest.foreground.sprites?.[name];
    if (!sprite?.source || !sprite.anchor || !sprite.logicalSize) throw new Error(`Missing scenery sprite: ${name}`);
    const { source, anchor, logicalSize } = sprite;
    if (![source.x, source.y, source.width, source.height, anchor.x, anchor.y, logicalSize.width, logicalSize.height].every(Number.isFinite) ||
      source.x < 0 || source.y < 0 || source.width <= 0 || source.height <= 0 ||
      source.x + source.width > manifest.foreground.width || source.y + source.height > manifest.foreground.height ||
      anchor.x < 0 || anchor.x > source.width || anchor.y < 0 || anchor.y > source.height ||
      logicalSize.width <= 0 || logicalSize.height <= 0) throw new Error(`Invalid scenery sprite bounds: ${name}`);
  }
}

export function drawSceneryBackground(ctx: CanvasRenderingContext2D, assets: SceneryAssets, level: LevelData, cameraX: number): void {
  const { width, height } = assets.manifest.background;
  // A bounded crop pans across the non-seamless panorama once over the route.
  const cropWidth = Math.min(width * 2 / 3, height * 426 / 240);
  const cropHeight = cropWidth * 240 / 426;
  const progress = Math.max(0, Math.min(1, cameraX / Math.max(1, level.width - 426)));
  const sourceY = Math.min(height * 0.1, height - cropHeight);
  ctx.drawImage(assets.background, progress * (width - cropWidth), sourceY, cropWidth, cropHeight, 0, 0, 426, 240);
}

export function sceneryForDecoration(entity: WorldEntity): ScenerySpriteName | undefined {
  if (entity.kind !== 'decoration') return undefined;
  const alternate = Math.floor(entity.x / 1000) % 2 === 1;
  if (entity.asset === 'tree') return alternate ? 'oak-young' : 'oak-round';
  if (entity.asset === 'bush') return alternate ? 'bush-wide' : 'bush-round';
  if (entity.asset === 'flowers') return 'daisies';
  if (entity.asset === 'stone') return alternate ? 'mossy-rock' : 'pebbles';
  return undefined;
}

export function drawScenerySprite(ctx: CanvasRenderingContext2D, assets: SceneryAssets, name: ScenerySpriteName, x: number, y: number): void {
  const { source, anchor, logicalSize } = assets.manifest.foreground.sprites[name];
  ctx.drawImage(assets.foreground, source.x, source.y, source.width, source.height,
    x - anchor.x * logicalSize.width / source.width, y - anchor.y * logicalSize.height / source.height,
    logicalSize.width, logicalSize.height);
}

export interface ForegroundPlacement { sprite: ScenerySpriteName; x: number; y: number }

export function foregroundPlacements(level: LevelData): ForegroundPlacement[] {
  if (!level.theme.scenery) return [];
  return level.surfaces.flatMap((surface) => {
    // Flat ledges keep the whole prop planted; leave ramps and interactions clear.
    if (surface.y1 !== surface.y2 || surface.x2 - surface.x1 < 180) return [];
    return [surface.x1 + 36, surface.x2 - 36].flatMap((x, index): ForegroundPlacement[] => {
      if (Math.abs(x - level.start.x) < 60 || Math.abs(x - level.finish.x) < 80 ||
        level.entities.some((entity) => entity.kind !== 'decoration' && Math.abs(entity.x - x) < 60)) return [];
      return [{ sprite: index === 0 ? 'grass' : 'daisies', x, y: surface.y1 + 5 }];
    });
  });
}
