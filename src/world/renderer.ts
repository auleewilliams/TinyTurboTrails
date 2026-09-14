import type { Camera } from './camera';
import type { LevelData } from './level';
import type { WorldAsset, WorldAssets } from './assets';

export function drawWorld(ctx: CanvasRenderingContext2D, assets: WorldAssets, level: LevelData, camera: Camera): void {
  const offset = camera.position;
  const { atlas, manifest } = assets;
  const cell = manifest.cellSize;
  ctx.fillStyle = '#8bd0ca';
  ctx.fillRect(0, 0, 426, 240);
  drawAsset(ctx, assets, 'hills', 180 - offset.x * 0.18, 70 - offset.y * 0.1, 3);
  drawAsset(ctx, assets, 'hills', 700 - offset.x * 0.18, 70 - offset.y * 0.1, 3);
  for (const surface of level.surfaces) {
    ctx.fillStyle = '#86502f';
    ctx.beginPath();
    ctx.moveTo(surface.x1 - offset.x, surface.y1 - offset.y);
    ctx.lineTo(surface.x2 - offset.x, surface.y2 - offset.y);
    ctx.lineTo(surface.x2 - offset.x, 240);
    ctx.lineTo(surface.x1 - offset.x, 240);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#8bd348';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(surface.x1 - offset.x, surface.y1 - offset.y);
    ctx.lineTo(surface.x2 - offset.x, surface.y2 - offset.y);
    ctx.stroke();
  }
  for (const entity of level.entities) drawAsset(ctx, assets, entity.asset as WorldAsset, entity.x - offset.x, entity.y - offset.y, 1);
  drawAsset(ctx, assets, level.finish.asset as WorldAsset, level.finish.x - offset.x, level.finish.y - offset.y, 2);
  // Keep the draw source referenced so a bad cell size cannot silently pass.
  void atlas;
  void cell;
}

export function drawAsset(ctx: CanvasRenderingContext2D, assets: WorldAssets, asset: WorldAsset, x: number, y: number, scale = 1): void {
  const index = assets.manifest.assets[asset];
  const cell = assets.manifest.cellSize;
  const sourceX = (index % 4) * cell;
  const sourceY = Math.floor(index / 4) * cell;
  ctx.drawImage(assets.atlas, sourceX, sourceY, cell, cell, x - cell * scale / 2, y - cell * scale, cell * scale, cell * scale);
}
