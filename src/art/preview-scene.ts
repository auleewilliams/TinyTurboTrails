import type { Scene } from '../core/scene';
import { animationFrame } from './animation';
import { ANIMATIONS, type HenryPreviewAssets } from './henry';

export class ArtPreviewScene implements Scene {
  private elapsed = 0;
  constructor(private readonly assets: HenryPreviewAssets, private readonly celebrate = false) {}
  enter(): void { this.elapsed = 0; }
  exit(): void {}
  update(seconds: number): void { this.elapsed += seconds; }

  render(ctx: CanvasRenderingContext2D): void {
    const { manifest, atlas, reference } = this.assets;
    ctx.fillStyle = '#132d36';
    ctx.fillRect(0, 0, 426, 240);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffda75';
    ctx.font = 'bold 13px monospace';
    ctx.fillText(this.celebrate ? 'HENRY / JUMP AND CHEER' : 'HENRY / STARTER ANIMATIONS', 12, 19);
    ctx.fillStyle = '#bfd5ce';
    ctx.font = '8px monospace';
    ctx.fillText('48px frames · native + 2x · right-facing', 12, 32);

    for (const [index, name] of (this.celebrate ? ['celebrate'] as const : ANIMATIONS.slice(0, 4)).entries()) {
      const x = this.celebrate ? 165 : 10 + index * 104;
      ctx.fillStyle = index % 2 ? '#dde7d3' : '#29484d';
      ctx.fillRect(x, 41, 96, 157);
      ctx.fillStyle = index % 2 ? '#29484d' : '#bfd5ce';
      ctx.font = '9px monospace';
      ctx.fillText(name.toUpperCase(), x + 5, 53);
      const clip = manifest.animations[name];
      // Replay airborne clips after a short hold so every source pose is inspectable.
      const time = clip.loop ? this.elapsed : this.elapsed % (clip.frames.length * clip.frameSeconds + 0.6);
      const reduced = this.celebrate && typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
      const id = reduced ? clip.frames[clip.frames.length - 1] : animationFrame(clip, time);
      const frame = manifest.frames[id];
      const draw = (anchorX: number, baseline: number, scale: number): void => {
        ctx.drawImage(atlas, frame.x, frame.y, frame.width, frame.height,
          anchorX - manifest.anchor.x * scale, baseline - manifest.anchor.y * scale,
          manifest.logicalSize.width * scale, manifest.logicalSize.height * scale);
        ctx.fillStyle = '#e79b63';
        ctx.fillRect(anchorX - 20 * scale, baseline, 40 * scale, 1);
        ctx.fillRect(anchorX, baseline - 2, 1, 5);
      };
      draw(x + 48, 96, 1);
      draw(x + 48, 188, 2);
    }
    // Art-direction context: the generated chunky Plains vignette from the reference.
    ctx.drawImage(reference, 840, 540, 675, 200, 308, 204, 108, 32);
    ctx.fillStyle = '#bfd5ce';
    ctx.font = '8px monospace';
    ctx.fillText('Esc: pause frames    M: mute', 12, 215);
    ctx.fillText('Reference + metadata: docs/art', 12, 228);
  }
}
