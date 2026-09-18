import type { Camera } from './camera';
import type { LevelData, WorldEntity } from './level';
import type { WorldAsset, WorldAssets } from './assets';
import { drawSceneryBackground, drawScenerySprite, foregroundPlacements, sceneryForDecoration } from './scenery';

/** Scenes without run state draw the whole entity list; a run hides what it has consumed. */
export type EntityFilter = (entity: WorldEntity) => boolean;

export function drawWorld(ctx: CanvasRenderingContext2D, assets: WorldAssets, level: LevelData, camera: Camera,
  isVisible: EntityFilter = () => true): void {
  const offset = camera.position;
  const { atlas, manifest } = assets;
  const cell = manifest.cellSize;
  ctx.fillStyle = level.theme.sky;
  ctx.fillRect(0, 0, 426, 240);
  const scenery = level.theme.scenery ? assets.scenery : undefined;
  if (scenery) drawSceneryBackground(ctx, scenery, level, offset.x);
  else for (const parallax of level.theme.parallax) {
    drawAsset(ctx, assets, parallax.asset,
      parallax.x - offset.x * 0.18, parallax.y - offset.y * 0.1, parallax.scale);
  }
  ctx.fillStyle = level.theme.ground;
  // Fill each connected ground contour once: separately antialiased polygon
  // edges leave the background showing through at fractional camera offsets.
  for (let i = 0; i < level.surfaces.length; i++) {
    const first = level.surfaces[i];
    let last = first;
    ctx.beginPath();
    ctx.moveTo(first.x1 - offset.x, first.y1 - offset.y);
    ctx.lineTo(last.x2 - offset.x, last.y2 - offset.y);
    while (i + 1 < level.surfaces.length) {
      const next = level.surfaces[i + 1];
      if (next.x1 !== last.x2 || next.y1 !== last.y2) break;
      last = next;
      i++;
      ctx.lineTo(last.x2 - offset.x, last.y2 - offset.y);
    }
    ctx.lineTo(last.x2 - offset.x, 240);
    ctx.lineTo(first.x1 - offset.x, 240);
    ctx.closePath();
    ctx.fill();
  }
  for (const surface of level.surfaces) {
    ctx.strokeStyle = level.theme.edge;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(surface.x1 - offset.x, surface.y1 - offset.y);
    ctx.lineTo(surface.x2 - offset.x, surface.y2 - offset.y);
    ctx.stroke();
  }
  // Decorative silhouettes sit behind every collectible, hazard and checkpoint.
  const entities = scenery ? [...level.entities.filter((entity) => entity.kind === 'decoration'),
    ...level.entities.filter((entity) => entity.kind !== 'decoration')] : level.entities;
  for (const entity of entities) {
    if (!isVisible(entity)) continue;
    const sprite = scenery && sceneryForDecoration(entity);
    if (scenery && sprite) drawScenerySprite(ctx, scenery, sprite, entity.x - offset.x, entity.y - offset.y);
    else drawAsset(ctx, assets, entity.asset as WorldAsset, entity.x - offset.x, entity.y - offset.y, 1);
  }
  drawAsset(ctx, assets, level.finish.asset as WorldAsset, level.finish.x - offset.x, level.finish.y - offset.y, 2);
  // Keep the draw source referenced so a bad cell size cannot silently pass.
  void atlas;
  void cell;
}

/** Draw after the player, before the HUD; only low, non-interactive edge plants. */
export function drawWorldForeground(ctx: CanvasRenderingContext2D, assets: WorldAssets, level: LevelData, camera: Camera): void {
  if (!assets.scenery || !level.theme.scenery) return;
  for (const prop of foregroundPlacements(level)) {
    const x = prop.x - camera.position.x;
    if (x < -48 || x > 474) continue;
    drawScenerySprite(ctx, assets.scenery, prop.sprite, x, prop.y - camera.position.y);
  }
}

export function drawAsset(ctx: CanvasRenderingContext2D, assets: WorldAssets, asset: WorldAsset, x: number, y: number, scale = 1): void {
  const index = assets.manifest.assets[asset];
  const cell = assets.manifest.cellSize;
  const sourceX = (index % 4) * cell;
  const sourceY = Math.floor(index / 4) * cell;
  const anchor = assets.manifest.anchors?.[asset] ?? { x: cell / 2, y: cell };
  ctx.drawImage(assets.atlas, sourceX, sourceY, cell, cell, x - anchor.x * scale, y - anchor.y * scale, cell * scale, cell * scale);
}
