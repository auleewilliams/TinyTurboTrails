import { drawTerrainMaterial, drawTerrainEdge, drawTrailBackdrop } from './trail-presentation';
import type { Camera } from './camera';
import type { LevelData, LevelSun, WorldEntity } from './level';
import type { PlatformBody, Surface } from '../game/movement';
import type { MovingPlatform } from '../game/platforms';
import type { WorldAsset, WorldAssets } from './assets';
import { drawSceneryBackground, drawScenerySprite, foregroundPlacements, sceneryForDecoration } from './scenery';
import { drawSurfaceMaterials } from './surface-materials';
import type { SlimeAccessory } from './slimes';

/** Scenes without run state draw the whole entity list; a run hides what it has consumed. */
export type EntityFilter = (entity: WorldEntity) => boolean;
/** Run state supplies live positions plus optional deterministic presentation progress. */
export type EntityPosition = (entity: WorldEntity) => { x: number; y: number; warningProgress?: number; checkpointActive?: boolean; springScale?: number };

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
  else if (!drawTrailBackdrop(ctx, assets, level, offset)) {
    if (level.theme.sun) drawSun(ctx, level.theme.sun, offset.x);
    for (const parallax of level.theme.parallax) {
      drawAsset(ctx, assets, parallax.asset,
        parallax.x - offset.x * 0.18, parallax.y - offset.y * 0.1, parallax.scale);
    }
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
    ctx.save(); ctx.clip();
    drawTerrainMaterial(ctx, level, offset, assets, first.x1, last.x2);
    ctx.restore();
  }
  if (level.theme.material === 'wood') drawTerrainTiles(ctx, assets, level, offset);
  drawTerrainEdge(ctx, level, offset);
  drawSurfaceMaterials(ctx, level, offset);
  for (const surface of level.surfaces) drawSurfaceGrip(ctx, surface, offset);
  drawPlatforms(ctx, level, offset, platforms);
  drawChallengeCues(ctx, level, offset);
  // Decorative silhouettes sit behind every collectible, hazard and checkpoint.
  const layerOrder: Record<WorldEntity['layer'], number> = { back: 0, world: 1, front: 2 };
  const entities = [...level.entities].sort((left, right) => layerOrder[left.layer] - layerOrder[right.layer]);
  for (const entity of entities) {
    if (!isVisible(entity)) continue;
    const position = positionOf(entity);
    if (entity.kind === 'slime' && assets.slimes) {
      drawSlime(ctx, assets.slimes, level.theme.slimeAccessory ?? 'straw', position.x - offset.x, position.y - offset.y);
    } else if (entity.kind === 'gem') {
      drawGem(ctx, position.x - offset.x, position.y - offset.y, level.atlas);
    } else if (entity.kind === 'special') {
      drawSpecial(ctx, position.x - offset.x, position.y - offset.y);
    } else if (entity.kind === 'crumbling-ledge') {
      drawCrumblingLedge(ctx, assets, entity, position.x - offset.x, position.y - offset.y, position.warningProgress ?? 0);
    } else if (scenery && sceneryForDecoration(entity)) {
      drawScenerySprite(ctx, scenery, sceneryForDecoration(entity)!, position.x - offset.x, position.y - offset.y);
    } else {
      const x = position.x - offset.x;
      const y = position.y - offset.y;
      if (position.springScale !== undefined && position.springScale !== 1) {
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(1, position.springScale);
        drawAsset(ctx, assets, entity.asset as WorldAsset, 0, 0, 1);
        ctx.restore();
      } else drawAsset(ctx, assets, entity.asset as WorldAsset, x, y, 1);
      if (position.checkpointActive) {
        // A bright pennant and check remain visible after the celebration ends.
        ctx.fillStyle = '#ffda75';
        ctx.fillRect(x - 5, y - 38, 22, 13);
        ctx.strokeStyle = '#10252c';
        ctx.lineWidth = 2;
        ctx.strokeRect(x - 5, y - 38, 22, 13);
        ctx.beginPath();
        ctx.moveTo(x, y - 32); ctx.lineTo(x + 4, y - 28); ctx.lineTo(x + 12, y - 35); ctx.stroke();
      }
    }
  }
  drawAsset(ctx, assets, level.finish.asset as WorldAsset, level.finish.x - offset.x, level.finish.y - offset.y, 2);
  // Keep the draw source referenced so a bad cell size cannot silently pass.
  void atlas;
  void cell;
}

/** Every costume shares one 32px body and the same bottom-center ground anchor. */
export function drawSlime(ctx: CanvasRenderingContext2D, atlas: HTMLImageElement, accessory: SlimeAccessory, x: number, y: number): void {
  const index = { straw: 0, miner: 1, leaf: 2, 'hard-hat': 3, bobble: 4, snorkel: 5 }[accessory];
  ctx.drawImage(atlas, index * 48, 0, 48, 48, x - 24, y - 44, 48, 48);
}

