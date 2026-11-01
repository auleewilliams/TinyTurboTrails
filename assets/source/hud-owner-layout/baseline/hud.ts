import { MAX_HEALTH, type RunEvent, type RunState } from './interactions';
import type { InputFrame, InputSource } from '../core/input';
import type { EducationSession } from './education';
import type { LevelData } from '../world/level';
import { drawKitFrame, PLAQUE_TEXT_SLICE, type InterfaceKit } from '../art/interface-kit';

export const HUD_COLORS = { panel: '#10252cee', ink: '#e9f2df', full: '#ff5d5d', empty: '#31434a', hit: '#ffda75' } as const;
const HEART = ['01100110', '11111111', '11111111', '01111110', '00111100', '00011000'];
// Keep clear of Henry in low valleys, with five pixels inset at bottom-right.
export const TRAIL_RIBBON = { x: 285, y: 221, width: 136, height: 14, startX: 292, finishX: 412, railY: 228 } as const;
/** Shorter plaques retain native kit edges while giving counters less visual weight. */
export const HUD_PLAQUES = {
  gems: { x: 5, y: 5, width: 60, height: 20 },
  hearts: { x: 85, y: 5, width: 56, height: 20 },
  stars: { x: 145, y: 5, width: 62, height: 20 },
} as const;
// The 24px pouch needs 28px of backing to keep its opaque pixels inside the kit rim.
export const BAG_PLAQUE = { x: 325, y: 31, width: 96, height: 28 } as const;
function plaque(ctx: CanvasRenderingContext2D, ui: InterfaceKit | undefined, { x, y, width, height }: { x: number; y: number; width: number; height: number }): void {
  drawKitFrame(ctx, ui, 'plaque', x, y, width, height, { fill: HUD_COLORS.panel }, PLAQUE_TEXT_SLICE);
}
export function drawBagBacking(ctx: CanvasRenderingContext2D, ui?: InterfaceKit): void { plaque(ctx, ui, BAG_PLAQUE); }
/** Identity marks stay filled after assembly; repeated letters remain separate pickups. */
export function drawCollectionBag(ctx: CanvasRenderingContext2D, collection: Pick<EducationSession, 'pickups' | 'hasLetter'>,
  pouch?: HTMLImageElement, ui?: InterfaceKit): void {
  ctx.save();
  drawBagBacking(ctx, ui);
  if (pouch) ctx.drawImage(pouch, 330, 33, 24, 24);
  else {
    ctx.fillStyle = HUD_COLORS.hit;
    ctx.fillRect(333, 40, 18, 13); ctx.fillRect(337, 36, 10, 3);
  }
  collection.pickups.forEach((pickup, index) => {
    const x = 359 + index * 14;
    ctx.fillStyle = HUD_COLORS.ink; ctx.fillRect(x - 1, 39, 8, 8);
    ctx.fillStyle = collection.hasLetter(pickup.id) ? HUD_COLORS.hit : HUD_COLORS.empty;
    ctx.fillRect(x, 40, 6, 6);
  });
  ctx.restore();
}
const GEM = ['001111100', '011111110', '111111111', '011111110', '001111100', '000111000', '000010000'];
const STAR = ['00000100000', '00001110000', '00001110000', '11111111111',
  '01111111110', '00111111100', '00111111100', '01110011110', '01100001110'];
/** Same pixel silhouette and palette as the authored world star, at HUD scale. */
function drawCounterIcon(ctx: CanvasRenderingContext2D, rows: readonly string[], x: number, y: number, color: string): void {
  ctx.fillStyle = color;
  rows.forEach((row, dy) => [...row].forEach((pixel, dx) => { if (pixel === '1') ctx.fillRect(x + dx, y + dy, 1, 1); }));
  ctx.fillStyle = '#fff7d6'; ctx.fillRect(x + 4, y + 2, 2, 2);
}
export const RIBBON_INTRO = 'Trail: Henry = you; posts = saves; flag = end';
export interface TrailProgress {
  position: number;
  checkpoints: readonly { id: string; position: number; activated: boolean }[];
}

/** Use the same player-origin threshold as AdventureScene's finish trigger. */
export function trailPosition(level: LevelData, x: number, supportY = level.start.y): number {
  const position = level.progressAxis === 'y'
    ? (supportY - level.start.y) / (level.finish.y - level.start.y)
    : (x - level.start.x) / (level.finish.x - level.start.x);
  return Math.max(0, Math.min(1, position));
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
  plains: ['Big downhill', 'Orchard bumps', 'Spring hill', 'Final climb'],
  quarry: ['Quarry entrance', 'Stone terraces', 'Deep pit', 'Tunnels', 'Burrows', 'Crusher crossing', 'Quarry summit'],
  timbers: ['First fork', 'Middle bough', 'Canopy', 'Lookout'],
  sunset: ['High girders', 'Frame descent', 'Lower work yard', 'Final scaffold', 'Rooftop'],
  frost: ['Snowy start', 'Ice fields', 'Snow bridge', 'Frozen ridge', 'High snow', 'Frost summit'],
  cove: ['Beach path', 'Shell shore', 'Dune crossing', 'Tide pools', 'Sandy ridge', 'Cove lookout'],
};
export function areaName(level: LevelData, index: number): string {
  if (level.sections?.[index]) return level.sections[index].name;
  if (level.id === 'quarry' && level.progressAxis === 'y') {
    return ['Upper workings', 'Mine shelves', 'Quarry floor'][index] ?? level.name;
  }
  return AREAS[level.id]?.[index] ?? level.name;
}
export function controlHints(source: InputSource): readonly string[] {
  return source === 'controller'
    ? ['Stick / D-pad: move', 'Buttons 1–4: jump', 'Start: resume', 'Pause: sound / rumble']
    : ['Arrows / A-D: move', 'Space: jump', 'Escape: resume', 'M: mute'];
}

