import type { LevelData } from './level';

export interface QuarryFloorManifest {
  version: number; scope: string; image: string; width: number; height: number;
  x: number; y: number; visibleHeight: number; worldBottom: number; PNGsha256: string; RGBAsha256: string;
}
export interface QuarryFloorAssets { manifest: QuarryFloorManifest; image: HTMLImageElement }
export function validateQuarryFloor(value: unknown): asserts value is QuarryFloorManifest {
  const expected: QuarryFloorManifest = { version: 1, scope: 'approved-G01-floor', image: 'floor-820.png', width: 820, height: 107,
    x: 0, y: 980, visibleHeight: 100, worldBottom: 1080,
    PNGsha256: 'a36989f622677db21173d5c1bf2fa4025bfb4fd95df1c7278d28119639981fa9',
    RGBAsha256: '9ed5ec56a821dc6c5e00de900ab434a0259b43632e68af0f0b052ec5991f1bdc' };
  if (!value || Object.entries(expected).some(([key, v]) => (value as Record<string, unknown>)[key] !== v)) throw new Error('Invalid Quarry floor metadata');
}
/** Required, uncached resources: ordinary Retry fetches metadata and image again. */
export async function loadQuarryFloor(base: string): Promise<QuarryFloorAssets> {
  const response = await fetch(`${base}floor-v1/manifest.json`);
  if (!response.ok) throw new Error('Could not load Quarry floor metadata');
  const manifest: unknown = await response.json(); validateQuarryFloor(manifest);
  const image = new Image();
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve(); image.onerror = () => reject(new Error('Could not load Quarry floor image'));
    image.src = `${base}floor-v1/${manifest.image}`;
  });
  if (image.naturalWidth !== 820 || image.naturalHeight !== 107) throw new Error('Invalid Quarry floor image dimensions');
  return { manifest, image };
}
export function drawQuarryFloor(ctx: CanvasRenderingContext2D, kit: QuarryFloorAssets | undefined, level: LevelData, offset: { x: number; y: number }): void {
  if (!kit?.image || !kit.manifest) throw new Error('Missing required Quarry floor');
  validateQuarryFloor(kit.manifest);
  const s = level.surfaces[0];
  if (level.id !== 'quarry' || level.width !== 820 || level.height !== 1080 || level.surfaces.length !== 1
    || s.x1 !== 0 || s.x2 !== 820 || s.y1 !== 980 || s.y2 !== 980
    || kit.image.naturalWidth !== 820 || kit.image.naturalHeight !== 107) throw new Error('Misaligned Quarry floor');
  ctx.drawImage(kit.image, -offset.x, 980 - offset.y);
}