/** Shared 32 x 28 pixel brilliant-cut gem. The visible bottom is the entity's
 * pickup anchor; biome palettes change only color, never geometry or padding. */
export function drawGem(ctx: CanvasRenderingContext2D, x: number, y: number, atlas: string): void {
  const palette = atlas === 'cove'
    ? ['#064e70', '#087c9e', '#0baac7', '#20d9ed', '#70eff6', '#bdffff', '#07344c']
    : atlas === 'frost'
      ? ['#70460b', '#a7670b', '#d69218', '#ffcb3d', '#ffe27a', '#fff5bb', '#493108']
      : ['#713309', '#a94a0b', '#d9660d', '#f58b16', '#ffb52b', '#ffe08a', '#482306'];
  x = Math.round(x); y = Math.round(y);
  const polygon = (color: string, points: readonly (readonly [number, number])[]): void => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x + points[0][0], y + points[0][1]);
    for (const [px, py] of points.slice(1)) ctx.lineTo(x + px, y + py);
    ctx.closePath(); ctx.fill();
  };
  // A two-pixel stepped rim keeps the silhouette crisp without a heavy outline.
  polygon('#10252c', [[-10, -28], [10, -28], [10, -27], [14, -27], [14, -25],
    [16, -25], [16, -21], [14, -21], [14, -18], [11, -18], [11, -16],
    [9, -16], [9, -14], [7, -14], [7, -12], [5, -12], [5, -9],
    [3, -9], [3, -5], [1, -5], [1, 0], [-1, 0], [-1, -5], [-3, -5],
    [-3, -9], [-5, -9], [-5, -12], [-7, -12], [-7, -14], [-9, -14],
    [-9, -16], [-11, -16], [-11, -18], [-14, -18], [-14, -21],
    [-16, -21], [-16, -25], [-14, -25], [-14, -27], [-10, -27]]);
  // Crown: a broad table with alternating facets and one small hard highlight.
  polygon(palette[2], [[-10, -26], [-5, -26], [-8, -20], [-13, -22]]);
  polygon(palette[4], [[-5, -26], [1, -26], [-2, -20], [-8, -20]]);
  polygon(palette[5], [[1, -26], [7, -26], [9, -20], [-2, -20]]);
  polygon(palette[3], [[7, -26], [10, -26], [13, -23], [10, -20], [9, -20]]);
  polygon(palette[5], [[-5, -25], [-1, -25], [-3, -22], [-7, -22]]);
  // Pavilion: long triangular facets converge on the bottom pickup anchor.
  polygon(palette[1], [[-13, -22], [-8, -20], [-2, -20], [0, -3]]);
  polygon(palette[3], [[-2, -20], [3, -20], [0, -3]]);
  polygon(palette[0], [[3, -20], [10, -20], [13, -23], [0, -3]]);
  polygon(palette[6], [[10, -20], [13, -23], [11, -19], [0, -3]]);
}

/** Original code-authored pixel star: a gold five-point silhouette, dark rim and
 * pale center. Its center is the pickup position, unlike bottom-anchored gems. */
export function drawSpecial(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  const rows = ['00000100000', '00001110000', '00001110000', '11111111111',
    '01111111110', '00111111100', '00111111100', '01110011110', '01100001110'];
  x = Math.round(x) - 11; y = Math.round(y) - 9;
  ctx.fillStyle = '#10252c';
  for (let row = 0; row < rows.length; row++) for (let col = 0; col < 11; col++) {
    if (rows[row][col] === '1') ctx.fillRect(x + col * 2 - 1, y + row * 2 - 1, 4, 4);
  }
  ctx.fillStyle = '#ffda75';
  for (let row = 0; row < rows.length; row++) for (let col = 0; col < 11; col++) {
    if (rows[row][col] === '1') ctx.fillRect(x + col * 2, y + row * 2, 2, 2);
  }
  ctx.fillStyle = '#fff7d6'; ctx.fillRect(x + 9, y + 6, 4, 4);
}

/** Signs never collide; landing bands follow the existing terrain contour. */
export function drawChallengeCues(ctx: CanvasRenderingContext2D, level: LevelData, offset: { x: number; y: number }): void {
  for (const cue of level.challengeCues ?? []) {
    const x = Math.round(cue.x - offset.x);
    const y = Math.round(cue.y - offset.y);
    if (x < -180 || x > 606) continue;
    ctx.save();
    ctx.font = 'bold 8px monospace'; ctx.textAlign = 'center';
    const width = cue.label.length * 5 + 10;
    ctx.fillStyle = '#10252c'; ctx.fillRect(x - width / 2, y - 48, width, 15);
    ctx.fillRect(x - 1, y - 33, 2, 33);
    ctx.fillStyle = '#ffda75'; ctx.fillText(cue.label, x, y - 37);
    if (cue.landingWidth) for (let px = cue.x - cue.landingWidth / 2; px <= cue.x + cue.landingWidth / 2; px += 12) {
      const surface = level.surfaces.find((part) => px >= part.x1 && px <= part.x2);
      if (!surface) continue;
      const py = surface.y1 + (surface.y2 - surface.y1) * (px - surface.x1) / (surface.x2 - surface.x1);
      ctx.fillRect(Math.round(px - offset.x), Math.round(py - offset.y) + 2, 7, 3);
    }
    ctx.restore();
  }
}

