import type { LevelData } from './level';
import type { WorldAssets } from './assets';

/** Cosmetic materials never assign physics properties. Bounds are world coordinates. */
export function drawTerrainMaterial(ctx: CanvasRenderingContext2D, level: LevelData, offset: { x: number; y: number },
  assets: WorldAssets, left: number, right: number): void {
  for (const section of level.theme.materialSections ?? [{ from: left, to: right, material: level.theme.material ?? 'soil' }]) {
    const material = section.material;
    const index = ['soil', 'stone', 'wood', 'gravel', 'frost', 'sand'].indexOf(material);
    const from = Math.max(left, offset.x, section.from), to = Math.min(right, offset.x + 426, section.to);
    if (to <= from) continue;
    ctx.save(); ctx.beginPath();
    ctx.moveTo(from - offset.x, 0); ctx.lineTo(to - offset.x, 0);
    ctx.lineTo(to - offset.x, 240); ctx.lineTo(from - offset.x, 240); ctx.closePath(); ctx.clip();
    if (material === 'stone' && level.theme.material !== 'stone') {
      ctx.fillStyle = '#706653'; ctx.fillRect(from - offset.x, 0, to - from, 240);
    }
    const image = assets.materials;
    if (image) {
      const size = image.naturalWidth / 3;
      ctx.globalAlpha = 0.38;
      for (let x = Math.floor(from / 192) * 192; x < to; x += 192) {
        for (let y = Math.floor(offset.y / 192) * 192; y < offset.y + 240; y += 192) {
          // Mirrored neighbours share their boundary pixels, so non-seamless
          // source swatches never produce a grid of hard cuts while scrolling.
          const flipX = (Math.floor(x / 192) & 1) !== 0;
          const flipY = (Math.floor(y / 192) & 1) !== 0;
          ctx.save();
          ctx.translate(x - offset.x + (flipX ? 192 : 0), y - offset.y + (flipY ? 192 : 0));
          ctx.scale(flipX ? -1 : 1, flipY ? -1 : 1);
          ctx.drawImage(image, index % 3 * size, Math.floor(index / 3) * image.naturalHeight / 2,
            size, image.naturalHeight / 2, 0, 0, 192, 192);
          ctx.restore();
        }
      }
      ctx.globalAlpha = 1;
    }
    // Sparse deterministic detail has no time or camera seed. Work is viewport bounded.
    for (let x = Math.floor(from / 29) * 29; x < to; x += 29) {
      for (let y = Math.floor(offset.y / 23) * 23; y < offset.y + 240; y += 23) {
        const seed = Math.abs((x * 13 + y * 31) | 0);
        const px = x + seed % 17 - offset.x, py = y + seed % 11 - offset.y;
        ctx.fillStyle = material === 'stone' || material === 'frost' ? '#ffffff12' : '#211b1516';
        ctx.fillRect(px, py, material === 'wood' ? 15 : 3 + seed % 6, 1 + seed % 2);
        if (material === 'wood') { ctx.fillStyle = '#251c2424'; ctx.fillRect(x - offset.x, y - offset.y, 1, 12); }
      }
    }
    ctx.restore();
  }
}

export function drawTerrainEdge(ctx: CanvasRenderingContext2D, level: LevelData, offset: { x: number; y: number }): void {
  for (const surface of level.surfaces) {
    if (surface.x2 < offset.x || surface.x1 > offset.x + 426) continue;
    const material = level.theme.materialSections?.find(s => surface.x1 >= s.from && surface.x1 < s.to)?.material ?? level.theme.material;
    const rock = material === 'stone';
    const edge = rock ? '#9aab96' : material === 'frost' ? '#eff8ff' : level.theme.edge;
    const steep = Math.abs((surface.y2 - surface.y1) / (surface.x2 - surface.x1)) > 1;
    ctx.strokeStyle = rock ? '#736653' : level.theme.material === 'wood' ? '#523822' : '#3d352e';
    ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(surface.x1 - offset.x, surface.y1 - offset.y + 4);
    ctx.lineTo(surface.x2 - offset.x, surface.y2 - offset.y + 4); ctx.stroke();
    ctx.strokeStyle = edge; ctx.lineWidth = material === 'frost' ? 5 : 3;
    ctx.beginPath(); ctx.moveTo(surface.x1 - offset.x, surface.y1 - offset.y);
    ctx.lineTo(surface.x2 - offset.x, surface.y2 - offset.y); ctx.stroke();
    if (steep) continue;
    const from = Math.ceil(Math.max(surface.x1, offset.x) / 7) * 7;
    for (let x = from; x < Math.min(surface.x2, offset.x + 426); x += 7) {
      const y = surface.y1 + (surface.y2 - surface.y1) * (x - surface.x1) / (surface.x2 - surface.x1);
      ctx.fillStyle = edge;
      const irregular = Math.abs((x * 17) ^ (x >> 3));
      ctx.fillRect(x - offset.x, y - offset.y + 1, 2 + irregular % 4, 1 + irregular % 3);
      if (level.theme.material === 'soil' && !rock && x % 5 === 0) {
        ctx.fillStyle = '#64422c'; ctx.fillRect(x - offset.x + 1, y - offset.y + 7, 1, 5);
      }
    }
  }
}

export function drawTrailBackdrop(ctx: CanvasRenderingContext2D, assets: WorldAssets, level: LevelData,
  offset: { x: number; y: number }): boolean {
  const shared = level.id === 'quarry' || level.id === 'timbers';
  const image = assets.panorama ?? (shared ? assets.backdrops : undefined);
  if (image) {
    const height = image.naturalHeight / (assets.panorama ? 1 : 2);
    const sourceY = assets.panorama || level.id === 'quarry' ? 0 : height;
    // Pan within the panorama, never wrap; its world-wide sweep has no repeat seam.
    // Limit both crop dimensions so even a narrower future panorama stays in bounds.
    const sourceWidth = Math.min(image.naturalWidth, height * 426 / 240);
    const sourceHeight = sourceWidth * 240 / 426;
    const progress = Math.max(0, Math.min(1, offset.x / Math.max(1, level.width - 426)));
    const sourceX = (image.naturalWidth - sourceWidth) * progress;
    ctx.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, 426, 240);
  }
  if (!shared) return !!image;
  // World-anchored supports reach below the viewport. Their upper ends sit behind
  // the real contour; decorative structures never become new landing surfaces.
  ctx.fillStyle = level.id === 'quarry' ? '#4b535860' : '#60443260';
  for (const surface of level.surfaces) {
    const from = Math.ceil(Math.max(surface.x1, offset.x - 8) / 137) * 137;
    for (let x = from; x < Math.min(surface.x2, offset.x + 434); x += 137) {
      const y = surface.y1 + (surface.y2 - surface.y1) * (x - surface.x1) / (surface.x2 - surface.x1);
      ctx.fillRect(x - offset.x - 3, y - offset.y + 2, 6, 240);
    }
  }
  return true;
}
