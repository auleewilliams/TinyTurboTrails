import type { MenuTarget } from './overworld';

export const STORY_CAPTIONS = ['The Vale Get-Together!', 'The Great Rumble broke the way.', 'Henry Turbo: find our friend!', 'Over the hill. Together again!'] as const;
export const STORY_DESCRIPTIONS = [
  'Henry and his neighbour prepare a picnic beneath bright bunting.',
  'Rain has broken the bridge. Henry and his neighbour wave from opposite banks. A trail leads over the hill.',
  'Henry walks along the hill trail toward his neighbour at the bunting arch.',
  'Henry has reached his neighbour. They high-five beside the picnic and bunting arch.',
] as const;

/** Memory-only, player-paced picture book. No simulation or quest state. */
export class StoryBook {
  page = 0;
  active = true;
  selected = 1;
  returnToFinish = false;
  open(payoff = false): void { this.page = payoff ? 3 : 0; this.selected = 1; this.returnToFinish = payoff; this.active = true; }
  close(): void { this.active = false; }
  advance(): void { if (this.page >= 2) this.close(); else this.page++; }
  get targets(): MenuTarget[] {
    return [
      { label: 'Previous picture', x: 102, y: 199, width: 62, height: 29, action: () => { this.page = Math.max(this.returnToFinish ? 3 : 0, this.page - 1); } },
      { label: this.page >= 2 ? 'Continue to trails' : 'Next picture', x: 182, y: 199, width: 62, height: 29, action: () => this.advance() },
      { label: 'Skip story', x: 262, y: 199, width: 62, height: 29, action: () => this.close() },
    ].map((target, index) => ({ ...target, label: this.returnToFinish && index === 1 ? 'Return to results' : target.label,
      selected: index === this.selected, focus: () => { this.selected = index; } }));
  }
}

export function drawStoryPicture(ctx: CanvasRenderingContext2D, sheet: HTMLImageElement, page: number,
  x: number, y: number, width: number, height: number): void {
  const w = sheet.naturalWidth / 2, h = sheet.naturalHeight / 2;
  ctx.drawImage(sheet, page % 2 * w, Math.floor(page / 2) * h, w, h, x, y, width, height);
}

export function drawStory(ctx: CanvasRenderingContext2D, sheet: HTMLImageElement, story: StoryBook, controller = false): void {
  ctx.fillStyle = '#132d36'; ctx.fillRect(0, 0, 426, 240);
  drawStoryPicture(ctx, sheet, story.page, 93, 19, 240, 160);
  ctx.textAlign = 'center'; ctx.fillStyle = '#ffda75'; ctx.font = '11px monospace';
  ctx.fillText(STORY_CAPTIONS[story.page], 213, 192);
  for (const [index, target] of story.targets.entries()) {
    ctx.fillStyle = index === story.selected ? '#ffda75' : '#34515a';
    ctx.fillRect(target.x, target.y, target.width, target.height);
    ctx.fillStyle = index === story.selected ? '#132d36' : '#e9f2df';
    ctx.font = 'bold 23px monospace'; ctx.fillText(['◀', '▶', '▶|'][index], target.x + target.width / 2, target.y + 22);
  }
  ctx.textAlign = 'left'; ctx.fillStyle = '#bfd5ce'; ctx.font = '9px monospace';
  ctx.fillText(controller ? 'D-pad + Face' : '← → + Space', 8, 12);
  for (let i = 0; i < 3; i++) ctx.fillRect(202 + i * 10, 8, i === story.page ? 7 : 3, 3);
  ctx.textAlign = 'left';
}
