import type { PlatformBody } from '../game/movement';

export interface QuarryShelfPiece { image: string; width: number; height: number }
export interface QuarryShelvesManifest { version: number; scope: string; platforms: Record<string, QuarryShelfPiece> }
export interface QuarryShelvesAssets { manifest: QuarryShelvesManifest; images: Record<string, HTMLImageElement> }

/** This is deliberately a four-ID pilot, not a complete Quarry kit. */
export function quarryShelfPieces(): Record<string, QuarryShelfPiece> {
  return {
    'quarry-upper': { image: 'shelf-400.png', width: 400, height: 45 },
    'quarry-mine': { image: 'shelf-400.png', width: 400, height: 45 },
    'quarry-terrace-4': { image: 'shelf-160.png', width: 160, height: 32 },
    'quarry-terrace-5': { image: 'shelf-240.png', width: 240, height: 37 },
  };
}
export function validateQuarryShelves(value: unknown): asserts value is QuarryShelvesManifest {
  const data = value as QuarryShelvesManifest, expected = quarryShelfPieces();
  if (!data || data.version !== 1 || data.scope !== 'four-fixed-shelves-pilot' || !data.platforms
    || Object.keys(data.platforms).length !== Object.keys(expected).length) throw new Error('Invalid Quarry shelf coverage');
  for (const [id, piece] of Object.entries(expected)) {
    const actual = data.platforms[id];
    if (!actual || actual.image !== piece.image || actual.width !== piece.width || actual.height !== piece.height) throw new Error(`Invalid Quarry shelf: ${id}`);
  }
}
/** Required by the adventure asset map. No failed request is cached; normal Retry starts fresh. */
export async function loadQuarryShelves(base: string): Promise<QuarryShelvesAssets> {
  const response = await fetch(`${base}whole-ledges-v1/manifest.json`);
  if (!response.ok) throw new Error('Could not load Quarry shelf metadata');
  const manifest: unknown = await response.json(); validateQuarryShelves(manifest);
  const files = new Map(Object.values(manifest.platforms).map(piece => [piece.image, piece]));
  const loaded = new Map(await Promise.all([...files].map(async ([file, piece]) => {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve(); image.onerror = () => reject(new Error(`Could not load Quarry shelf image: ${file}`));
      image.src = `${base}whole-ledges-v1/${file}`;
    });
    if (image.naturalWidth !== piece.width || image.naturalHeight !== piece.height) throw new Error(`Invalid Quarry shelf dimensions: ${file}`);
    return [file, image] as const;
  })));
  return { manifest, images: Object.fromEntries(Object.entries(manifest.platforms).map(([id, piece]) => [id, loaded.get(piece.image)!])) };
}
export function drawQuarryShelf(ctx: CanvasRenderingContext2D, kit: QuarryShelvesAssets, body: PlatformBody, offset: { x: number; y: number }): boolean {
  const expected = quarryShelfPieces()[body.id];
  if (!expected) return false;
  const piece = kit.manifest.platforms[body.id], image = kit.images[body.id];
  if (!piece || !image || piece.width !== body.width || piece.width !== expected.width || piece.height !== expected.height) throw new Error(`Missing or misaligned Quarry shelf: ${body.id}`);
  ctx.drawImage(image, body.x - offset.x, body.y - offset.y);
  return true;
}
