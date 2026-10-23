import type { InputFrame, InputSource } from '../core/input';
import { controlHints } from './hud';
import type { MenuTarget } from './overworld';
import { drawKitButton, drawKitFrame, type InterfaceKit } from '../art/interface-kit';

/** Shared pause/confirmation panel; text stays inside its quiet interior. */
export const PAUSE_PANEL = { x: 40, y: 18, width: 346, height: 218 } as const;

function drawPauseBacking(ctx: CanvasRenderingContext2D, ui?: InterfaceKit): void {
  ctx.fillStyle = '#0c1922cc'; ctx.fillRect(0, 0, 426, 240);
  // Without the kit, the original full-screen dim remains the whole presentation.
  if (ui) drawKitFrame(ctx, ui, 'panel', PAUSE_PANEL.x, PAUSE_PANEL.y, PAUSE_PANEL.width, PAUSE_PANEL.height, { fill: '#10252cee' });
}

/** Focus-loss pause: the same panel with the active control hints. */
export function drawFocusPause(ctx: CanvasRenderingContext2D, source: InputSource, ui?: InterfaceKit): void {
  // Save/restore so the centered overlay cannot leak into the next frame's scene HUD.
  ctx.save();
  drawPauseBacking(ctx, ui);
  ctx.fillStyle = '#ffda75'; ctx.textAlign = 'center'; ctx.font = 'bold 20px monospace';
  ctx.fillText('PAUSED', 213, 83);
  ctx.font = '12px monospace'; ctx.fillStyle = '#e9f2df';
  controlHints(source).forEach((hint, index) => ctx.fillText(hint, 213, 111 + index * 20));
  ctx.restore();
}

/** Pause actions run on rendered frames while the simulation clock is stopped. */
export class PauseMenu {
  confirming = false;
  private selected = 0;
  private direction = 0;

  constructor(private readonly resume: () => void, private readonly returnToTrails: () => void) {}

  reset(): void { this.confirming = false; this.selected = 0; this.direction = 0; }

  cancel(): void { this.reset(); }

  update(input: InputFrame): void {
    if (input.trailsPressed) { this.activate(1); return; }
    const direction = Math.sign(input.horizontal);
    if (direction && direction !== this.direction) this.selected = 1 - this.selected;
    this.direction = direction;
    if (input.jumpPressed) this.activate(this.selected);
  }

  private activate(index: number): void {
    if (index === 0) {
      if (this.confirming) this.cancel();
      else this.resume();
    } else if (this.confirming) this.returnToTrails();
    else { this.confirming = true; this.selected = 0; }
  }

  get targets(): MenuTarget[] {
    return [this.confirming ? 'Keep playing' : 'Resume', 'Return to Trails'].map((label, index) => ({
      label, x: 53 + index * 165, y: 157, width: 155, height: 30,
      selected: index === this.selected, nativeSpace: true,
      description: this.confirming ? 'Leaving resets this run; completed trails stay recorded this session.'
        : index === 1 ? 'T for Trails. Confirm before leaving this run.' : undefined,
      action: () => this.activate(index), focus: () => { this.selected = index; },
    }));
  }

  draw(ctx: CanvasRenderingContext2D, source: InputSource, ui?: InterfaceKit): void {
    ctx.save();
    drawPauseBacking(ctx, ui);
    ctx.fillStyle = '#ffda75'; ctx.textAlign = 'center'; ctx.font = 'bold 20px monospace';
    ctx.fillText(this.confirming ? 'LEAVE THIS TRAIL?' : 'PAUSED', 213, 50);
    ctx.fillStyle = '#e9f2df'; ctx.font = '12px monospace';
    if (this.confirming) {
      ctx.fillText('This run will reset.', 213, 88);
      ctx.fillText('Completed trails stay recorded', 213, 111);
      ctx.fillText('for this session.', 213, 131);
    } else controlHints(source).forEach((hint, index) => ctx.fillText(hint, 213, 78 + index * 20));
    for (const target of this.targets) {
      drawKitButton(ctx, ui, target, { fill: '#17333b', selectedFill: '#ffda75', stroke: '#bfd5ce' });
      ctx.fillStyle = target.selected ? '#0c1922' : '#e9f2df'; ctx.font = 'bold 10px monospace';
      ctx.fillText(target.label, target.x + target.width / 2, target.y + 19);
    }
    ctx.fillStyle = '#e9f2df'; ctx.font = '10px monospace';
    ctx.fillText(source === 'controller' ? '← → Choose · Face button: select' : '← → Choose · Space: select', 213, 205);
    ctx.fillText(this.confirming ? `T: leave · ${source === 'controller' ? 'Start' : 'Escape'}: cancel` : 'T: Return to Trails', 213, 222);
    ctx.restore();
  }
}
