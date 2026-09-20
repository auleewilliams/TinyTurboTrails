import { MAX_HEALTH, type RunState } from './interactions';
import type { InputFrame, InputSource } from '../core/input';
import type { LevelData } from '../world/level';

export const HUD_COLORS = { panel: '#10252cee', ink: '#e9f2df', full: '#ff5d5d', empty: '#31434a', hit: '#ffda75' } as const;
const HEART = ['01100110', '11111111', '11111111', '01111110', '00111100', '00011000'];
const AREAS: Record<string, readonly string[]> = {
  plains: ['Meadow', 'Hillside', 'Canyon', 'Cave', 'Orchard', 'Summit'],
  quarry: ['Quarry entrance', 'Stone terraces', 'Deep pit', 'Tunnels', 'Burrows', 'Crusher crossing', 'Quarry summit'],
  timbers: ['Lumber yard', 'Old bridge', 'Canopy', 'Crane crossing', 'Lookout', 'Sunset trail'],
  sunset: ['Site gate', 'Girders', 'Work yard', 'Trench', 'Scaffolds', 'Site summit', 'Home stretch'],
  frost: ['Snowy start', 'Ice fields', 'Snow bridge', 'Frozen ridge', 'High snow', 'Frost summit'],
  cove: ['Beach path', 'Shell shore', 'Dune crossing', 'Tide pools', 'Sandy ridge', 'Cove lookout'],
};
export function areaName(level: LevelData, index: number): string {
  return AREAS[level.id]?.[index] ?? level.name;
}
export function controlHints(source: InputSource): readonly string[] {
  return source === 'controller'
    ? ['Stick / D-pad: move', 'Face button: jump', 'Start: resume', 'Mute: screen button']
    : ['Arrows / A-D: move', 'Space: jump', 'Escape: resume', 'M: mute'];
}

/** Brief teaching and location labels are presentation state, reset with each run. */
export class HudPresentation {
  source: InputSource = 'keyboard';
  location = '';
  locationSeconds = 0;
  hint = '';
  private area = -2;
  private moveSeconds = 3;
  private jumpSeconds = 4;
  private moved = false;
  private jumped = false;
  update(seconds: number, input: InputFrame, level: LevelData, x: number): void {
    this.source = input.source ?? 'keyboard';
    this.locationSeconds = Math.max(0, this.locationSeconds - seconds);
    // Announce the approach to an area, ahead of its checkpoint celebration.
    let index = -1;
    level.checkpoints.forEach((point, candidate) => { if (x >= point.x - 180) index = candidate; });
    if (index !== this.area) {
      this.area = index;
      this.location = index < 0 ? level.name : areaName(level, index);
      this.locationSeconds = 2;
    }
    this.moved ||= Math.abs(input.horizontal) > 0;
    this.jumped ||= input.jumpPressed;
    const controls = controlHints(this.source);
    if (!this.moved && this.moveSeconds > 0) {
      this.moveSeconds -= seconds;
      this.hint = controls[0];
    } else if (this.moved && !this.jumped && this.jumpSeconds > 0) {
      this.jumpSeconds -= seconds;
      this.hint = controls[1];
    } else this.hint = '';
  }
}

export function drawGameplayHud(ctx: CanvasRenderingContext2D, run: RunState, hint = '', notice = ''): void {
  ctx.save();
  ctx.fillStyle = HUD_COLORS.panel;
  ctx.fillRect(5, 5, 76, 22);
  ctx.fillRect(85, 5, 56, 22);
  ctx.fillStyle = HUD_COLORS.ink;
  ctx.font = 'bold 10px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`GEMS ${run.collectedGems.size}`, 10, 20);
  if (run.specialTotal > 0) {
    ctx.fillStyle = HUD_COLORS.panel; ctx.fillRect(145, 5, 80, 22);
    ctx.fillStyle = HUD_COLORS.hit;
    ctx.fillText(`STARS ${run.collectedSpecials.size}/${run.specialTotal}`, 150, 20);
  }
  for (let index = 0; index < MAX_HEALTH; index++) {
    const flashing = index === run.healthFlashPip && run.healthFlashSeconds > 0;
    const x = 91 + index * 16;
    // A pale border keeps both full and hollow hearts legible against every palette.
    for (let row = 0; row < HEART.length; row++) for (let col = 0; col < 8; col++) {
      if (HEART[row][col] !== '1') continue;
      ctx.fillStyle = HUD_COLORS.ink;
      ctx.fillRect(x + col - 1, 12 + row - 1, 3, 3);
    }
    ctx.fillStyle = flashing ? HUD_COLORS.hit : index < run.health ? HUD_COLORS.full : HUD_COLORS.empty;
    for (let row = 0; row < HEART.length; row++) for (let col = 0; col < 8; col++) {
      if (HEART[row][col] === '1') ctx.fillRect(x + col, 12 + row, 1, 1);
    }
  }
  if (hint) {
    ctx.font = '10px monospace';
    ctx.fillStyle = HUD_COLORS.panel;
    ctx.fillRect(5, 31, ctx.measureText(hint).width + 10, 18);
    ctx.fillStyle = HUD_COLORS.ink;
    ctx.fillText(hint, 10, 44);
  }
  if (notice) {
    ctx.font = 'bold 10px monospace';
    const width = ctx.measureText(notice).width + 12;
    ctx.fillStyle = HUD_COLORS.panel;
    ctx.fillRect(421 - width, 5, width, 22);
    ctx.fillStyle = HUD_COLORS.hit;
    ctx.textAlign = 'right';
    ctx.fillText(notice, 415, 20);
  }
  ctx.restore();
}
