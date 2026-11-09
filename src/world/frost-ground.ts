import type { LevelData } from './level';

export interface FrostGroundPiece { image: string; width: number; height: number; sourceSHA256: string; pngSHA256: string }
export interface FrostGroundManifest { recipe: string; terrain: FrostGroundPiece; ice: FrostGroundPiece }
export interface FrostGroundAssets {
  manifest: FrostGroundManifest;
  terrain: HTMLImageElement;
  ice: HTMLImageElement;
  ribbon?: { identity: string; terrain: HTMLImageElement; ice: HTMLImageElement; windows: { from: number; canvas: HTMLCanvasElement }[] };
}

/** Owner-authorized continuous half-open Frost ground coverage. */
export function frostGroundWindows(level: LevelData): readonly (readonly [number, number])[] {
  return level.id === 'frost' ? [[0, level.width]] : [];
}
export function frostGroundIdentity(kit: FrostGroundAssets | undefined, level: LevelData): string {
  return kit ? JSON.stringify([kit.manifest, kit.terrain.currentSrc || kit.terrain.src, kit.ice.currentSrc || kit.ice.src, level.surfaces.map(s => [s.x1, s.y1, s.x2, s.y2, s.material]), frostGroundWindows(level)]) : '';
}
export function validateFrostGround(value: unknown): asserts value is FrostGroundManifest {
  const m = value as FrostGroundManifest;
  if (!m || m.recipe !== 'frost-ground-ice-v1-direct440-mirror16' || Object.keys(m).sort().join() !== 'ice,recipe,terrain') throw new Error('Invalid Frost ground recipe');
  for (const [role, size, source, png] of [
    ['terrain', 440, '7e4a1c06801dbf49cd8b18e338df0dca6952e52b7232b4d9e880cdfca7f2420c', 'f6ba00cfa6ca8d4040e00fe44fd5e2510f292375a7794ff07e74632bd2cea9ab'],
    ['ice', 8, '28068fc63a0c736e46e993867c356500e509a8d89d4b60ca93934f56437be4f2', '5e849141b1af83a288f7d1a4298815cc381df3b57be8a6c73dbde9d7e96e8864'],
  ] as const) {
    const p = m[role];
    if (!p || Object.keys(p).sort().join() !== 'height,image,pngSHA256,sourceSHA256,width' || p.image !== `${role}.png` || p.width !== size || p.height !== size || p.sourceSHA256 !== source || p.pngSHA256 !== png) throw new Error(`Invalid Frost ${role} identity`);
  }
}
/** Required, never cached in the optional shared presentation promise. Retry starts fresh. */
export async function loadFrostGround(base: string, path?: string): Promise<FrostGroundAssets | undefined> {
  if (path === undefined) return undefined;
  if (path !== 'ground-ice-v1/manifest.json') throw new Error('Invalid Frost ground declaration');
  const response = await fetch(`${base}${path}`);
  if (!response.ok) throw new Error('Could not load Frost ground metadata');
  const manifest: unknown = await response.json(); validateFrostGround(manifest);
  const [terrain, ice] = await Promise.all(([manifest.terrain, manifest.ice]).map(async piece => {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve(); image.onerror = () => reject(new Error(`Could not load Frost ${piece.image}`));
      image.src = `${base}ground-ice-v1/${piece.image}`;
    });
    if (image.naturalWidth !== piece.width || image.naturalHeight !== piece.height) throw new Error(`Invalid Frost ${piece.image} dimensions`);
    return image;
  }));
  return { manifest, terrain, ice };
}
/** Exclude the full illustrated height, including the old above-contact grip stroke. */
export function clipFrostLegacy(ctx: CanvasRenderingContext2D, level: LevelData, offset: { x: number; y: number }): void {
  let left = -100000;
  ctx.beginPath();
  for (const [from, to] of frostGroundWindows(level)) {
    ctx.rect(left - offset.x, -100000, from - left, 200000); left = to;
  }
  ctx.rect(left - offset.x, -100000, 100000 - left, 200000); ctx.clip();
}
export function frostGroundColumn(level: LevelData, x: number): { origin: number; terrainX: number; iceX: number; ice: boolean } {
  const s = level.surfaces.find(s => x >= s.x1 && x < s.x2);
  if (!s) throw new Error('Frost ground gap');
  const at = (px: number): number => s.y1 + (s.y2 - s.y1) * (px - s.x1) / (s.x2 - s.x1);
  const p = ((x % 16) + 16) % 16;
  return { origin: Math.floor(Math.min(at(x), at(x + 1))), terrainX: ((x % 440) + 440) % 440, iceX: p < 8 ? p : 15 - p, ice: s.material === 'ice' };
}
/** Caller supplies the one continuous final ground clip and exact fractional camera. */
export function drawFrostGround(ctx: CanvasRenderingContext2D, kit: FrostGroundAssets | undefined, level: LevelData, offset: { x: number; y: number }): void {
  const windows = frostGroundWindows(level);
  if (!windows.length) return;
  if (!kit) throw new Error('Missing required Frost ground assets');
  validateFrostGround(kit.manifest);
  if (kit.terrain.naturalWidth !== 440 || kit.terrain.naturalHeight !== 440 || kit.ice.naturalWidth !== 8 || kit.ice.naturalHeight !== 8) throw new Error('Invalid Frost ground image dimensions');
  const identity = frostGroundIdentity(kit, level);
  if (!kit.ribbon || kit.ribbon.identity !== identity || kit.ribbon.terrain !== kit.terrain || kit.ribbon.ice !== kit.ice) {
    const ribbons = windows.map(([from, to]) => {
      const canvas = document.createElement('canvas'); canvas.width = to - from; canvas.height = 440;
      const paint = canvas.getContext('2d'); if (!paint) throw new Error('Could not prepare Frost ground ribbon');
      paint.imageSmoothingEnabled = false;
      for (let x = from; x < to; x++) {
        const c = frostGroundColumn(level, x), height = 680 - c.origin;
        if (height < 0 || height > 440) throw new Error('Frost terrain source depth exceeded');
        paint.drawImage(kit.terrain, c.terrainX, 0, 1, height, x - from, c.origin - 240, 1, height);
      }
      // Continuous physical band clips, with whole eight-row ice once on terrain backing.
      for (const s of level.surfaces) {
        if (s.material !== 'ice') continue;
        const left = Math.max(from, s.x1), right = Math.min(to, s.x2); if (right <= left) continue;
        const at = (x: number): number => s.y1 + (s.y2 - s.y1) * (x - s.x1) / (s.x2 - s.x1) - 240;
        paint.save(); paint.beginPath(); paint.moveTo(left - from, at(left)); paint.lineTo(right - from, at(right));
        paint.lineTo(right - from, at(right) + 8); paint.lineTo(left - from, at(left) + 8); paint.closePath(); paint.clip();
        for (let x = left; x < right; x++) {
          const c = frostGroundColumn(level, x);
          paint.drawImage(kit.ice, c.iceX, 0, 1, 8, x - from, c.origin - 240, 1, 8);
        }
        paint.restore();
      }
      return { from, canvas };
    });
    kit.ribbon = { identity, terrain: kit.terrain, ice: kit.ice, windows: ribbons };
  }
  ctx.save(); ctx.imageSmoothingEnabled = false;
  for (const w of kit.ribbon.windows) ctx.drawImage(w.canvas, w.from - offset.x, 240 - offset.y);
  ctx.restore();
}
