import type { LevelData } from '../world/level';
import { drawRewardResult } from './reward-result';

export interface MenuTarget { label: string; description?: string; x: number; y: number; width: number; height: number; selected?: boolean; action: () => void; focus?: () => void; nativeSpace?: boolean }
export const MAP_POINTS = [[48, 88], [140, 88], [232, 88], [232, 176], [140, 176], [48, 176]] as const;

export const OVERWORLD_LAYOUT = {
  panel: { x: 281, y: 47, width: 139, height: 170 },
  preview: { x: 287, y: 84, width: 126, height: 71 },
  storyPreview: { x: 293, y: 79, width: 114, height: 76 },
  results: { baseline: 174, gemCenter: 320, starCenter: 382, center: 350 },
  play: { x: 298, y: 180, width: 104, height: 27 },
} as const;

export interface TrailResult { readonly gems: number; readonly stars: number }

/** Cosmetic page-session data. Never passed to simulation or serialized. */
export class TrailSession {
  readonly results = new Map<string, TrailResult>();
  returnedSeconds = 0;
  mark(level: LevelData, gems: number, stars: number): void {
    const previous = this.results.get(level.id);
    this.results.set(level.id, { gems: Math.max(previous?.gems ?? 0, gems), stars: Math.max(previous?.stars ?? 0, stars) });
  }
  description(level: LevelData): string {
    const result = this.results.get(level.id);
    if (!result) return 'Ready to explore';
    const gemTotal = level.entities.filter(entity => entity.kind === 'gem').length;
    const starTotal = level.entities.filter(entity => entity.kind === 'special').length;
    return `Session best: ${result.gems} of ${gemTotal} gems${starTotal ? `, ${result.stars} of ${starTotal} stars` : ''}`;
  }
}

export function drawOverworld(ctx: CanvasRenderingContext2D, levels: readonly LevelData[], selected: number,
  results: ReadonlyMap<string, TrailResult>, title: HTMLImageElement, landmarks?: HTMLImageElement,
  preview?: HTMLCanvasElement, background?: HTMLImageElement): void {
  ctx.save();
  ctx.fillStyle = '#dde5c1'; ctx.fillRect(0, 0, 426, 240);
  if (background) ctx.drawImage(background, 0, 0, 426, 240);
  // Keep the approved artwork intact and proportional, with a separate map heading.
  ctx.drawImage(title, 8, 0, 94, 94 * title.naturalHeight / title.naturalWidth);
  ctx.fillStyle = '#17333b'; ctx.font = 'bold 12px monospace'; ctx.fillText('PATCHWORK VALE', 123, 23);
  ctx.font = '9px monospace'; ctx.fillText('Tiny Trails • All open', 123, 37);
  ctx.strokeStyle = '#788c63'; ctx.lineWidth = 2;
  for (let i = 1; i < MAP_POINTS.length; i++) {
    const [ax, ay] = MAP_POINTS[i - 1]; const [bx, by] = MAP_POINTS[i];
    const distance = Math.hypot(bx - ax, by - ay);
    ctx.fillStyle = '#788c63';
    for (let d = 0; d < distance; d += 7) ctx.fillRect(ax + (bx - ax) * d / distance, ay + (by - ay) * d / distance, 2, 2);
  }
  levels.forEach((level, index) => {
    const [x, y] = MAP_POINTS[index];
    // The opening's bunting marks the Vale's pictured gathering places.
    ctx.fillStyle = '#526f55'; ctx.fillRect(x - 14, y - 38, 28, 1);
    ['#dd534b', '#ffda75', '#408fc4'].forEach((color, flag) => {
      ctx.fillStyle = color;
      for (let row = 0; row < 4; row++) ctx.fillRect(x - 13 + flag * 10 + Math.floor(row / 2), y - 37 + row, 5 - row, 1);
    });
    if (landmarks) {
      const w = landmarks.naturalWidth / 3, h = landmarks.naturalHeight / 2;
      ctx.drawImage(landmarks, index % 3 * w, Math.floor(index / 3) * h, w, h, x - 34, y - 29, 68, 58);
    } else { ctx.fillStyle = level.theme.edge; ctx.fillRect(x - 28, y - 22, 56, 44); }
    if (index === selected) {
      ctx.strokeStyle = '#17333b'; ctx.lineWidth = 4; ctx.strokeRect(x - 35, y - 30, 70, 60);
      ctx.strokeStyle = '#ffda75'; ctx.lineWidth = 2; ctx.strokeRect(x - 35, y - 30, 70, 60);
    }
    if (results.has(level.id)) {
      ctx.fillStyle = '#17333b'; ctx.fillRect(x + 19, y - 29, 15, 14);
      ctx.fillStyle = '#ffda75'; ctx.font = 'bold 11px monospace'; ctx.fillText('✓', x + 21, y - 18);
    }
  });
  const { panel, preview: previewBounds, results: row, play } = OVERWORLD_LAYOUT;
  ctx.fillStyle = '#17333b'; ctx.fillRect(panel.x, panel.y, panel.width, panel.height);
  ctx.fillStyle = '#ffda75'; ctx.textAlign = 'center'; ctx.font = 'bold 10px monospace';
  const words = levels[selected].name.split(' ');
  ctx.fillText(words.slice(0, -1).join(' ') || words[0], 350, 63);
  if (words.length > 1) ctx.fillText(words.at(-1)!, 350, 76);
  if (preview) {
    const smoothing = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(preview, previewBounds.x, previewBounds.y, previewBounds.width, previewBounds.height);
    ctx.imageSmoothingEnabled = smoothing;
  }
  ctx.font = '9px monospace'; ctx.fillStyle = '#e9f2df';
  const level = levels[selected];
  const result = results.get(level.id);
  if (result) {
    const gems = level.entities.filter(entity => entity.kind === 'gem').length;
    const stars = level.entities.filter(entity => entity.kind === 'special').length;
    drawRewardResult(ctx, 'gem', `${result.gems}/${gems}`, stars ? row.gemCenter : row.center, row.baseline, level.atlas);
    if (stars) drawRewardResult(ctx, 'star', `${result.stars}/${stars}`, row.starCenter, row.baseline, level.atlas);
  } else ctx.fillText(['Hills to a friend', 'Along quarry paths', 'Through tall trees', 'Past the busy yard', 'Over snowy hills', 'Down to the seaside'][selected], 350, 175);
  ctx.fillStyle = '#ffda75'; ctx.fillRect(play.x, play.y, play.width, play.height);
  ctx.fillStyle = '#17333b'; ctx.font = 'bold 12px monospace'; ctx.fillText('PLAY', 350, 198);
  ctx.restore();
}
