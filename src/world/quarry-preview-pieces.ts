import type { PlatformBody } from '../game/movement';
export interface QuarryPreviewPiece { image: string; width: number; height: number; from: { x: number; y: number }; to: { x: number; y: number }; seconds: number; pause: number }
export interface QuarryPreviewManifest { version: number; scope: string; platforms: Record<string, QuarryPreviewPiece> }
export interface QuarryPreviewAssets { manifest: QuarryPreviewManifest; images: Record<string, HTMLImageElement> }
/** Twelve additions only; the accepted four-S resources remain independent. */
export function quarryPreviewPieces(): Record<string, QuarryPreviewPiece> {
  const pieces: Record<string, QuarryPreviewPiece> = {};
  for (const [id, y] of [['quarry-b-upper-dock', 420], ['quarry-b-lower-dock', 700]] as const) pieces[id] = { image: 'dock-60.png', width: 60, height: 12, from: { x: 600, y }, to: { x: 600, y }, seconds: 1, pause: 0 };
  for (const y of [444, 514, 584, 654, 724]) for (const side of ['inner', 'outer']) {
    if (y === 654 && side === 'inner') continue;
    const width = side === 'inner' ? 108 : 112, x = side === 'inner' ? 600 : 708;
    pieces[`quarry-right-${side}-${y}`] = { image: `catch-${width}.png`, width, height: 24, from: { x, y }, to: { x, y }, seconds: 1, pause: 0 };
  }
  pieces['quarry-lift-b'] = { image: 'carriage-96.png', width: 96, height: 17, from: { x: 660, y: 420 }, to: { x: 660, y: 700 }, seconds: 4, pause: 1.5 };
  return pieces;
}
export function validateQuarryPreviewPieces(value: unknown): asserts value is QuarryPreviewManifest {
  const data = value as QuarryPreviewManifest, expected = quarryPreviewPieces();
  if (!data || data.version !== 1 || data.scope !== 'remaining12-original-representative-preview' || !data.platforms || Object.keys(data.platforms).length !== 12) throw new Error('Invalid Quarry preview coverage');
  for (const [id, piece] of Object.entries(expected)) {
    const p = data.platforms[id];
    if (!p || p.image !== piece.image || p.width !== piece.width || p.height !== piece.height || p.from?.x !== piece.from.x || p.from.y !== piece.from.y || p.to?.x !== piece.to.x || p.to.y !== piece.to.y || p.seconds !== piece.seconds || p.pause !== piece.pause) throw new Error(`Invalid Quarry preview piece: ${id}`);
  }
}
/** Required resources; fresh loading after ordinary Retry never reuses failed promises. */
export async function loadQuarryPreviewPieces(base: string): Promise<QuarryPreviewAssets> {
  const response = await fetch(`${base}representative-v1/manifest.json`);
  if (!response.ok) throw new Error('Could not load Quarry preview metadata');
  const manifest: unknown = await response.json(); validateQuarryPreviewPieces(manifest);
  const files = new Map(Object.values(manifest.platforms).map(p => [p.image, p]));
  const loaded = new Map(await Promise.all([...files].map(async ([file, piece]) => {
    const image = new Image();
    await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error(`Could not load Quarry preview image: ${file}`)); image.src = `${base}representative-v1/${file}`; });
    if (image.naturalWidth !== piece.width || image.naturalHeight !== piece.height) throw new Error(`Invalid Quarry preview image dimensions: ${file}`);
    return [file, image] as const;
  })));
  return { manifest, images: Object.fromEntries(Object.entries(manifest.platforms).map(([id, p]) => [id, loaded.get(p.image)!])) };
}
export function drawQuarryPreviewPiece(ctx: CanvasRenderingContext2D, kit: QuarryPreviewAssets, body: PlatformBody, offset: { x: number; y: number }): boolean {
  const expected = quarryPreviewPieces()[body.id]; if (!expected) return false;
  const p = kit.manifest.platforms[body.id], image = kit.images[body.id];
  if (!p || !image || p.width !== body.width || p.width !== expected.width || p.height !== expected.height || body.x !== expected.from.x || body.y < expected.from.y || body.y > expected.to.y) throw new Error(`Missing or misaligned Quarry preview piece: ${body.id}`);
  ctx.drawImage(image, body.x - offset.x, body.y - offset.y); return true;
}
