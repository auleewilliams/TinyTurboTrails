import type { Facing } from '../game/movement';
import type { SpriteFrame } from './henry';

/** Draws an atlas frame at (x, y), mirroring it horizontally in place when facing left. */
export function drawFacingSprite(
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource,
  frame: SpriteFrame,
  x: number,
  y: number,
  width: number,
  height: number,
  facing: Facing,
): void {
  if (facing === 1) {
    ctx.drawImage(image, frame.x, frame.y, frame.width, frame.height, x, y, width, height);
    return;
  }
  ctx.save();
  ctx.translate(x + width, y);
  ctx.scale(-1, 1);
  ctx.drawImage(image, frame.x, frame.y, frame.width, frame.height, 0, 0, width, height);
  ctx.restore();
}
