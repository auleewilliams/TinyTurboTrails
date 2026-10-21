import type { InputFrame } from '../core/input';
import type { MenuTarget } from './overworld';
import { TRAIL_WORDS, type EducationSession, type TrailWord } from './education';
import { drawLetterTile, type SpellingAssets } from '../art/spelling';

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
  constructor(private readonly session: EducationSession, private readonly artwork?: SpellingAssets) {}

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
  private get earnedMessage(): string { return `${this.session.config.word === 'TREE' ? 'Tree' : this.session.config.word} sticker earned!`; }
  get title(): string { return this.assembly ? `Build ${this.session.config.word}` : 'Trail stickers'; }
  get description(): string {
    if (this.assembly) return `Build ${this.session.config.word} · ${this.session.wordProgress} · Bag ${this.session.letterCount}/4 · ${this.session.hasWordSticker ? this.earnedMessage : this.message}`;
    return `${this.session.stickers.length}/${TRAIL_WORDS.length} stickers · ${TRAIL_WORDS.map(config => `${config.name} ${config.word}: ${this.session.progressFor(config.id).hasWordSticker ? 'earned' : 'find the letters'}`).join(' · ')}`;
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
        label: `Letter ${pickup.letter}${this.session.pickups.filter(letter => letter.letter === pickup.letter).length > 1 ? ` ${this.session.pickups.filter(letter => letter.letter === pickup.letter).findIndex(letter => letter.id === pickup.id) + 1}` : ''}`,
        x: 111 + [3, 1, 0, 2].findIndex(index => this.session.pickups[index].id === pickup.id) * 52,
        y: 116, width: 42, height: 32,
        drag: { start: (x, y) => this.beginDrag(pickup.id, x, y), move: (x, y) => this.moveDrag(x, y),
          end: (x, y) => this.endDrag(x, y), cancel: () => this.cancelDrag() },
        description: this.heldLetter === pickup.id ? 'Selected. Choose a space.' : 'Select this collected letter.',
        action: () => { this.cancelDrag(); this.heldLetter = pickup.id; this.message = `${pickup.letter} selected. Choose a space.`; },
      }));
      this.session.wordProgress.split(' ').forEach((letter, slot) => targets.push({
        label: `Space ${slot + 1}: ${letter === '_' ? 'empty' : letter}`,
        description: 'Place the selected letter here.', x: 111 + slot * 52, y: 65, width: 42, height: 32,
        action: () => {
          this.cancelDrag();
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
    ctx.fillText('TRAIL STICKERS', 213, 26);
    TRAIL_WORDS.forEach((config, index) => {
      const x = 9 + index % 3 * 138, y = 36 + Math.floor(index / 3) * 69;
      const progress = this.session.progressFor(config.id);
      ctx.fillStyle = '#17333b'; ctx.fillRect(x, y, 132, 64);
      ctx.save(); ctx.translate(x + 66, y + 21); ctx.scale(0.55, 0.55);
      drawWordSticker(ctx, config, 0, 0, progress.hasWordSticker, this.artwork); ctx.restore();
      ctx.fillStyle = '#ffda75'; ctx.font = 'bold 10px monospace';
      ctx.fillText(`${config.name} ${config.word}`, x + 66, y + 46);
      ctx.fillStyle = '#e9f2df'; ctx.font = '9px monospace';
      ctx.fillText(progress.hasWordSticker ? '✓ Earned' : progress.wordProgress, x + 66, y + 59);
    });
    ctx.font = '9px monospace'; ctx.fillText(`${this.session.stickers.length}/${TRAIL_WORDS.length} stickers · Reload starts fresh`, 213, 175);
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
    ctx.fillText(`BUILD ${this.session.config.word}`, 213, 24);
    ctx.font = 'bold 16px monospace';
    [...this.session.config.word].forEach((letter, index) => ctx.fillText(letter, 132 + index * 52, 54));
    ctx.font = '10px monospace'; ctx.fillStyle = '#e9f2df';
    ctx.fillText(this.session.hasWordSticker ? this.earnedMessage : this.message, 213, 169);
    for (const [index, target] of this.targets.entries()) {
      const isLetter = target.label.startsWith('Letter '), isSpace = target.label.startsWith('Space ');
      const glyph = isLetter ? target.label[7] : isSpace ? target.label.split(': ')[1] : '';
      if (isLetter || (isSpace && glyph !== 'empty')) {
        drawLetterTile(ctx, this.artwork?.tile, glyph, target.x, target.y, target.width, target.height,
          target.selected, isLetter && this.session.pile[index]?.id === this.heldLetter);
        continue;
      }
      ctx.fillStyle = target.selected ? '#ffda75' : '#34515a'; ctx.fillRect(target.x, target.y, target.width, target.height);
      ctx.strokeStyle = '#bfd5ce'; ctx.strokeRect(target.x, target.y, target.width, target.height);
      ctx.fillStyle = target.selected ? '#0c1922' : '#e9f2df'; ctx.font = isSpace ? 'bold 17px monospace' : 'bold 12px monospace';
      const label = isSpace ? '_' : target.label;
      ctx.fillText(label, target.x + target.width / 2, target.y + target.height / 2 + 5);
    }
    if (this.session.hasWordSticker) drawWordSticker(ctx, this.session.config, 365, 91, true, this.artwork);
    if (this.drag) {
      drawLetterTile(ctx, this.artwork?.tile, this.session.pile.find(pickup => pickup.id === this.drag!.id)!.letter,
        this.drag.x - 21, this.drag.y - 16, 42, 32, false, true);
    }
    ctx.fillStyle = '#e9f2df'; ctx.font = '9px monospace';
    ctx.fillText('Choose letter → space · Tab / arrows + Space / face', 213, 229);
    ctx.restore();
  }

}

/** Each trail's generated 56 x 56 sticker, dimmed until earned. */
function drawWordSticker(ctx: CanvasRenderingContext2D, config: TrailWord, x: number, y: number, earned: boolean, artwork?: SpellingAssets): void {
  const sticker = artwork?.stickers[config.id];
  if (!sticker) return;
  ctx.save(); ctx.globalAlpha *= earned ? 1 : 0.3;
  ctx.drawImage(sticker, x - 28, y - 28, 56, 56); ctx.restore();
}