/** Illustrated keyboard keys and a brand-neutral standard face-button cluster.
 * All four face positions are accepted by BrowserInput; no vendor lettering is implied. */
export function drawControlCues(ctx: CanvasRenderingContext2D, source: InputSource, y: number): void {
  ctx.save(); ctx.font = '10px monospace'; ctx.textAlign = 'center';
  const key = (text: string, x: number, width: number, baseline: number) => {
    ctx.fillStyle = '#bfd5ce'; ctx.fillRect(x, baseline - 11, width, 16);
    ctx.fillStyle = '#10252c'; ctx.fillRect(x + 1, baseline - 10, width - 2, 13);
    ctx.fillStyle = '#e9f2df'; ctx.fillText(text, x + width / 2, baseline);
  };
  ctx.fillStyle = '#e9f2df';
  if (source === 'controller') {
    ctx.fillText('Stick / D-pad: move', 124, y);
    // Four equally lit positions match the four accepted standard face buttons.
    for (const [dx, dy] of [[0, -5], [-5, 0], [5, 0], [0, 5]]) ctx.fillRect(246 + dx, y - 5 + dy, 3, 3);
    ctx.fillText('Jump / select', 304, y);
    key('Start', 154, 38, y + 24); ctx.fillText('Resume', 221, y + 24);
  } else {
    key('← →', 62, 32, y); ctx.fillText('Move', 116, y);
    key('Space', 231, 38, y); ctx.fillText('Jump', 292, y);
    key('Escape', 62, 44, y + 24); ctx.fillText('Resume', 132, y + 24);
    key('M', 231, 18, y + 24); ctx.fillText('Sound', 280, y + 24);
  }
  ctx.restore();
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
  private ribbonSeconds = 4;
  private readonly activatedCheckpoints = new Set<string>();
  /** Event history is presentation-only and is discarded with this HUD on a new run. */
  consume(events: readonly RunEvent[]): void {
    for (const event of events) {
      if (event.type === 'checkpoint') this.activatedCheckpoints.add(event.entityId);
    }
  }
  progress(level: LevelData, x: number, supportY = level.start.y): TrailProgress {
    return {
      position: trailPosition(level, x, supportY),
      checkpoints: level.checkpoints.map(point => ({
        id: point.id, position: trailPosition(level, point.x, point.y), activated: this.activatedCheckpoints.has(point.id),
      })),
    };
  }
  update(seconds: number, input: InputFrame, level: LevelData, x: number, importantFeedback = false, supportY = level.start.y): void {
    this.source = input.source ?? 'keyboard';
    this.locationSeconds = Math.max(0, this.locationSeconds - seconds);
    // Announce the approach to an area, ahead of its checkpoint celebration.
    let index = -1;
    level.checkpoints.forEach((point, candidate) => { if (level.progressAxis === 'y'
      ? (level.finish.y < level.start.y ? supportY <= point.y + 35 : supportY >= point.y - 35)
      : x >= point.x - 180) index = candidate; });
    if (level.progressAxis === 'y' && level.finish.y < level.start.y
      && supportY <= level.finish.y + 35) index = level.checkpoints.length;
    if (level.sections) {
      index = -1;
      level.sections.forEach((section, candidate) => {
        if (x >= section.x && supportY >= (section.minY ?? -Infinity)
          && supportY <= (section.maxY ?? Infinity)) index = candidate;
      });
    }
    if (index !== this.area) {
      this.area = index;
      this.location = index < 0 ? level.name : level.sections?.[index]?.name ?? areaName(level, index);
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
    } else {
      this.hint = '';
      if (!importantFeedback && this.locationSeconds === 0 && this.ribbonSeconds > 0) {
        this.ribbonSeconds = Math.max(0, this.ribbonSeconds - seconds);
        if (this.ribbonSeconds > 0) this.hint = RIBBON_INTRO;
      }
    }
  }
}

export function drawGameplayHud(ctx: CanvasRenderingContext2D, run: RunState, hint = '', notice = '', progress?: TrailProgress, ui?: InterfaceKit): void {
  ctx.save();
  plaque(ctx, ui, HUD_PLAQUES.gems);
  plaque(ctx, ui, HUD_PLAQUES.hearts);
  ctx.fillStyle = HUD_COLORS.ink;
  ctx.font = 'bold 10px monospace';
  ctx.textAlign = 'left';
  drawCounterIcon(ctx, GEM, 12, 12, '#8ee1e5');
  ctx.fillStyle = HUD_COLORS.ink;
  ctx.fillText(String(run.collectedGems.size), 28, 20);
  if (run.specialTotal > 0) {
    plaque(ctx, ui, HUD_PLAQUES.stars);
    ctx.fillStyle = HUD_COLORS.hit;
    drawCounterIcon(ctx, STAR, 151, 11, HUD_COLORS.hit);
    ctx.fillStyle = HUD_COLORS.ink;
    ctx.fillText(`${run.collectedSpecials.size}/${run.specialTotal}`, 168, 20);
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
    // Round the real glyph extent up so the last glyph never reaches the plaque's right rim.
    const metrics = ctx.measureText(hint);
    const width = Math.ceil(Math.max(metrics.width, metrics.actualBoundingBoxRight ?? 0)) + 10;
    drawKitFrame(ctx, ui, 'plaque', 5, 31, width, 18, { fill: HUD_COLORS.panel }, PLAQUE_TEXT_SLICE);
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
