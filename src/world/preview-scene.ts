import type { Scene } from '../core/scene';
import type { InputFrame } from '../core/input';
import { Camera } from './camera';
import { PLAINS_LEVEL } from './level';
import { drawWorld } from './renderer';
import type { WorldAssets } from './assets';

export class WorldPreviewScene implements Scene {
  private elapsed = 0;
  private targetX = PLAINS_LEVEL.start.x;
  private targetY = PLAINS_LEVEL.start.y;
  private readonly camera = new Camera({ width: 426, height: 240, worldWidth: PLAINS_LEVEL.width, worldHeight: PLAINS_LEVEL.height });
  constructor(private readonly assets: WorldAssets) {}
  enter(): void { this.elapsed = 0; }
  exit(): void {}
  update(seconds: number, input: InputFrame): void {
    this.elapsed += seconds;
    this.targetX = Math.max(0, Math.min(PLAINS_LEVEL.width, this.targetX + input.horizontal * 90 * seconds));
    this.targetY = 132 + Math.sin(this.elapsed * 1.3) * 4;
    this.camera.update(this.targetX, this.targetY);
  }
  render(ctx: CanvasRenderingContext2D): void {
    drawWorld(ctx, this.assets, PLAINS_LEVEL, this.camera);
    ctx.fillStyle = '#e9f2df';
    ctx.font = 'bold 12px monospace';
    ctx.fillText('PLAINS WORLD DATA PREVIEW', 12, 18);
    ctx.font = '8px monospace';
    ctx.fillText('Arrows/A-D move camera · generated atlas + level data', 12, 31);
    ctx.fillText(`camera ${Math.round(this.camera.position.x)} / ${PLAINS_LEVEL.width}`, 12, 232);
  }
}
