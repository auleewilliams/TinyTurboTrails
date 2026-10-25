import type { InputFrame, InputSource } from '../core/input';
import { drawControlCues } from './hud';
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
  ctx.fillText('Return to the game to continue', 213, 111);
  drawControlCues(ctx, source, 151);
  ctx.restore();
}

export interface PauseSettings {
  hasRun: () => boolean;
  soundEnabled: () => boolean;
  rumbleEnabled: () => boolean;
  toggleSound: () => void;
  toggleRumble: () => void;
}

/** Pause actions run on rendered frames while the simulation clock is stopped. */
export class PauseMenu {
  confirming = false;
  private selected = 0;
  private direction = 0;

  constructor(private readonly resume: () => void, private readonly returnToTrails: () => void, private readonly settings?: PauseSettings) {}

  reset(): void { this.confirming = false; this.selected = 0; this.direction = 0; }

  cancel(): void { this.reset(); }

  update(input: InputFrame): void {
    if (input.trailsPressed && (this.settings?.hasRun() ?? true)) { this.activate(1); return; }
    const direction = Math.sign(input.horizontal);
    if (direction && direction !== this.direction) this.selected = (this.selected + direction + this.targets.length) % this.targets.length;
    this.direction = direction;
    if (input.jumpPressed) this.targets[this.selected]?.action();
  }

  private activate(index: number): void {
    if (index === 0) {
      if (this.confirming) this.cancel();
      else this.resume();
    } else if (this.confirming) this.returnToTrails();
    else { this.confirming = true; this.selected = 0; }
  }

  get targets(): MenuTarget[] {
    const target = (label: string, x: number, y: number, width: number, action: () => void, pressed?: boolean): MenuTarget => ({
      label, x, y, width, height: 30, nativeSpace: true, pressed, action,
    });
    let targets: MenuTarget[];
    if (this.confirming) {
      targets = [target('Keep playing', 53, 157, 155, () => this.activate(0)),
        target('Return to Trails', 218, 157, 155, () => this.activate(1))];
      targets.forEach(item => { item.description = 'Leaving resets this run; completed trails stay recorded this session.'; });
    } else {
      targets = [target('Resume', 53, 62, 320, this.resume)];
      if (this.settings?.hasRun() ?? true) targets.push(target('Return to Trails', 53, 99, 320, () => this.activate(1)));
      if (this.settings) targets.push(
        target('Sound', 53, 136, 155, this.settings.toggleSound, this.settings.soundEnabled()),
        target('Controller rumble', 218, 136, 155, this.settings.toggleRumble, this.settings.rumbleEnabled()));
    }
    return targets.map((item, index) => ({ ...item, selected: index === this.selected, focus: () => { this.selected = index; } }));
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
    } else drawControlCues(ctx, source, 186);
    for (const target of this.targets) {
      drawKitButton(ctx, ui, target, { fill: '#17333b', selectedFill: '#ffda75', stroke: '#bfd5ce' });
      ctx.fillStyle = target.selected ? '#0c1922' : '#e9f2df'; ctx.font = 'bold 10px monospace';
      const label = target.pressed === undefined ? target.label : `${target.label === 'Sound' ? 'Sound' : 'Rumble'}: ${target.pressed ? 'On' : 'Off'}`;
      ctx.fillText(label, target.x + target.width / 2, target.y + 19);
    }
    ctx.fillStyle = '#e9f2df'; ctx.font = '10px monospace';
    if (this.confirming) {
      ctx.fillText(source === 'controller' ? 'D-pad: choose · Buttons 1–4: select' : '← → Choose · Space / Enter: select', 213, 205);
      ctx.fillText(`T: leave · ${source === 'controller' ? 'Start' : 'Escape'}: cancel`, 213, 222);
    }
    ctx.restore();
  }
}