function drawTerrainTiles(ctx: CanvasRenderingContext2D, assets: WorldAssets, level: LevelData,
  offset: { x: number; y: number }): void {
  const cell = assets.manifest.cellSize;
  for (const surface of level.surfaces) {
    const span = surface.x2 - surface.x1;
    for (let x = surface.x1; x < surface.x2; x += cell) {
      if (x + cell < offset.x || x > offset.x + 426) continue;
      const end = Math.min(x + cell, surface.x2);
      const tileWidth = end - x;
      const y = surface.y1 + (surface.y2 - surface.y1) * ((x - surface.x1) / span);
      const asset: WorldAsset = x === level.minX ? 'terrain-left'
        : end === level.maxX ? 'terrain-right'
        : surface.y1 !== surface.y2 ? 'terrain-ramp'
        : 'terrain-flat';
      const index = assets.manifest.assets[asset];
      const sourceX = (index % 4) * cell;
      const sourceY = Math.floor(index / 4) * cell;
      const tops = assets.manifest.terrainTops?.[asset] ?? { left: 0, right: 0 };
      const sourceRise = Math.abs(tops.right - tops.left);
      const desiredRise = Math.abs((surface.y2 - surface.y1) / span * tileWidth);
      const scaleY = asset === 'terrain-ramp' && sourceRise > 0 ? Math.min(1, desiredRise / sourceRise) : 1;
      const descending = asset === 'terrain-ramp' && surface.y2 > surface.y1;
      const startTop = descending ? tops.right : tops.left;
      const destinationY = y - startTop * scaleY - offset.y;
      const destinationHeight = cell * scaleY;
      if (descending) {
        ctx.save();
        ctx.translate(end - offset.x, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(assets.atlas, sourceX, sourceY, cell, cell, 0, destinationY, tileWidth, destinationHeight);
        ctx.restore();
      } else {
        ctx.drawImage(assets.atlas, sourceX, sourceY, cell, cell,
          x - offset.x, destinationY, tileWidth, destinationHeight);
      }
    }
  }
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

/** A stepped pixel disc: scanline rows keep the edge crisp at the game's low resolution. */
function drawSun(ctx: CanvasRenderingContext2D, sun: LevelSun, cameraX: number): void {
  const x = Math.round(sun.x - cameraX * 0.02);
  const disc = (radius: number, color: string): void => {
    ctx.fillStyle = color;
    for (let dy = -radius; dy <= radius; dy++) {
      const half = Math.floor(Math.sqrt(radius * radius - dy * dy));
      ctx.fillRect(x - half, sun.y + dy, half * 2 + 1, 1);
    }
  };
  disc(Math.round(sun.radius * 1.7), sun.glow);
  disc(sun.radius, sun.color);
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
    ctx.fillStyle = '#ffffff22';
    for (let x = 6; x < body.width - 4; x += 11) ctx.fillRect(body.x - offset.x + x, body.y - offset.y + 5, 4, 1);
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


/** Automatic grip cues: smooth cyan streaks below 1, ochre grains above 1. */
export function drawSurfaceGrip(ctx: CanvasRenderingContext2D, surface: Surface, offset: { x: number; y: number }): void {
  const friction = surface.friction ?? 1;
  if (friction === 1 || surface.x2 <= surface.x1) return;
  const slippery = friction < 1;
  const slope = (surface.y2 - surface.y1) / (surface.x2 - surface.x1);
  ctx.save();
  ctx.strokeStyle = slippery ? '#80dbea' : '#d6ac63';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(surface.x1 - offset.x, surface.y1 - offset.y + 2);
  ctx.lineTo(surface.x2 - offset.x, surface.y2 - offset.y + 2);
  ctx.stroke();
  ctx.fillStyle = slippery ? '#e6ffff' : '#72502d';
  // World-anchored markings stay still as the camera scrolls; skip offscreen work.
  const first = Math.max(0, Math.ceil((offset.x - surface.x1 - 8) / 12));
  for (let index = first; ; index++) {
    const x = surface.x1 + 4 + index * 12;
    if (x + 6 >= surface.x2 || x - offset.x > 426) break;
    const y = surface.y1 + slope * (x - surface.x1);
    ctx.fillRect(x - offset.x, y - offset.y + 2, slippery ? 6 : 2, 2);
  }
  ctx.restore();
}
