import type { Scene } from '../core/scene';
import { animationFrame } from '../art/animation';
import { animationFor, createPlayer, launchSpring, simulatePlayer, DEFAULT_MOVEMENT, type Player, type Terrain } from './movement';
import type { HenryAssets } from '../art/henry';
import { drawFacingSprite } from '../art/sprite';
import type { InputFrame } from '../core/input';

const COURSE: Terrain = {
  minX: 18,
  maxX: 408,
  surfaces: [
    { x1: 18, x2: 126, y1: 198, y2: 198 },
    { x1: 126, x2: 202, y1: 198, y2: 156 },
    { x1: 202, x2: 300, y1: 156, y2: 156 },
    { x1: 300, x2: 408, y1: 198, y2: 198 },
  ],
};

export class MovementPreviewScene implements Scene {
  private readonly player: Player = createPlayer(42, COURSE);
  private elapsed = 0;
  private springCooldown = 0;
  constructor(private readonly assets: HenryAssets) {}
  enter(): void { this.elapsed = 0; }
  exit(): void {}
  update(seconds: number, input: InputFrame): void {
    this.elapsed += seconds;
    this.springCooldown = Math.max(0, this.springCooldown - seconds);
    simulatePlayer(this.player, input, COURSE, seconds);
    if (this.springCooldown === 0 && this.player.onGround && this.player.x > 214 && this.player.x < 234) {
      launchSpring(this.player);
      this.springCooldown = 0.6;
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    const { atlas, manifest } = this.assets;
    ctx.fillStyle = '#17333b';
    ctx.fillRect(0, 0, 426, 240);
    ctx.fillStyle = '#ffda75';
    ctx.font = 'bold 13px monospace';
    ctx.fillText('HENRY / MOVEMENT TEST COURSE', 12, 19);
    ctx.fillStyle = '#bfd5ce';
    ctx.font = '8px monospace';
    ctx.fillText('Arrows or A/D · Space jump · spring · max speed', 12, 32);
    ctx.fillStyle = '#294f55';
    ctx.fillRect(0, 204, 426, 36);
    ctx.fillStyle = '#73b83f';
    for (const surface of COURSE.surfaces) {
      ctx.beginPath();
      ctx.moveTo(surface.x1, surface.y1);
      ctx.lineTo(surface.x2, surface.y2);
      ctx.lineTo(surface.x2, 240);
      ctx.lineTo(surface.x1, 240);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#c5e95b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(surface.x1, surface.y1);
      ctx.lineTo(surface.x2, surface.y2);
      ctx.stroke();
    }
    ctx.fillStyle = '#ff8d38';
    ctx.fillRect(217, 149, 6, 7);
    ctx.fillStyle = '#e9f2df';
    ctx.font = '8px monospace';
    ctx.fillText(`vx ${Math.round(this.player.vx)}  vy ${Math.round(this.player.vy)}  ${animationFor(this.player)}`, 12, 233);

    const name = animationFor(this.player);
    const clip = manifest.animations[name];
    const id = animationFrame(clip, this.elapsed);
    const frame = manifest.frames[id];
    drawFacingSprite(ctx, atlas, frame,
      this.player.x - manifest.anchor.x, this.player.y + DEFAULT_MOVEMENT.height - manifest.anchor.y,
      manifest.logicalSize.width, manifest.logicalSize.height, this.player.facing);
  }
}
