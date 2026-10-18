import type { InputFrame } from '../core/input';
import type { MenuTarget } from './overworld';
import type { EducationSession } from './education';

/** Like PauseMenu, this consumes rendered-frame input while simulation is stopped. */
export class EducationOverlay {
  open = false;
  revision = 0;
  message = '';
  kind: 'maths' | 'stickers' = 'maths';
  private selected = 0;
  private direction = 0;
  private armed = false;
  constructor(private readonly session: EducationSession) {}

  showMaths(): void {
    this.show('maths');
    this.message = this.session.mathsComplete ? 'Already complete · sticker collected!' : 'Choose an answer. Leave any time.';
  }
  showStickers(): void { this.show('stickers'); }
  private show(kind: 'maths' | 'stickers'): void {
    this.kind = kind; this.revision++;
    this.open = true; this.selected = 0; this.direction = 0; this.armed = false;
  }
  close(): void { if (this.open) this.revision++; this.open = false; }
  get description(): string {
    if (this.kind === 'stickers') return `${this.session.stickers.length}/2 stickers · Timbers TREE: ${this.session.hasWordSticker ? 'earned' : 'find the letters'} · Timbers number leaf: ${this.session.mathsComplete ? 'earned' : 'try optional maths'}`;
    const { left, right, operation } = this.session.maths;
    return `Optional maths · ${left} ${operation} ${right} = ? · ${this.message}`;
  }
  update(input: InputFrame): void {
    if (input.pausePressed || input.activityPressed) { this.close(); return; }
    if (!this.armed) {
      if (!input.jumpHeld && !input.jumpPressed && input.horizontal === 0) this.armed = true;
      return;
    }
    const direction = Math.sign(input.horizontal);
    if (direction && direction !== this.direction) this.selected = (this.selected + direction + this.targets.length) % this.targets.length;
    this.direction = direction;
    if (input.jumpPressed) this.targets[this.selected].action();
  }
  private answer(choice: number): void {
    if (this.session.answerMaths(choice)) {
      this.message = 'Sticker earned · Timbers number leaf!'; this.selected = 0; this.armed = false;
    } else this.message = 'Try again · no hearts lost.';
  }
  get targets(): MenuTarget[] {
    if (this.kind === 'stickers') return [{ label: 'Return to map', description: this.description, x: 138, y: 182, width: 150, height: 30,
      selected: true, nativeSpace: true, action: () => this.close(), focus: () => { this.selected = 0; } }];
    const choices: MenuTarget[] = this.session.mathsComplete ? [] : this.session.maths.choices.map((choice, index) => ({
      label: `Answer ${choice}`, description: this.description, x: 51 + index * 110, y: 108, width: 104, height: 36,
      selected: this.selected === index, nativeSpace: true, focus: () => { this.selected = index; }, action: () => this.answer(choice),
    }));
    return [...choices, { label: 'Leave activity', description: this.message, x: 138, y: 182, width: 150, height: 30,
      selected: this.selected === choices.length, nativeSpace: true, focus: () => { this.selected = choices.length; }, action: () => this.close() }];
  }
  draw(ctx: CanvasRenderingContext2D): void {
    ctx.save(); ctx.fillStyle = '#0c1922e8'; ctx.fillRect(0, 0, 426, 240);
    ctx.fillStyle = '#ffda75'; ctx.textAlign = 'center'; ctx.font = 'bold 18px monospace';
    ctx.fillText(this.kind === 'maths' ? 'TIMBERS MATHS' : 'TIMBERS STICKERS', 213, 35);
    if (this.kind === 'stickers') {
      for (const [index, kind] of (['tree', 'leaf'] as const).entries()) {
        const earned = kind === 'tree' ? this.session.hasWordSticker : this.session.mathsComplete;
        const x = 125 + index * 176;
        ctx.fillStyle = '#17333b'; ctx.fillRect(x - 78, 51, 156, 114);
        drawSticker(ctx, kind, x, 92, earned);
        ctx.fillStyle = '#ffda75'; ctx.font = 'bold 11px monospace';
        ctx.fillText(kind === 'tree' ? 'Timbers TREE' : 'Number leaf', x, 129);
        ctx.fillStyle = '#e9f2df'; ctx.font = '10px monospace';
        ctx.fillText(earned ? '✓ Earned this session' : kind === 'tree' ? this.session.wordProgress : 'Try optional maths', x, 149);
      }
      ctx.font = '9px monospace'; ctx.fillStyle = '#e9f2df'; ctx.fillText(`${this.session.stickers.length}/2 stickers · Reload starts fresh`, 213, 175);
    } else {
      const { left, right, operation } = this.session.maths;
      ctx.font = 'bold 25px monospace'; ctx.fillText(`${left} ${operation} ${right} = ?`, 213, 78);
      if (this.session.mathsComplete) drawSticker(ctx, 'leaf', 213, 120, true);
      ctx.font = '10px monospace'; ctx.fillStyle = '#e9f2df'; ctx.fillText(this.message, 213, 164);
    }
    for (const target of this.targets) {
      ctx.fillStyle = target.selected ? '#ffda75' : '#17333b'; ctx.fillRect(target.x, target.y, target.width, target.height);
      ctx.strokeStyle = '#bfd5ce'; ctx.strokeRect(target.x, target.y, target.width, target.height);
      ctx.fillStyle = target.selected ? '#0c1922' : '#e9f2df'; ctx.font = 'bold 13px monospace';
      ctx.fillText(target.label.replace('Answer ', ''), target.x + target.width / 2, target.y + target.height / 2 + 5);
    }
    ctx.font = '9px monospace'; ctx.fillStyle = '#e9f2df'; ctx.fillText('← → Choose · Space / face: select · Esc / Start: leave', 213, 230);
    ctx.restore();
  }
}


/** Small code-native stickers with different silhouettes, never collectible totals. */
function drawSticker(ctx: CanvasRenderingContext2D, kind: 'tree' | 'leaf', x: number, y: number, earned: boolean): void {
  ctx.fillStyle = earned ? '#9ccf93' : '#637578';
  ctx.strokeStyle = '#e9f2df'; ctx.lineWidth = 2;
  if (kind === 'tree') {
    ctx.fillRect(x - 4, y + 10, 8, 17);
    ctx.beginPath(); ctx.moveTo(x, y - 29); ctx.lineTo(x + 25, y + 12); ctx.lineTo(x - 25, y + 12); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#17333b'; ctx.font = 'bold 10px monospace'; ctx.fillText('TREE', x, y + 6);
  } else {
    ctx.beginPath(); ctx.ellipse(x, y, 31, 18, -0.3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#17333b'; ctx.font = 'bold 16px monospace'; ctx.fillText('1+2', x, y + 6);
  }
}
