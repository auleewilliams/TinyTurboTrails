import type { InputFrame } from '../core/input';
import type { MenuTarget } from './overworld';
import type { EducationSession } from './education';

/** Like PauseMenu, this consumes rendered-frame input while simulation is stopped. */
export class EducationOverlay {
  open = false;
  revision = 0;
  private armed = false;
  constructor(private readonly session: EducationSession) {}

  showStickers(): void {
    this.revision++;
    this.open = true;
    this.armed = false;
  }
  close(): void { if (this.open) this.revision++; this.open = false; }
  get description(): string {
    return `${this.session.stickers.length}/1 stickers · Timbers TREE: ${this.session.hasWordSticker ? 'earned' : 'find the letters'}`;
  }
  update(input: InputFrame): void {
    if (input.pausePressed || input.activityPressed) { this.close(); return; }
    if (!this.armed) {
      if (!input.jumpHeld && !input.jumpPressed && input.horizontal === 0) this.armed = true;
      return;
    }
    if (input.jumpPressed) this.close();
  }
  get targets(): MenuTarget[] {
    return [{ label: 'Return to map', description: this.description, x: 138, y: 182, width: 150, height: 30,
      // Prevent MenuOverlay's map-index fallback from changing trail selection.
      selected: true, nativeSpace: true, action: () => this.close(), focus: () => {} }];
  }
  draw(ctx: CanvasRenderingContext2D): void {
    ctx.save(); ctx.fillStyle = '#0c1922e8'; ctx.fillRect(0, 0, 426, 240);
    ctx.fillStyle = '#ffda75'; ctx.textAlign = 'center'; ctx.font = 'bold 18px monospace';
    ctx.fillText('TIMBERS STICKERS', 213, 35);
    const earned = this.session.hasWordSticker;
    ctx.fillStyle = '#17333b'; ctx.fillRect(135, 51, 156, 114);
    drawTreeSticker(ctx, 213, 92, earned);
    ctx.fillStyle = '#ffda75'; ctx.font = 'bold 11px monospace';
    ctx.fillText('Timbers TREE', 213, 129);
    ctx.fillStyle = '#e9f2df'; ctx.font = '10px monospace';
    ctx.fillText(earned ? '✓ Earned this session' : this.session.wordProgress, 213, 149);
    ctx.font = '9px monospace'; ctx.fillText(`${this.session.stickers.length}/1 stickers · Reload starts fresh`, 213, 175);
    for (const target of this.targets) {
      ctx.fillStyle = '#ffda75'; ctx.fillRect(target.x, target.y, target.width, target.height);
      ctx.strokeStyle = '#bfd5ce'; ctx.strokeRect(target.x, target.y, target.width, target.height);
      ctx.fillStyle = '#0c1922'; ctx.font = 'bold 13px monospace';
      ctx.fillText(target.label, target.x + target.width / 2, target.y + target.height / 2 + 5);
    }
    ctx.font = '9px monospace'; ctx.fillStyle = '#e9f2df'; ctx.fillText('Space / face: return · Esc / Start: leave', 213, 230);
    ctx.restore();
  }
}

/** Small code-native tree sticker, separate from collectible totals. */
function drawTreeSticker(ctx: CanvasRenderingContext2D, x: number, y: number, earned: boolean): void {
  ctx.fillStyle = earned ? '#9ccf93' : '#637578';
  ctx.strokeStyle = '#e9f2df'; ctx.lineWidth = 2;
  ctx.fillRect(x - 4, y + 10, 8, 17);
  ctx.beginPath(); ctx.moveTo(x, y - 29); ctx.lineTo(x + 25, y + 12); ctx.lineTo(x - 25, y + 12); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#17333b'; ctx.font = 'bold 10px monospace'; ctx.fillText('TREE', x, y + 6);
}
