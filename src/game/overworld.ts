import type { LevelData } from '../world/level';

export interface MenuTarget { label: string; description?: string; x: number; y: number; width: number; height: number; selected?: boolean; action: () => void }
export const MAP_POINTS = [[48, 88], [140, 88], [232, 88], [232, 176], [140, 176], [48, 176]] as const;

/** Cosmetic page-session data. Never passed to simulation or serialized. */
export class TrailSession {
  readonly completed = new Set<string>();
  returnedSeconds = 0;
  mark(level: LevelData): void { this.completed.add(level.id); }
}

export function drawOverworld(ctx: CanvasRenderingContext2D, levels: readonly LevelData[], selected: number,
  completed: ReadonlySet<string>, title: HTMLImageElement, landmarks?: HTMLImageElement,
  preview?: HTMLCanvasElement, background?: HTMLImageElement): void {
  ctx.save();
  ctx.fillStyle = '#dde5c1'; ctx.fillRect(0, 0, 426, 240);
  if (background) ctx.drawImage(background, 0, 0, 426, 240);
  // Keep the approved artwork intact and proportional, with a separate map heading.
  ctx.drawImage(title, 8, 0, 94, 94 * title.naturalHeight / title.naturalWidth);
  ctx.fillStyle = '#17333b'; ctx.font = 'bold 12px monospace'; ctx.fillText('CHOOSE A TRAIL', 123, 23);
  ctx.font = '9px monospace'; ctx.fillText('Every trail is open', 123, 37);
  ctx.strokeStyle = '#788c63'; ctx.lineWidth = 2;
  for (let i = 1; i < MAP_POINTS.length; i++) {
    const [ax, ay] = MAP_POINTS[i - 1]; const [bx, by] = MAP_POINTS[i];
    const distance = Math.hypot(bx - ax, by - ay);
    ctx.fillStyle = '#788c63';
    for (let d = 0; d < distance; d += 7) ctx.fillRect(ax + (bx - ax) * d / distance, ay + (by - ay) * d / distance, 2, 2);
  }
  levels.forEach((level, index) => {
    const [x, y] = MAP_POINTS[index];
    if (landmarks) {
      const w = landmarks.naturalWidth / 3, h = landmarks.naturalHeight / 2;
      ctx.drawImage(landmarks, index % 3 * w, Math.floor(index / 3) * h, w, h, x - 34, y - 29, 68, 58);
    } else { ctx.fillStyle = level.theme.edge; ctx.fillRect(x - 28, y - 22, 56, 44); }
    if (index === selected) {
      ctx.strokeStyle = '#17333b'; ctx.lineWidth = 4; ctx.strokeRect(x - 35, y - 30, 70, 60);
      ctx.strokeStyle = '#ffda75'; ctx.lineWidth = 2; ctx.strokeRect(x - 35, y - 30, 70, 60);
    }
    if (completed.has(level.id)) {
      ctx.fillStyle = '#17333b'; ctx.fillRect(x + 19, y - 29, 15, 14);
      ctx.fillStyle = '#ffda75'; ctx.font = 'bold 11px monospace'; ctx.fillText('✓', x + 21, y - 18);
    }
  });
  ctx.fillStyle = '#17333b'; ctx.fillRect(281, 47, 139, 170);
  ctx.fillStyle = '#ffda75'; ctx.textAlign = 'center'; ctx.font = 'bold 10px monospace';
  const words = levels[selected].name.split(' ');
  ctx.fillText(words.slice(0, -1).join(' ') || words[0], 350, 63);
  if (words.length > 1) ctx.fillText(words.at(-1)!, 350, 76);
  if (preview) ctx.drawImage(preview, 287, 84, 126, 71);
  ctx.font = '9px monospace'; ctx.fillStyle = '#e9f2df';
  ctx.fillText(completed.has(levels[selected].id) ? 'Visited this session ✓' : 'Ready to explore', 350, 168);
  ctx.fillStyle = '#ffda75'; ctx.fillRect(298, 180, 104, 27);
  ctx.fillStyle = '#17333b'; ctx.font = 'bold 12px monospace'; ctx.fillText('PLAY', 350, 198);
  ctx.restore();
}
