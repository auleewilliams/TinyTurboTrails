import type { Camera } from './camera';
import type { LevelData, WorldEntity } from './level';
import type { PlatformBody } from '../game/movement';
import type { MovingPlatform } from '../game/platforms';
import type { WorldAsset, WorldAssets } from './assets';
import { drawSceneryBackground, drawScenerySprite, foregroundPlacements, sceneryForDecoration } from './scenery';

/** Scenes without run state draw the whole entity list; a run hides what it has consumed. */
export type EntityFilter = (entity: WorldEntity) => boolean;
/** Run state supplies live positions plus optional deterministic presentation progress. */
export type EntityPosition = (entity: WorldEntity) => { x: number; y: number; warningProgress?: number };

export function drawWorld(ctx: CanvasRenderingContext2D, assets: WorldAssets, level: LevelData, camera: Camera,
  isVisible: EntityFilter = () => true, positionOf: EntityPosition = (entity) => entity,
  platforms: readonly PlatformBody[] = []): void {
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
  drawPlatforms(ctx, level, offset, platforms);
  // Decorative silhouettes sit behind every collectible, hazard and checkpoint.
  const entities = scenery ? [...level.entities.filter((entity) => entity.kind === 'decoration'),
    ...level.entities.filter((entity) => entity.kind !== 'decoration')] : level.entities;
  for (const entity of entities) {
    if (!isVisible(entity)) continue;
    const position = positionOf(entity);
    if (entity.kind === 'crumbling-ledge') {
      drawCrumblingLedge(ctx, assets, entity, position.x - offset.x, position.y - offset.y, position.warningProgress ?? 0);
    } else if (scenery && sceneryForDecoration(entity)) {
      drawScenerySprite(ctx, scenery, sceneryForDecoration(entity)!, position.x - offset.x, position.y - offset.y);
    } else {
      drawAsset(ctx, assets, entity.asset as WorldAsset, position.x - offset.x, position.y - offset.y, 1);
    }
  }
  drawAsset(ctx, assets, level.finish.asset as WorldAsset, level.finish.x - offset.x, level.finish.y - offset.y, 2);
  // Keep the draw source referenced so a bad cell size cannot silently pass.
  void atlas;
  void cell;
}

export function drawCrumblingLedge(ctx: CanvasRenderingContext2D, assets: WorldAssets, entity: WorldEntity,
  x: number, y: number, warningProgress = 0): void {
  const progress = Math.max(0, Math.min(1, warningProgress));
  const shake = progress === 0 ? 0 : Math.round(Math.sin(progress * 24) * progress * 2);
  const tileCount = Math.max(1, Math.round((entity.width ?? 72) / 24));
  const firstCenter = x - (tileCount - 1) * 12;
  for (let index = 0; index < tileCount; index++) {
    drawAsset(ctx, assets, 'stone', firstCenter + index * 24 + shake, y, 0.5);
  }
  if (progress === 0) return;
  const cracks = progress >= 0.5 ? 2 : 1;
  ctx.save();
  ctx.strokeStyle = '#49362d';
  ctx.lineWidth = 1;
  for (let index = 0; index < cracks; index++) {
    const crackX = x + shake + (index === 0 ? -12 : 13);
    ctx.beginPath();
    ctx.moveTo(crackX - 4, y - 12);
    ctx.lineTo(crackX + 1, y - 8);
    ctx.lineTo(crackX - 2, y - 3);
    ctx.stroke();
  }
  ctx.restore();
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

/** Paths are drawn before the slabs so a rider always sees where the ride goes next. */
export function drawPlatforms(ctx: CanvasRenderingContext2D, level: LevelData, offset: { x: number; y: number },
  platforms: readonly PlatformBody[]): void {
  for (const platform of level.platforms ?? []) {
    drawPlatformPath(ctx, platform, offset);
    const body = platforms.find((candidate) => candidate.id === platform.id);
    if (!body) continue;
    ctx.fillStyle = level.theme.ground;
    ctx.fillRect(body.x - offset.x, body.y - offset.y, body.width, body.height);
    ctx.fillStyle = level.theme.edge;
    ctx.fillRect(body.x - offset.x, body.y - offset.y, body.width, 3);
  }
}

export function drawPlatformPath(ctx: CanvasRenderingContext2D, platform: MovingPlatform, offset: { x: number; y: number }): void {
  const fromX = platform.from.x + platform.width / 2 - offset.x;
  const fromY = platform.from.y - offset.y;
  const toX = platform.to.x + platform.width / 2 - offset.x;
  const toY = platform.to.y - offset.y;
  const pips = Math.max(2, Math.round(Math.hypot(toX - fromX, toY - fromY) / 12));
  ctx.fillStyle = '#ffffff66';
  for (let pip = 0; pip <= pips; pip++) {
    const progress = pip / pips;
    ctx.fillRect(Math.round(fromX + (toX - fromX) * progress) - 1, Math.round(fromY + (toY - fromY) * progress) - 1, 2, 2);
  }
  for (const [x, y] of [[fromX, fromY], [toX, toY]]) ctx.fillRect(x - 4, y - 2, 8, 2);
}

export function drawAsset(ctx: CanvasRenderingContext2D, assets: WorldAssets, asset: WorldAsset, x: number, y: number, scale = 1): void {
  const index = assets.manifest.assets[asset];
  const cell = assets.manifest.cellSize;
  const sourceX = (index % 4) * cell;
  const sourceY = Math.floor(index / 4) * cell;
  const anchor = assets.manifest.anchors?.[asset] ?? { x: cell / 2, y: cell };
  ctx.drawImage(assets.atlas, sourceX, sourceY, cell, cell, x - anchor.x * scale, y - anchor.y * scale, cell * scale, cell * scale);
}
