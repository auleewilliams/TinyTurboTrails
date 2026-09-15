import type { Scene } from './core/scene';

/** Diagnostic drawing only; generated character and world art arrive in #2/#4. */
export class FoundationScene implements Scene {
  private elapsed = 0;
  enter(): void { this.elapsed = 0; }
  exit(): void {}
  update(seconds: number): void { this.elapsed += seconds; }

  render(context: CanvasRenderingContext2D): void {
    context.fillStyle = '#162d38';
    context.fillRect(0, 0, 426, 240);
    context.fillStyle = '#223f49';
    for (let x = 0; x < 426; x += 16) context.fillRect(x, 180, 1, 60);
    for (let y = 180; y < 240; y += 16) context.fillRect(0, y, 426, 1);
    context.textAlign = 'center';
    context.fillStyle = '#ffda75';
    context.font = 'bold 24px monospace';
    context.fillText('TINY TURBO TRAILS', 213, 72);
    context.fillStyle = '#e9f2df';
    context.font = '12px monospace';
    context.fillText('The trail starts here.', 213, 99);
    context.fillStyle = '#a4bdb7';
    context.font = '10px monospace';
    context.fillText('FOUNDATION PREVIEW', 213, 133);
    context.fillText('Escape: pause   M: mute', 213, 151);
    // Moving timing marker makes pause/focus checks visible without gameplay.
    context.fillStyle = '#ffda75';
    context.fillRect(24 + Math.floor((this.elapsed * 40) % 370), 193, 8, 8);
  }
}
