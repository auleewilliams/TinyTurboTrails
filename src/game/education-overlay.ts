import type { InputFrame } from '../core/input';
import type { MenuTarget } from './overworld';
import type { EducationSession } from './education';

/** Like PauseMenu, this consumes rendered-frame input while simulation is stopped. */
export class EducationOverlay {
  open = false;
  revision = 0;
  private armed = false;
  private assembly = false;
  private selected = 0;
  private direction = 0;
  private heldLetter?: string;
  private drag?: { id: string; x: number; y: number };
  private message = 'Choose a letter, then a space.';
  get isAssembly(): boolean { return this.assembly; }
  private findMore?: () => void;
  showAssembly(findMore: () => void): void {
    this.findMore = findMore;
    this.showStickers();
    this.assembly = true;
    this.selected = 0;
    this.heldLetter = undefined;
    this.direction = 0;
    this.message = 'Choose a letter, then a space.';
  }
  constructor(private readonly session: EducationSession) {}

  showStickers(): void {
    this.revision++;
    this.assembly = false;
    this.open = true;
    this.armed = false;
  }
  close(): void { if (this.open) this.revision++; this.open = false; this.cancelDrag(); this.heldLetter = undefined; }
  beginDrag(id: string, x: number, y: number): void {
    if (this.open && this.assembly && this.session.pile.some(pickup => pickup.id === id)) this.drag = { id, x, y };
  }
  moveDrag(x: number, y: number): void { if (this.drag) Object.assign(this.drag, { x, y }); }
  cancelDrag(): void { this.drag = undefined; }
  endDrag(x: number, y: number): void {
    const drag = this.drag;
    this.cancelDrag();
    if (!drag || !this.open) return;
    const slot = [0, 1, 2, 3].find(index => x >= 111 + index * 52 && x <= 153 + index * 52 && y >= 65 && y <= 97);
    const accepted = slot !== undefined && this.session.place(drag.id, slot);
    this.heldLetter = undefined; this.selected = 0;
    this.message = accepted ? 'Great! Choose another letter.' : 'Try another space. Your letters are safe.';
  }
  get description(): string {
    if (this.assembly) return `Build TREE · ${this.session.wordProgress} · Bag ${this.session.letterCount}/4 · ${this.session.hasWordSticker ? 'Tree sticker earned!' : this.message}`;
    return `${this.session.stickers.length}/1 stickers · Timbers TREE: ${this.session.hasWordSticker ? 'earned' : 'find the letters'}`;
  }
  update(input: InputFrame): void {
    if (input.pausePressed || input.activityPressed) { this.close(); return; }
    if (!this.armed) {
      if (!input.jumpHeld && !input.jumpPressed && input.horizontal === 0) this.armed = true;
      return;
    }
    if (this.assembly) {
      const direction = Math.sign(input.horizontal);
      if (direction && direction !== this.direction) this.selected = (this.selected + direction + this.targets.length) % this.targets.length;
      this.direction = direction;
      if (input.jumpPressed) this.targets[this.selected]?.action();
    } else if (input.jumpPressed) this.close();
  }
  get targets(): MenuTarget[] {
    if (this.assembly) {
      const targets: MenuTarget[] = this.session.pile.map(pickup => ({
        label: `Letter ${pickup.letter}${pickup.letter === 'E' ? pickup.id.endsWith('e1') ? ' 1' : ' 2' : ''}`,
        x: 111 + [ 'timbers-letter-e2', 'timbers-letter-r', 'timbers-letter-t', 'timbers-letter-e1' ].indexOf(pickup.id) * 52,
        y: 116, width: 42, height: 32,
        drag: { start: (x, y) => this.beginDrag(pickup.id, x, y), move: (x, y) => this.moveDrag(x, y),
          end: (x, y) => this.endDrag(x, y), cancel: () => this.cancelDrag() },
        description: this.heldLetter === pickup.id ? 'Selected. Choose a space.' : 'Select this collected letter.',
        action: () => { this.heldLetter = pickup.id; this.message = `${pickup.letter} selected. Choose a space.`; },
      }));
      this.session.wordProgress.split(' ').forEach((letter, slot) => targets.push({
        label: `Space ${slot + 1}: ${letter === '_' ? 'empty' : letter}`,
        description: 'Place the selected letter here.', x: 111 + slot * 52, y: 65, width: 42, height: 32,
        action: () => {
          const accepted = this.heldLetter && this.session.place(this.heldLetter, slot);
          this.message = accepted ? 'Great! Choose another letter.' : 'Try another space. Your letters are safe.';
          if (accepted) { this.heldLetter = undefined; this.selected = 0; }
        },
      }));
      if (this.session.letterCount < 4) targets.push({ label: 'Find more letters', x: 40, y: 182, width: 166, height: 30,
        action: () => { this.close(); this.findMore?.(); } });
      targets.push({ label: 'Leave activity', x: this.session.letterCount < 4 ? 218 : 138, y: 182, width: 150, height: 30, action: () => this.close() });
      return targets.map((target, index) => ({ ...target, nativeSpace: true, selected: index === this.selected,
        focus: () => { this.selected = index; } }));
    }
    return [{ label: 'Return to map', description: this.description, x: 138, y: 182, width: 150, height: 30,
      // Prevent MenuOverlay's map-index fallback from changing trail selection.
      selected: true, nativeSpace: true, action: () => this.close(), focus: () => {} }];
  }
  draw(ctx: CanvasRenderingContext2D): void {
    if (this.assembly) { this.drawAssembly(ctx); return; }
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
  private drawAssembly(ctx: CanvasRenderingContext2D): void {
    ctx.save(); ctx.fillStyle = '#0c1922f5'; ctx.fillRect(0, 0, 426, 240);
    ctx.textAlign = 'center'; ctx.fillStyle = '#ffda75'; ctx.font = 'bold 18px monospace';
    ctx.fillText('BUILD TREE', 213, 24);
    ctx.font = 'bold 16px monospace';
    [...'TREE'].forEach((letter, index) => ctx.fillText(letter, 132 + index * 52, 54));
    ctx.font = '10px monospace'; ctx.fillStyle = '#e9f2df';
    ctx.fillText(this.session.hasWordSticker ? 'Tree sticker earned!' : this.message, 213, 169);
    for (const target of this.targets) {
      ctx.fillStyle = target.selected ? '#ffda75' : '#34515a'; ctx.fillRect(target.x, target.y, target.width, target.height);
      ctx.strokeStyle = '#bfd5ce'; ctx.strokeRect(target.x, target.y, target.width, target.height);
      ctx.fillStyle = target.selected ? '#0c1922' : '#e9f2df'; ctx.font = !target.label.startsWith('Letter ') && !target.label.startsWith('Space ') ? 'bold 12px monospace' : 'bold 17px monospace';
      const label = target.label.startsWith('Letter ') ? target.label[7] : target.label.startsWith('Space ') ? target.label.split(': ')[1].replace('empty', '_') : target.label;
      ctx.fillText(label, target.x + target.width / 2, target.y + target.height / 2 + 5);
    }
    if (this.session.hasWordSticker) drawTreeSticker(ctx, 365, 91, true);
    if (this.drag) {
      ctx.fillStyle = '#ffda75'; ctx.fillRect(this.drag.x - 21, this.drag.y - 16, 42, 32);
      ctx.fillStyle = '#0c1922'; ctx.font = 'bold 17px monospace';
      ctx.fillText(this.session.pile.find(pickup => pickup.id === this.drag!.id)!.letter, this.drag.x, this.drag.y + 5);
    }
    ctx.fillStyle = '#e9f2df'; ctx.font = '9px monospace';
    ctx.fillText('Choose letter → space · Tab / arrows + Space / face', 213, 229);
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
