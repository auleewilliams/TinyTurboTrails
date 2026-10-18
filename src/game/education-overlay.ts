import type { InputFrame } from '../core/input';
import type { MenuTarget } from './overworld';
import type { EducationSession } from './education';

/** Like PauseMenu, this consumes rendered-frame input while simulation is stopped. */
export class EducationOverlay {
  open = false;
  revision = 0;
  message = '';
  private selected = 0;
  private direction = 0;
  private armed = false;
  constructor(private readonly session: EducationSession) {}

  showMaths(): void {
    this.revision++;
    this.open = true; this.selected = 0; this.direction = 0; this.armed = false;
    this.message = this.session.mathsComplete ? 'Already complete · sticker collected!' : 'Choose an answer. Leave any time.';
  }
  close(): void { if (this.open) this.revision++; this.open = false; }
  get description(): string {
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
    ctx.fillText('TIMBERS MATHS', 213, 35);
    const { left, right, operation } = this.session.maths;
    ctx.font = 'bold 25px monospace'; ctx.fillText(`${left} ${operation} ${right} = ?`, 213, 78);
    if (this.session.mathsComplete) {
      // A leaf-shaped number sticker; the TREE sticker uses a whole tree.
      ctx.fillStyle = '#9ccf93'; ctx.beginPath(); ctx.ellipse(213, 120, 31, 18, -0.3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#17333b'; ctx.font = 'bold 16px monospace'; ctx.fillText('1+2', 213, 126);
    }
    ctx.font = '10px monospace'; ctx.fillStyle = '#e9f2df'; ctx.fillText(this.message, 213, 164);
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
