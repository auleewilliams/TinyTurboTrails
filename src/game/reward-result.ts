import { drawGem, drawSpecial } from '../world/renderer';

export type RewardKind = 'gem' | 'star';

/** Conservative bounds include the pickup symbol, gap and monospace number pair. */
export function rewardResultRect(text: string, centerX: number, baseline: number, size = 12): { x: number; y: number; width: number; height: number } {
  const width = 18 + text.length * size * 0.6;
  return { x: centerX - width / 2, y: baseline - 16, width, height: 18 };
}

export function drawRewardResult(ctx: CanvasRenderingContext2D, kind: RewardKind, text: string,
  centerX: number, baseline: number, atlas: string, size = 12): void {
  const bounds = rewardResultRect(text, centerX, baseline, size);
  ctx.save();
  ctx.translate(bounds.x + 6, baseline - 7);
  ctx.scale(0.5, 0.5);
  if (kind === 'gem') drawGem(ctx, 0, 16, atlas);
  else drawSpecial(ctx, 0, 0);
  ctx.restore();
  ctx.save();
  ctx.fillStyle = kind === 'star' ? '#ffda75' : '#e9f2df';
  ctx.font = `bold ${size}px monospace`;
  ctx.textAlign = 'left';
  ctx.fillText(text, bounds.x + 18, baseline);
  ctx.restore();
}
