import type { PlatformBody } from '../game/movement';

export interface FrostLedgePiece { image: string; width: number; height: number; variant: number }
export interface FrostLedgeManifest { version: number; diagnosticTrial: boolean; platforms: Record<string, FrostLedgePiece> }
export interface FrostLedgeAssets { manifest: FrostLedgeManifest; platforms: Record<string, HTMLImageElement> }

export function validateFrostLedges(value: unknown): asserts value is FrostLedgeManifest {
  const data = value as FrostLedgeManifest;
  const expected: Record<string, readonly [number, number, number]> = {
    'frost-return-4': [2, 180, 24], 'frost-return-5': [4, 210, 33],
    'frost-return-9': [6, 200, 33], 'frost-return-10': [5, 200, 33],
  };
  if (!data || data.version !== 1 || data.diagnosticTrial !== true || !data.platforms
    || Object.keys(data.platforms).sort().join() !== Object.keys(expected).sort().join()) throw new Error('Invalid Frost trial metadata');
  for (const [id, [variant, width, height]] of Object.entries(expected)) {
    const piece = data.platforms[id];
    if (!piece || piece.variant !== variant || piece.width !== width || piece.height !== height
      || piece.image !== `ledge-v${variant}-${width}.png`) throw new Error(`Invalid Frost trial piece: ${id}`);
  }
}

/** Required declared assets participate in the existing per-world load/retry path. */
export async function loadFrostLedges(base: string, path?: string): Promise<FrostLedgeAssets | undefined> {
  if (path === undefined) return undefined;
  if (path !== 'ledge-trial-v1/manifest.json') throw new Error('Invalid Frost trial declaration');
  const response = await fetch(`${base}${path}`);
  if (!response.ok) throw new Error('Could not load Frost trial metadata');
  const manifest: unknown = await response.json();
  validateFrostLedges(manifest);
  const platforms = Object.fromEntries(await Promise.all(Object.entries(manifest.platforms).map(async ([id, piece]) => {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve(); image.onerror = () => reject(new Error(`Could not load Frost ledge: ${id}`));
      image.src = `${base}ledge-trial-v1/${piece.image}`;
    });
    if (image.naturalWidth !== piece.width || image.naturalHeight !== piece.height) throw new Error(`Invalid Frost ledge dimensions: ${id}`);
    return [id, image];
  })));
  return { manifest, platforms };
}

/** Native image width and top coincide with the collider. Other six supports keep their existing paint. */
export function drawFrostLedge(ctx: CanvasRenderingContext2D, kit: FrostLedgeAssets,
  body: PlatformBody, offset: { x: number; y: number }): boolean {
  const piece = kit.manifest.platforms[body.id];
  if (!piece) return false;
  const image = kit.platforms[body.id];
  if (!image || piece.width !== body.width) throw new Error(`Misaligned Frost trial ledge: ${body.id}`);
  ctx.drawImage(image, body.x - offset.x, body.y - offset.y);
  return true;
}
