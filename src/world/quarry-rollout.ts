import type { PlatformBody } from '../game/movement';
export interface QuarryRolloutPiece { image: string; width: number; height: number; from: { x: number; y: number }; to: { x: number; y: number }; seconds: number; pause: number }
export interface QuarryRolloutManifest { version: number; scope: string; floorStatus: 'approved-native-floor'; platforms: Record<string, QuarryRolloutPiece> }
export interface QuarryRolloutAssets { manifest: QuarryRolloutManifest; images: Record<string, HTMLImageElement> }
/** Remaining29 supports only; the accepted16 resources remain independent. G is approved in its independent floor kit. */
export function quarryRolloutPieces(): Record<string, QuarryRolloutPiece> {
  return {
    'quarry-rim': {'image': 'shelf-360.png', 'width': 360, 'height': 41, 'from': {'x': 160, 'y': 140}, 'to': {'x': 160, 'y': 140}, 'seconds': 1, 'pause': 0},
    'quarry-terrace-1': {'image': 'rock-140.png', 'width': 140, 'height': 30, 'from': {'x': 440, 'y': 210}, 'to': {'x': 440, 'y': 210}, 'seconds': 1, 'pause': 0},
    'quarry-terrace-2': {'image': 'shelf-240.png', 'width': 240, 'height': 27, 'from': {'x': 280, 'y': 280}, 'to': {'x': 280, 'y': 280}, 'seconds': 1, 'pause': 0},
    'quarry-star-upper': {'image': 'star-160.png', 'width': 160, 'height': 35, 'from': {'x': 600, 'y': 280}, 'to': {'x': 600, 'y': 280}, 'seconds': 1, 'pause': 0},
    'quarry-terrace-3': {'image': 'shelf-180.png', 'width': 180, 'height': 28, 'from': {'x': 180, 'y': 350}, 'to': {'x': 180, 'y': 350}, 'seconds': 1, 'pause': 0},
    'quarry-terrace-6': {'image': 'shelf-220.png', 'width': 220, 'height': 25, 'from': {'x': 180, 'y': 630}, 'to': {'x': 180, 'y': 630}, 'seconds': 1, 'pause': 0},
    'quarry-terrace-7': {'image': 'shelf-180.png', 'width': 180, 'height': 28, 'from': {'x': 420, 'y': 770}, 'to': {'x': 420, 'y': 770}, 'seconds': 1, 'pause': 0},
    'quarry-terrace-8': {'image': 'shelf-260.png', 'width': 260, 'height': 30, 'from': {'x': 280, 'y': 840}, 'to': {'x': 280, 'y': 840}, 'seconds': 1, 'pause': 0},
    'quarry-star-lower': {'image': 'star-160.png', 'width': 160, 'height': 35, 'from': {'x': 600, 'y': 840}, 'to': {'x': 600, 'y': 840}, 'seconds': 1, 'pause': 0},
    'quarry-terrace-9': {'image': 'shelf-200.png', 'width': 200, 'height': 23, 'from': {'x': 180, 'y': 910}, 'to': {'x': 180, 'y': 910}, 'seconds': 1, 'pause': 0},
    'quarry-left-outer-164': {'image': 'rock-112.png', 'width': 112, 'height': 24, 'from': {'x': 0, 'y': 164}, 'to': {'x': 0, 'y': 164}, 'seconds': 1, 'pause': 0},
    'quarry-left-inner-164': {'image': 'rock-112.png', 'width': 112, 'height': 24, 'from': {'x': 112, 'y': 164}, 'to': {'x': 112, 'y': 164}, 'seconds': 1, 'pause': 0},
    'quarry-left-outer-234': {'image': 'rock-112.png', 'width': 112, 'height': 24, 'from': {'x': 0, 'y': 234}, 'to': {'x': 0, 'y': 234}, 'seconds': 1, 'pause': 0},
    'quarry-left-inner-234': {'image': 'rock-112.png', 'width': 112, 'height': 24, 'from': {'x': 112, 'y': 234}, 'to': {'x': 112, 'y': 234}, 'seconds': 1, 'pause': 0},
    'quarry-left-outer-304': {'image': 'rock-112.png', 'width': 112, 'height': 24, 'from': {'x': 0, 'y': 304}, 'to': {'x': 0, 'y': 304}, 'seconds': 1, 'pause': 0},
    'quarry-left-inner-304': {'image': 'rock-112.png', 'width': 112, 'height': 24, 'from': {'x': 112, 'y': 304}, 'to': {'x': 112, 'y': 304}, 'seconds': 1, 'pause': 0},
    'quarry-left-outer-374': {'image': 'rock-112.png', 'width': 112, 'height': 24, 'from': {'x': 0, 'y': 374}, 'to': {'x': 0, 'y': 374}, 'seconds': 1, 'pause': 0},
    'quarry-left-outer-444': {'image': 'rock-112.png', 'width': 112, 'height': 24, 'from': {'x': 0, 'y': 444}, 'to': {'x': 0, 'y': 444}, 'seconds': 1, 'pause': 0},
    'quarry-left-inner-444': {'image': 'rock-112.png', 'width': 112, 'height': 24, 'from': {'x': 112, 'y': 444}, 'to': {'x': 112, 'y': 444}, 'seconds': 1, 'pause': 0},
    'quarry-left-outer-724': {'image': 'rock-112.png', 'width': 112, 'height': 24, 'from': {'x': 0, 'y': 724}, 'to': {'x': 0, 'y': 724}, 'seconds': 1, 'pause': 0},
    'quarry-left-inner-724': {'image': 'rock-112.png', 'width': 112, 'height': 24, 'from': {'x': 112, 'y': 724}, 'to': {'x': 112, 'y': 724}, 'seconds': 1, 'pause': 0},
    'quarry-left-outer-794': {'image': 'rock-112.png', 'width': 112, 'height': 24, 'from': {'x': 0, 'y': 794}, 'to': {'x': 0, 'y': 794}, 'seconds': 1, 'pause': 0},
    'quarry-left-inner-794': {'image': 'rock-112.png', 'width': 112, 'height': 24, 'from': {'x': 112, 'y': 794}, 'to': {'x': 112, 'y': 794}, 'seconds': 1, 'pause': 0},
    'quarry-left-outer-864': {'image': 'rock-112.png', 'width': 112, 'height': 24, 'from': {'x': 0, 'y': 864}, 'to': {'x': 0, 'y': 864}, 'seconds': 1, 'pause': 0},
    'quarry-left-inner-864': {'image': 'rock-112.png', 'width': 112, 'height': 24, 'from': {'x': 112, 'y': 864}, 'to': {'x': 112, 'y': 864}, 'seconds': 1, 'pause': 0},
    'quarry-left-outer-934': {'image': 'rock-112.png', 'width': 112, 'height': 24, 'from': {'x': 0, 'y': 934}, 'to': {'x': 0, 'y': 934}, 'seconds': 1, 'pause': 0},
    'quarry-left-inner-934': {'image': 'rock-112.png', 'width': 112, 'height': 24, 'from': {'x': 112, 'y': 934}, 'to': {'x': 112, 'y': 934}, 'seconds': 1, 'pause': 0},
    'quarry-lift-a': {'image': 'carriage-96.png', 'width': 96, 'height': 17, 'from': {'x': 64, 'y': 140}, 'to': {'x': 64, 'y': 420}, 'seconds': 4, 'pause': 1.5},
    'quarry-lift-c': {'image': 'carriage-96.png', 'width': 96, 'height': 17, 'from': {'x': 64, 'y': 700}, 'to': {'x': 64, 'y': 980}, 'seconds': 4, 'pause': 1.5},
  };
}
export function validateQuarryRollout(value: unknown): asserts value is QuarryRolloutManifest {
  const data = value as QuarryRolloutManifest, expected = quarryRolloutPieces();
  if (!data || data.version !== 1 || data.scope !== 'remaining29-nonfloor-rollout' || !data.platforms || data.floorStatus !== 'approved-native-floor' || Object.keys(data.platforms).length !== 29) throw new Error('Invalid Quarry rollout coverage');
  for (const [id, piece] of Object.entries(expected)) {
    const p = data.platforms[id];
    if (!p || p.image !== piece.image || p.width !== piece.width || p.height !== piece.height || p.from?.x !== piece.from.x || p.from.y !== piece.from.y || p.to?.x !== piece.to.x || p.to.y !== piece.to.y || p.seconds !== piece.seconds || p.pause !== piece.pause) throw new Error(`Invalid Quarry rollout piece: ${id}`);
  }
}
/** Required resources; fresh loading after ordinary Retry never reuses failed promises. */
export async function loadQuarryRollout(base: string): Promise<QuarryRolloutAssets> {
  const response = await fetch(`${base}rollout-v1/manifest.json`);
  if (!response.ok) throw new Error('Could not load Quarry rollout metadata');
  const manifest: unknown = await response.json(); validateQuarryRollout(manifest);
  const files = new Map(Object.values(manifest.platforms).map(p => [p.image, p]));
  const loaded = new Map(await Promise.all([...files].map(async ([file, piece]) => {
    const image = new Image();
    await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error(`Could not load Quarry rollout image: ${file}`)); image.src = `${base}rollout-v1/${file}`; });
    if (image.naturalWidth !== piece.width || image.naturalHeight !== piece.height) throw new Error(`Invalid Quarry rollout image dimensions: ${file}`);
    return [file, image] as const;
  })));
  return { manifest, images: Object.fromEntries(Object.entries(manifest.platforms).map(([id, p]) => [id, loaded.get(p.image)!])) };
}
export function drawQuarryRollout(ctx: CanvasRenderingContext2D, kit: QuarryRolloutAssets, body: PlatformBody, offset: { x: number; y: number }): boolean {
  const expected = quarryRolloutPieces()[body.id]; if (!expected) return false;
  if (!kit?.manifest || !kit.images) throw new Error(`Missing Quarry rollout kit: ${body.id}`);
  const p = kit.manifest.platforms[body.id], image = kit.images[body.id];
  if (!p || !image || p.width !== body.width || p.width !== expected.width || p.height !== expected.height || body.x !== expected.from.x || body.y < expected.from.y || body.y > expected.to.y) throw new Error(`Missing or misaligned Quarry rollout piece: ${body.id}`);
  ctx.drawImage(image, body.x - offset.x, body.y - offset.y); return true;
}
