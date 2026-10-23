import { MAX_HEALTH, type RunEvent, type RunState } from './interactions';
import type { InputFrame, InputSource } from '../core/input';
import type { LevelData } from '../world/level';
import { drawKitFrame, type InterfaceKit } from '../art/interface-kit';

export const HUD_COLORS = { panel: '#10252cee', ink: '#e9f2df', full: '#ff5d5d', empty: '#31434a', hit: '#ffda75' } as const;
const HEART = ['01100110', '11111111', '11111111', '01111110', '00111100', '00011000'];
// Keep clear of Henry in low valleys, with five pixels inset at bottom-right.
export const TRAIL_RIBBON = { x: 285, y: 221, width: 136, height: 14, startX: 292, finishX: 412, railY: 228 } as const;
/** Compact HUD backings keep the original flat rectangles' footprint. */
export const HUD_PLAQUES = {
  gems: { x: 5, y: 5, width: 76, height: 22 },
  hearts: { x: 85, y: 5, width: 56, height: 22 },
  stars: { x: 145, y: 5, width: 80, height: 22 },
} as const;
export const BAG_PLAQUE = { x: 294, y: 31, width: 127, height: 34 } as const;
function plaque(ctx: CanvasRenderingContext2D, ui: InterfaceKit | undefined, { x, y, width, height }: { x: number; y: number; width: number; height: number }): void {
  drawKitFrame(ctx, ui, 'plaque', x, y, width, height, { fill: HUD_COLORS.panel });
}
export function drawBagBacking(ctx: CanvasRenderingContext2D, ui?: InterfaceKit): void { plaque(ctx, ui, BAG_PLAQUE); }
export interface TrailProgress {
  position: number;
  checkpoints: readonly { id: string; position: number; activated: boolean }[];
}

/** Use the same player-origin threshold as AdventureScene's finish trigger. */
export function trailPosition(level: LevelData, x: number): number {
  return Math.max(0, Math.min(1, (x - level.start.x) / (level.finish.x - level.start.x)));
}

function ribbonX(position: number): number {
  const { startX, finishX } = TRAIL_RIBBON;
  // Keep the marker one pixel short of the flag until the real finish boundary.
  return position >= 1 ? finishX : Math.min(finishX - 1, Math.round(startX + position * (finishX - startX)));
}

export function drawTrailRibbon(ctx: CanvasRenderingContext2D, progress: TrailProgress, ui?: InterfaceKit): void {
  const { y, startX, finishX, railY } = TRAIL_RIBBON;
  ctx.save();
  plaque(ctx, ui, TRAIL_RIBBON);
  ctx.fillStyle = HUD_COLORS.ink;
  ctx.fillRect(startX, railY - 1, finishX - startX + 1, 3);
  ctx.fillStyle = HUD_COLORS.empty;
  ctx.fillRect(startX, railY, finishX - startX + 1, 1);
  const markerX = ribbonX(progress.position);
  ctx.fillStyle = '#9ccf93';
  ctx.fillRect(startX, railY, markerX - startX, 1);
  // A planted, hollow post becomes a warm filled post only on activation.
  for (const checkpoint of progress.checkpoints) {
    const pointX = ribbonX(checkpoint.position);
    ctx.fillStyle = HUD_COLORS.ink;
    ctx.fillRect(pointX - 2, railY - 1, 5, 6);
    ctx.fillStyle = checkpoint.activated ? HUD_COLORS.hit : HUD_COLORS.empty;
    ctx.fillRect(pointX - 1, railY, 3, 4);
  }
  // Finish flag; distinct from the short checkpoint posts.
  ctx.fillStyle = HUD_COLORS.ink;
  ctx.fillRect(finishX, y + 1, 1, 11);
  ctx.fillRect(finishX + 1, y + 1, 5, 4);
  ctx.fillStyle = HUD_COLORS.hit;
  ctx.fillRect(finishX + 1, y + 2, 3, 2);
  // Henry's green hair and peach face above the rail, with a downward pointer.
  ctx.fillStyle = '#10252c';
  ctx.fillRect(markerX - 3, y, 7, 7);
  ctx.fillStyle = '#9ccf93';
  ctx.fillRect(markerX - 2, y + 1, 5, 2);
  ctx.fillStyle = '#f3c799';
  ctx.fillRect(markerX - 2, y + 3, 5, 2);
  ctx.fillStyle = HUD_COLORS.ink;
  ctx.fillRect(markerX - 1, y + 5, 3, 1);
  ctx.fillRect(markerX, y + 6, 1, 1);
  ctx.restore();
}
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
  private readonly activatedCheckpoints = new Set<string>();
  /** Event history is presentation-only and is discarded with this HUD on a new run. */
  consume(events: readonly RunEvent[]): void {
    for (const event of events) {
      if (event.type === 'checkpoint') this.activatedCheckpoints.add(event.entityId);
    }
  }
  progress(level: LevelData, x: number): TrailProgress {
    return {
      position: trailPosition(level, x),
      checkpoints: level.checkpoints.map(point => ({
        id: point.id, position: trailPosition(level, point.x), activated: this.activatedCheckpoints.has(point.id),
      })),
    };
  }
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

export function drawGameplayHud(ctx: CanvasRenderingContext2D, run: RunState, hint = '', notice = '', progress?: TrailProgress, ui?: InterfaceKit): void {
  ctx.save();
  plaque(ctx, ui, HUD_PLAQUES.gems);
  plaque(ctx, ui, HUD_PLAQUES.hearts);
  ctx.fillStyle = HUD_COLORS.ink;
  ctx.font = 'bold 10px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`GEMS ${run.collectedGems.size}`, 10, 20);
  if (run.specialTotal > 0) {
    plaque(ctx, ui, HUD_PLAQUES.stars);
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
    plaque(ctx, ui, { x: 5, y: 31, width: ctx.measureText(hint).width + 10, height: 18 });
    ctx.fillStyle = HUD_COLORS.ink;
    ctx.fillText(hint, 10, 44);
  }
  if (notice) {
    ctx.font = 'bold 10px monospace';
    const width = ctx.measureText(notice).width + 12;
    plaque(ctx, ui, { x: 421 - width, y: 5, width, height: 22 });
    ctx.fillStyle = HUD_COLORS.hit;
    ctx.textAlign = 'right';
    ctx.fillText(notice, 415, 20);
  }
  if (progress) drawTrailRibbon(ctx, progress, ui);
  ctx.restore();
}
