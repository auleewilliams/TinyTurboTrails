import type { Scene } from '../core/scene';
import type { InputFrame } from '../core/input';
import { Camera } from './camera';
import { DEFAULT_LEVEL } from './levels';
import type { LevelData } from './level';
import { drawWorld, drawWorldForeground } from './renderer';
import type { WorldAssets } from './assets';

export class WorldPreviewScene implements Scene {
  private elapsed = 0;
  private targetX: number;
  private targetY: number;
  private readonly camera: Camera;
  constructor(private readonly assets: WorldAssets, private readonly level: LevelData = DEFAULT_LEVEL) {
    this.targetX = level.start.x;
    this.targetY = level.start.y;
    this.camera = new Camera({ width: 426, height: 240, worldWidth: level.width, worldHeight: level.height });
  }
  enter(): void { this.elapsed = 0; }
  exit(): void {}
  update(seconds: number, input: InputFrame): void {
    this.elapsed += seconds;
    this.targetX = Math.max(this.level.minX, Math.min(this.level.maxX, this.targetX + input.horizontal * 90 * seconds));
    this.targetY = 132 + Math.sin(this.elapsed * 1.3) * 4;
    this.camera.update(this.targetX, this.targetY);
  }
  render(ctx: CanvasRenderingContext2D): void {
    drawWorld(ctx, this.assets, this.level, this.camera);
    drawWorldForeground(ctx, this.assets, this.level, this.camera);
    ctx.fillStyle = '#e9f2df';
    ctx.font = 'bold 12px monospace';
    ctx.fillText('PLAINS WORLD DATA PREVIEW', 12, 18);
    ctx.font = '8px monospace';
    ctx.fillText('Arrows/A-D move camera · generated atlas + level data', 12, 31);
    ctx.fillText(`camera ${Math.round(this.camera.position.x)} / ${this.level.width}`, 12, 232);
  }
}
